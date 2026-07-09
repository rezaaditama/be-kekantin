import { Request, Response } from 'express';
import db from '../config/db';

export const getMenuByShopController = async (req: Request, res: Response) => {
    // Menangkap Id yang dikirimkan
    const { shop_id } = req.params;

    // Ubah id menjadi int
    const shopIdInt = parseInt(shop_id as string, 10);

    // Validasi id
    if (isNaN(shopIdInt)) {
        return res.status(400).json({ message: "ID Toko harus angka" });
    }

    try {
        // Querry => ? mencegah querry injection
        const [rows] = await db.query('SELECT * FROM menu WHERE shop_id = ?', [shop_id]);
        
        res.status(200).json(rows);
    } catch (error: any) {
        console.error("Database Error (Menu):", error.message);
        res.status(500).json({ 
            message: "Gagal mengambil data menu", 
            error: error.message 
        });
    }
};