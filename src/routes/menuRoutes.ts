import { Router } from 'express';
import { getMenuByShopController } from '../controllers/menuController';

const router = Router();

// dynamic routing
router.get('/:shop_id', getMenuByShopController);

export default router;