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