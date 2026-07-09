import { Router } from 'express';
import { loginController, registerController, updateProfileController } from '../controllers/authController';

const router = Router();

router.post('/login', loginController);
router.post('/register', registerController);
router.post('/update-user', updateProfileController);

export default router;