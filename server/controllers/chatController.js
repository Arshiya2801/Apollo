import { streamExplanation, streamComplexity, generateTestsAsJson, streamRoastCode, streamCodeReview, streamByMode, streamChatByMode } from '../services/aiService.js';

/**
 * POST /api/ai/chat
 * Generic streaming AI endpoint — accepts a `mode` key to select the AI persona.
 * If `history` is provided, uses multi-turn chat (Type 2). Otherwise single-shot (Type 1).
 */
export async function streamChat(req, res) {
  const { code, language, mode, history } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    // If history is provided, use multi-turn chat; otherwise single-shot analysis
    const stream = (history && history.length > 0)
      ? streamChatByMode(code, language, mode || 'explain', history)
      : streamByMode(code, language, mode || 'explain');

    for await (const text of stream) {
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Error in streamChat:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate response', details: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`);
      res.end();
    }
  }
}

/**
 * POST /api/ai/explain
 * Streams an AI-powered code explanation using SSE.
 */
export async function explainCode(req, res) {
  const { code, language } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  // Set up Server-Sent Events (SSE) for streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    for await (const text of streamExplanation(code, language)) {
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Error in explainCode:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate explanation', details: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`);
      res.end();
    }
  }
}

/**
 * POST /api/ai/complexity
 * Streams an AI-powered code complexity analysis using SSE.
 */
export async function analyzeComplexity(req, res) {
  const { code, language } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  // Set up Server-Sent Events (SSE) for streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    for await (const text of streamComplexity(code, language)) {
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Error in analyzeComplexity:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate complexity analysis', details: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`);
      res.end();
    }
  }
}

/**
 * POST /api/ai/generate-tests
 * Returns AI-generated unit tests as JSON.
 */
export async function generateTests(req, res) {
  const { code, language } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  try {
    const tests = await generateTestsAsJson(code, language);
    res.json(tests);
  } catch (error) {
    console.error('Error in generateTests:', error);
    res.status(500).json({ error: 'Failed to generate tests', details: error.message });
  }
}

/**
 * POST /api/ai/roast
 * Streams a hilarious AI-powered code roast using SSE.
 */
export async function roastCode(req, res) {
  const { code, language } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    for await (const text of streamRoastCode(code, language)) {
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Error in roastCode:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate roast', details: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`);
      res.end();
    }
  }
}

/**
 * POST /api/ai/review
 * Streams an AI-powered code review using SSE.
 */
export async function reviewCode(req, res) {
  const { code, language } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    for await (const text of streamCodeReview(code, language)) {
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Error in reviewCode:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate code review', details: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`);
      res.end();
    }
  }
}
