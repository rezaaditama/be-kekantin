import { Request, Response } from 'express';
import db from '../config/db';
import midtransClient from 'midtrans-client';

const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.SERVERKEY || '',
  clientKey: process.env.CLIENTKEY || '',
});

export const createOrder = async (req: Request, res: Response) => {
  // Tangkap request body
  const { order_id, user_id, pickup_time, total_harga, payment_method, items } =
    req.body;

  // Mulai koneksi transaksi
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Kalau tunai
    const method = payment_method ? payment_method.toLowerCase() : '';
    const initialStatus = method === 'tunai' ? 'settlement' : 'pending';

    // Masukkan ke tabel orders
    await connection.query(
      'INSERT INTO orders (order_id, user_id, pickup_time, total_harga, payment_method, status_pembayaran) VALUES (?, ?, ?, ?, ?, ?)',
      [
        order_id,
        user_id,
        pickup_time,
        total_harga,
        payment_method,
        initialStatus,
      ]
    );

    // Pecah dan masukkan ke tabel order_items
    for (const item of items) {
      await connection.query(
        'INSERT INTO order_items (order_id, product_id, qty, note, subtotal) VALUES (?, ?, ?, ?, ?)',
        [order_id, item.product_id, item.qty, item.note, item.subtotal]
      );
    }

    let responseData: any = {
      message: 'Order berhasil disimpan!',
      payment_method: payment_method,
    };

    if (payment_method.toLowerCase() === 'qris') {
      const parameter = {
        transaction_details: {
          order_id: order_id,
          gross_amount: total_harga,
        },
        usage_limit: 1,
      };
      const transaction = await snap.createTransaction(parameter);
      responseData.snap_token = transaction.token;
      responseData.redirect_url = transaction.redirect_url;
    } else {
      // Jika Tunai, tidak perlu redirect_url
      responseData.redirect_url = null;
    }

    await connection.commit();
    res.status(201).json(responseData);
  } catch (error: any) {
    await connection.rollback();
    console.error('Error Order:', error.message);
    res
      .status(500)
      .json({ message: 'Gagal membuat order', error: error.message });
  } finally {
    connection.release();
  }
};

// Ambil riwayat pesanan berdasarkan id user
export const getOrderByUserIdController = async (
  req: Request,
  res: Response
) => {
  // Tangkap user id
  const { user_id } = req.params;

  try {
    // PERBAIKAN 1: Menambahkan m.shop_id ke dalam SELECT query
    const [rows] = await db.query(
      `SELECT 
                o.*, 
                oi.product_id, 
                m.product_name, 
                m.product_price, 
                oi.note, 
                oi.qty, 
                oi.subtotal, 
                m.product_path, 
                m.shop_id, 
                t.shop_name 
             FROM orders o 
             LEFT JOIN order_items oi ON o.order_id = oi.order_id 
             LEFT JOIN menu m ON oi.product_id = m.product_id 
             LEFT JOIN toko t ON m.shop_id = t.shop_id 
             WHERE o.user_id = ? 
             ORDER BY o.created_at DESC`,
      [user_id]
    );

    // Menjadi nested json
    const ordersMap = new Map();

    (rows as any[]).forEach((row: any) => {
      if (!ordersMap.has(row.order_id)) {
        ordersMap.set(row.order_id, {
          order_id: row.order_id,
          user_id: row.user_id,
          pickup_time: row.pickup_time,
          total_harga: row.total_harga,
          payment_method: row.payment_method,
          status_pembayaran: row.status_pembayaran,
          is_finished: row.is_finished === 1, // Konversi tinyint ke boolean
          shop_id: row.shop_id, // Ditambahkan di level parent (opsional aman)
          items: [], // Tempat menampung List<Menu>
        });
      }

      // Jika ada item menu, masukkan ke dalam array items
      if (row.product_id) {
        ordersMap.get(row.order_id).items.push({
          product_id: row.product_id,
          product_name: row.product_name,
          product_price: row.product_price,
          product_path: row.product_path,
          qty: row.qty,
          note: row.note,
          shop_id: row.shop_id, // PERBAIKAN 2: Masukkan shop_id ke tiap item produk
          shop_name: row.shop_name,
        });
      }
    });

    const result = Array.from(ordersMap.values());
    res.status(200).json(result);
  } catch (error: any) {
    console.error('❌ Database Error (Get Order):', error.message);
    res
      .status(500)
      .json({ message: 'Gagal mengambil riwayat', error: error.message });
  }
};

// Handle midtrans
export const handleMidtransNotification = async (
  req: Request,
  res: Response
) => {
  // Ambil data dari midtrans
  const data = req.body;

  try {
    // Verifikasi key
    const orderId = data.order_id;
    const transactionStatus = data.transaction_status;
    const fraudStatus = data.fraud_status;

    // Status awal
    let statusFinal = 'pending';

    if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
      if (fraudStatus === 'accept') statusFinal = 'settlement';
    } else if (
      transactionStatus === 'cancel' ||
      transactionStatus === 'deny' ||
      transactionStatus === 'expire'
    ) {
      statusFinal = 'cancel';
    } else if (transactionStatus === 'pending') {
      statusFinal = 'pending';
    }

    // Update database berdasarkan status dari midtrans
    await db.query(
      'UPDATE orders SET status_pembayaran = ? WHERE order_id = ?',
      [statusFinal, orderId]
    );

    res.status(200).json({ message: 'Notification handled' });
  } catch (error: any) {
    console.error('Webhook Error: ', error.message);
    res.status(500).send('error');
  }
};
