import { Request, Response } from 'express';
import db from '../config/db';

export const getBerandaPenjual = async (req: Request, res: Response) => {
  // Ambil Id dari parameter
  const { user_id } = req.params;

  try {
    // Querry mengambil semua data toko
    const [tokoRows]: any = await db.query(
      'SELECT * FROM toko WHERE user_id = ?',
      [user_id]
    );

    // Kalau toko tidak ada
    if (tokoRows.length === 0) {
      return res.status(404).json({ message: 'Toko tidak ditemukan' });
    }

    const toko = tokoRows[0];
    const shopId = toko.shop_id;

    // Hitung pemasukan
    const [incomeRows]: any = await db.query(
      `
            SELECT SUM(total_harga) as total_pemasukan 
            FROM orders o
            JOIN order_items oi ON o.order_id = oi.order_id
            JOIN menu m ON oi.product_id = m.product_id
            WHERE m.shop_id = ? AND o.status_pembayaran = 'settlement'
        `,
      [shopId]
    );

    // Hitung Jumlah Pesanan Selesai
    const [doneRows]: any = await db.query(
      `
            SELECT COUNT(DISTINCT o.order_id) as total_selesai
            FROM orders o
            JOIN order_items oi ON o.order_id = oi.order_id
            JOIN menu m ON oi.product_id = m.product_id
            WHERE m.shop_id = ? AND o.is_finished = 1
        `,
      [shopId]
    );

    // Ambil Pesanan Aktif (Belum Selesai)
    const [orderRows]: any = await db.query(
      `
            SELECT DISTINCT 
                o.order_id, 
                u.nama_lengkap AS nama_pembeli, 
                o.total_harga, 
                o.status_pembayaran,
                o.created_at,
                o.is_finished
            FROM orders o
            JOIN users u ON o.user_id = u.id
            JOIN order_items oi ON o.order_id = oi.order_id
            JOIN menu m ON oi.product_id = m.product_id
            WHERE m.shop_id = ? 
            AND o.status_pembayaran = 'settlement' 
            AND o.is_finished = 0
            ORDER BY o.created_at DESC
        `,
      [shopId]
    );

    res.status(200).json({
      toko: toko,
      total_pemasukan: incomeRows[0].total_pemasukan || 0,
      total_selesai: doneRows[0].total_selesai || 0,
      pesanan_aktif: orderRows,
    });
  } catch (error: any) {
    console.error('Error Penjual Dashboard:', error.message);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

export const getPesananAktif = async (req: Request, res: Response) => {
  const { user_id } = req.params;

  try {
    const [toko]: any = await db.query(
      'SELECT shop_id FROM toko WHERE user_id = ?',
      [user_id]
    );
    if (toko.length === 0)
      return res.status(404).json({ message: 'Toko tidak ditemukan' });
    const shopId = toko[0].shop_id;

    // Ditambahkan GROUP_CONCAT untuk oi.note agar sinkron ke frontend
    const [orders]: any = await db.query(
      `
            SELECT 
                o.order_id, 
                u.nama_lengkap AS nama_pembeli, 
                o.total_harga, 
                o.created_at,
                GROUP_CONCAT(CONCAT(oi.qty, 'x ', m.product_name) SEPARATOR '\n') AS rincian_menu,
                GROUP_CONCAT(NULLIF(oi.note, '') SEPARATOR ', ') AS catatan_pesanan
            FROM orders o
            JOIN users u ON o.user_id = u.id
            JOIN order_items oi ON o.order_id = oi.order_id
            JOIN menu m ON oi.product_id = m.product_id
            WHERE m.shop_id = ? 
            AND o.status_pembayaran = 'settlement' 
            AND o.is_finished = 0
            GROUP BY o.order_id
            ORDER BY o.created_at DESC
        `,
      [shopId]
    );

    res.status(200).json(orders);
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  // Ambil order id
  const { order_id } = req.params;

  try {
    const [rows]: any = await db.query(
      `
            SELECT 
                o.order_id, 
                u.nama_lengkap AS nama_pembeli, 
                o.total_harga, 
                o.is_finished,
                GROUP_CONCAT(oi.note SEPARATOR ', ') as note,
                GROUP_CONCAT(CONCAT(oi.qty, 'x ', m.product_name) SEPARATOR '\n') AS rincian_menu
            FROM orders o
            JOIN users u ON o.user_id = u.id
            JOIN order_items oi ON o.order_id = oi.order_id
            JOIN menu m ON oi.product_id = m.product_id
            WHERE o.order_id = ?
            GROUP BY o.order_id
        `,
      [order_id]
    );

    // Kalau pesanan tidak ditemukan
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
    }

    res.status(200).json(rows[0]);
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Update status pemesanan
export const updateStatusSelesai = async (req: Request, res: Response) => {
  // Ambil order id
  const { order_id } = req.body;

  try {
    const [result]: any = await db.query(
      'UPDATE orders SET is_finished = 1 WHERE order_id = ?',
      [order_id]
    );

    // Kalau gagal
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: 'Gagal memperbarui: Order ID tidak ditemukan' });
    }

    res.status(200).json({ message: 'Pesanan berhasil diselesaikan' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

export const getRiwayatPenjualan = async (req: Request, res: Response) => {
  // Mengambil user id
  const { user_id } = req.params;

  try {
    // Cari shop id dulu
    const [toko]: any = await db.query(
      'SELECT shop_id FROM toko WHERE user_id = ?',
      [user_id]
    );
    if (toko.length === 0)
      return res.status(404).json({ message: 'Toko tidak ditemukan' });
    const shopId = toko[0].shop_id;

    // Ambil pesanan
    // Ambil pesanan yang SUDAH SELESAI (is_finished = 1)
    const [rows]: any = await db.query(
      `
            SELECT DISTINCT 
                o.order_id, 
                u.nama_lengkap AS nama_pembeli, 
                o.total_harga, 
                o.pickup_time,
                o.payment_method
            FROM orders o
            JOIN users u ON o.user_id = u.id
            JOIN order_items oi ON o.order_id = oi.order_id
            JOIN menu m ON oi.product_id = m.product_id
            WHERE m.shop_id = ? AND o.is_finished = 1
            ORDER BY o.created_at DESC
        `,
      [shopId]
    );

    res.status(200).json(rows);
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

export const updateProfilePenjual = async (req: Request, res: Response) => {
  // Tangkap request body
  const { id, nama_lengkap, email, nomor_telepon, shop_name } = req.body;

  try {
    // Update table user
    const queryUser =
      'UPDATE users SET nama_lengkap = ?, email = ?, nomor_telepon = ? WHERE id = ?';
    await db.execute(queryUser, [nama_lengkap, email, nomor_telepon, id]);

    // Update table toko
    const queryToko = 'UPDATE toko SET shop_name = ? WHERE user_id = ?';
    await db.execute(queryToko, [shop_name, id]);

    res.status(200).json({ message: 'Update Profil Berhasil' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
