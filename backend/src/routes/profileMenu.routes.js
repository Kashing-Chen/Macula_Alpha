import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { listProfileMenu } from '../controllers/profileMenu.controller.js';

const router = Router();

router.get('/', asyncHandler(listProfileMenu));

export default router;
