import { Router } from 'express';
import userRoutes from './user.routes.js';
import storiesRoutes from './stories.routes.js';
import profileMenuRoutes from './profileMenu.routes.js';
import conversationsRoutes from './conversations.routes.js';

const router = Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));

router.use('/user', userRoutes);
router.use('/stories', storiesRoutes);
router.use('/profile-menu', profileMenuRoutes);
router.use('/conversations', conversationsRoutes);

export default router;
