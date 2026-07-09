import { Router } from 'express';
import { createOrder, getOrderByUserIdController, handleMidtransNotification } from '../controllers/orderController';

const router = Router();
router.post('/', createOrder);
router.get('/user/:user_id', getOrderByUserIdController);
router.post('/notification', handleMidtransNotification);

export default router;