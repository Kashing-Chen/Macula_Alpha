import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { listStories } from '../controllers/stories.controller.js';

const router = Router();

router.get('/', asyncHandler(listStories));

export default router;
