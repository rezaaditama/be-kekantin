import { Request, Response } from 'express';
import db from '../config/db';

export const getOrCreateRoomController = async (
  req: Request,
  res: Response
) => {
  const { user_id, shop_id } = req.body;

  // Validasi parameter input
  if (!user_id || !shop_id) {
    return res
      .status(400)
      .json({ message: 'Parameter user_id dan shop_id wajib diisi' });
  }

  try {
    // Pastikan casting ke Number agar aman saat bind parameter database
    const targetUserId = Number(user_id);
    const targetShopId = Number(shop_id);

    // Cek apakah room sudah ada sebelumnya
    const checkQuery =
      'SELECT room_id FROM chat_rooms WHERE user_id = ? AND shop_id = ?';
    const [existingRows]: any = await db.query(checkQuery, [
      targetUserId,
      targetShopId,
    ]);

    if (existingRows && existingRows.length > 0) {
      return res.status(200).json({
        room_id: existingRows[0].room_id,
        message: 'Room ditemukan',
      });
    }

    // Jika belum ada, buat room baru
    const insertQuery =
      'INSERT INTO chat_rooms (user_id, shop_id) VALUES (?, ?)';
    const [insertResult]: any = await db.query(insertQuery, [
      targetUserId,
      targetShopId,
    ]);

    return res.status(201).json({
      room_id: insertResult.insertId,
      message: 'Room baru berhasil dibuat',
    });
  } catch (error: any) {
    console.error('❌ Error di getOrCreateRoomController:', error.message);
    return res
      .status(500)
      .json({ message: 'Internal Server Error', error: error.message });
  }
};

// 2. Mendapatkan Daftar Chat / Inbox Pembeli (Untuk List Chat Toko)
export const getUserChatListController = async (
  req: Request,
  res: Response
) => {
  const { user_id } = req.params;
  try {
    const query = `
            SELECT 
                cr.room_id, cr.shop_id, t.shop_name, t.shop_src,
                m.message AS lastMessage, m.created_at AS time, m.sender_id,
                (SELECT COUNT(*) FROM messages WHERE room_id = cr.room_id AND is_read = 0 AND sender_id != ?) AS unreadCount
            FROM chat_rooms cr
            JOIN toko t ON cr.shop_id = t.shop_id
            LEFT JOIN messages m ON m.message_id = (
                SELECT message_id FROM messages WHERE room_id = cr.room_id ORDER BY created_at DESC LIMIT 1
            )
            WHERE cr.user_id = ?
            ORDER BY COALESCE(m.created_at, cr.created_at) DESC
        `;
    const [rows]: any = await db.query(query, [user_id, user_id]);
    return res.status(200).json(rows);
  } catch (error: any) {
    console.error('❌ Error di getUserChatListController:', error.message);
    return res.status(500).json({ message: error.message });
  }
};

// 3. Mengirim Pesan Baru
export const sendMessageController = async (req: Request, res: Response) => {
  const { room_id, sender_id, message } = req.body;
  try {
    const query =
      'INSERT INTO messages (room_id, sender_id, message) VALUES (?, ?, ?)';
    const [result]: any = await db.query(query, [room_id, sender_id, message]);
    return res
      .status(201)
      .json({ message_id: result.insertId, message: 'Pesan terkirim' });
  } catch (error: any) {
    console.error('❌ Error di sendMessageController:', error.message);
    return res.status(500).json({ message: error.message });
  }
};

export const getChatMessagesController = async (
  req: Request,
  res: Response
) => {
  const { room_id } = req.params;
  try {
    // 1. Ambil informasi detail toko yang terikat dengan room ini
    const roomQuery = `
      SELECT cr.room_id, cr.shop_id, t.shop_name 
      FROM chat_rooms cr
      JOIN toko t ON cr.shop_id = t.shop_id
      WHERE cr.room_id = ?
    `;
    const [roomRows]: any = await db.query(roomQuery, [room_id]);

    if (!roomRows || roomRows.length === 0) {
      return res.status(404).json({ message: 'Room chat tidak ditemukan' });
    }

    // 2. Ambil semua baris pesan seperti biasa
    const messagesQuery = `
      SELECT message_id, sender_id, message, is_read, created_at 
      FROM messages 
      WHERE room_id = ? 
      ORDER BY created_at ASC
    `;
    const [messageRows]: any = await db.query(messagesQuery, [room_id]);

    // 3. Gabungkan datanya ke dalam satu response objek
    return res.status(200).json({
      shop_name: roomRows[0].shop_name,
      shop_id: roomRows[0].shop_id,
      messages: messageRows,
    });
  } catch (error: any) {
    console.error('❌ Error di getChatMessagesController:', error.message);
    return res.status(500).json({ message: error.message });
  }
};

// 5. Menandai Semua Pesan di Room Telah Dibaca (Saat room dibuka oleh lawan bicara)
export const readAllMessagesController = async (
  req: Request,
  res: Response
) => {
  const { room_id, viewer_id } = req.body;
  try {
    const query =
      'UPDATE messages SET is_read = 1 WHERE room_id = ? AND sender_id != ?';
    await db.query(query, [room_id, viewer_id]);
    return res.status(200).json({ message: 'Pesan telah dibaca' });
  } catch (error: any) {
    console.error('❌ Error di readAllMessagesController:', error.message);
    return res.status(500).json({ message: error.message });
  }
};
