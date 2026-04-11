import { Router } from 'express';
import { getAllToko } from '../controllers/tokoController';

const router = Router();

// Endpoint: GET /api/toko
router.get('/', getAllToko);

export default router;