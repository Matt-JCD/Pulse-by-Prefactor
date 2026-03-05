import { Router } from 'express';
import episodesRouter from './episodes.js';
import assetsRouter from './assets.js';

const router = Router();

// Episode CRUD + /latest helper
router.use(episodesRouter);

// Asset CRUD + file upload
router.use(assetsRouter);

export default router;
