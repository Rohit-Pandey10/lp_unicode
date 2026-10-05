import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { login, profile, refreshToken, register } from '../controllers/authController.js';

const router = express.Router();
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.get('/profile', authMiddleware, profile);
export default router;
