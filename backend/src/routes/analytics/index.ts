import { Router } from 'express';
import postsRouter from './posts.js';
import byCategoryRouter from './byCategory.js';
import byTimeslotRouter from './byTimeslot.js';
import summaryRouter from './summary.js';

const router = Router();

router.use(postsRouter);
router.use(byCategoryRouter);
router.use(byTimeslotRouter);
router.use(summaryRouter);

export default router;
