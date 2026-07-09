import { Router } from 'express';
import { getAllToko, getTokoById } from '../controllers/tokoController';

const router = Router();

// Endpoint: GET /api/toko
router.get('/', getAllToko);
router.get('/:id', getTokoById);

export default router;