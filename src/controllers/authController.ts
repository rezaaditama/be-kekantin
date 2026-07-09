import { Request, Response } from 'express';
import db from '../config/db';

// Register
export const registerController = async (req: Request, res: Response) => {
    const { nama_lengkap, email, password, nomor_telepon, role } = req.body;
    try {
        const query = "INSERT INTO users (nama_lengkap, email, password, nomor_telepon, role) VALUES (?, ?, ?, ?, ?)";
        await db.execute(query, [nama_lengkap, email, password, nomor_telepon, role]);
        res.status(201).json({ message: "Registrasi Berhasil" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Untuk login
export const loginController = async (req: Request, res: Response) => {
    const { email, password, role } = req.body;
    try {
        const query = "SELECT id, nama_lengkap, email, nomor_telepon FROM users WHERE email = ? AND password = ? AND role = ?";
        const [rows]: any = await db.execute(query, [email, password, role]);

        if (rows.length > 0) {
            res.status(200).json({
                message: "Login Berhasil",
                user_id: rows[0].id,
                nama: rows[0].nama_lengkap,
                email: rows[0].email,
                nomor_telepon: rows[0].nomor_telepon
            });
        } else {
            res.status(401).json({ message: "Email atau Password salah" });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateProfileController = async (req: Request, res: Response) => {
    const { id, nama_lengkap, email, nomor_telepon } = req.body;
    try {
        const query = "UPDATE users SET nama_lengkap = ?, email = ?, nomor_telepon = ? WHERE id = ?";
        await db.execute(query, [nama_lengkap, email, nomor_telepon, id]);
        res.status(200).json({ message: "Update Profil Berhasil" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};