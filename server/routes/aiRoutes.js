import { Router } from 'express';
import { explainCode, analyzeComplexity, generateTests, roastCode, reviewCode, streamChat } from '../controllers/chatController.js';

const router = Router();

// POST /api/ai/chat — Unified streaming AI endpoint (uses mode engine)
router.post('/chat', streamChat);

// POST /api/ai/explain — Stream AI code explanation
router.post('/explain', explainCode);

// POST /api/ai/complexity — Stream AI time & space complexity analysis
router.post('/complexity', analyzeComplexity);

// POST /api/ai/generate-tests — Stream AI generated tests
router.post('/generate-tests', generateTests);

// POST /api/ai/roast — Stream AI code roast
router.post('/roast', roastCode);

// POST /api/ai/review — Stream AI code review
router.post('/review', reviewCode);

export default router;
