import { Router } from 'express';
import { runCode } from '../controllers/codeController.js';

const router = Router();

// POST /api/code/run — Execute code via Piston
router.post('/run', runCode);

export default router;
