import express from 'express';
import { getBerandaPenjual, getPesananAktif, updateStatusSelesai, getOrderById, getRiwayatPenjualan, updateProfilePenjual } from '../controllers/penjualController';

const router = express.Router();

router.get('/penjual/dashboard/:user_id', getBerandaPenjual);
router.get('/penjual/pesanan-aktif/:user_id', getPesananAktif);
router.get('/penjual/order-detail/:order_id', getOrderById);
router.post('/penjual/selesaikan-pesanan', updateStatusSelesai);
router.get('/penjual/riwayat/:user_id', getRiwayatPenjualan);
router.post('/penjual/update-profile', updateProfilePenjual)

export default router;