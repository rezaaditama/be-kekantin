import { Request, Response } from 'express';
import db from '../config/db';

// 1. Membuat atau Mendapatkan Chat Room (Saat klik "Chat Penjual")
export const getOrCreateRoomController = async (req: Request, res: Response) => {
    const { user_id, shop_id } = req.body;
    try {
        // Cek apakah room sudah ada
        const checkQuery = "SELECT room_id FROM chat_rooms WHERE user_id = ? AND shop_id = ?";
        const [existing]: any = await db.execute(checkQuery, [user_id, shop_id]);

        if (existing.length > 0) {
            return res.status(200).json({ room_id: existing[0].room_id, message: "Room ditemukan" });
        }

        // Jika belum ada, buat room baru
        const insertQuery = "INSERT INTO chat_rooms (user_id, shop_id) VALUES (?, ?)";
        const [result]: any = await db.execute(insertQuery, [user_id, shop_id]);
        
        res.status(201).json({ room_id: result.insertId, message: "Room baru berhasil dibuat" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// 2. Mendapatkan Daftar Chat / Inbox Pembeli (Untuk List Chat Toko)
export const getUserChatListController = async (req: Request, res: Response) => {
    const { user_id } = req.params;
    try {
        // Query mengambil daftar toko yang dichat beserta pesan terakhir dan hitungan unread
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
        const [rows]: any = await db.execute(query, [user_id, user_id]);
        res.status(200).json(rows);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// 3. Mengirim Pesan Baru
export const sendMessageController = async (req: Request, res: Response) => {
    const { room_id, sender_id, message } = req.body;
    try {
        const query = "INSERT INTO messages (room_id, sender_id, message) VALUES (?, ?, ?)";
        const [result]: any = await db.execute(query, [room_id, sender_id, message]);
        res.status(201).json({ message_id: result.insertId, message: "Pesan terkirim" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// 4. Membuka Room & Mengambil Seluruh Isi Pesan di Dalamnya
export const getChatMessagesController = async (req: Request, res: Response) => {
    const { room_id } = req.params;
    try {
        const query = "SELECT message_id, sender_id, message, is_read, created_at FROM messages WHERE room_id = ? ORDER BY created_at ASC";
        const [rows]: any = await db.execute(query, [room_id]);
        res.status(200).json(rows);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// 5. Menandai Semua Pesan di Room Telah Dibaca (Saat room dibuka oleh lawan bicara)
export const readAllMessagesController = async (req: Request, res: Response) => {
    const { room_id, viewer_id } = req.body; // viewer_id adalah id user yang sedang membuka chat
    try {
        const query = "UPDATE messages SET is_read = 1 WHERE room_id = ? AND sender_id != ?";
        await db.execute(query, [room_id, viewer_id]);
        res.status(200).json({ message: "Pesan telah dibaca" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};