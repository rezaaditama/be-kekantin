import { Request, Response } from 'express';
import db from '../config/db';

export const getAllToko = async (req: Request, res: Response) => {
    try {
        const [rows] = await db.query('SELECT * FROM toko');
        res.status(200).json(rows);
    } catch (error: any) {
        console.error("Database Error:", error.message);
        res.status(500).json({ 
            message: "Gagal mengambil data toko", 
            error: error.message 
        });
    }
};

export const getTokoById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const [rows]: any = await db.query('SELECT * FROM toko WHERE shop_id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "Toko tidak ditemukan" });
        }
        res.status(200).json(rows[0]); 
    } catch (error: any) {
        res.status(500).json({ message: "Gagal mengambil detail toko", error: error.message });
    }
};