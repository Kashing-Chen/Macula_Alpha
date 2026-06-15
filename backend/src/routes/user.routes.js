import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getUser, updateUser } from '../controllers/user.controller.js';

const router = Router();

router.get('/', asyncHandler(getUser));
router.put('/', asyncHandler(updateUser));

export default router;
