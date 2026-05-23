import { executeCode } from '../services/codeRunner.js';

/**
 * POST /api/code/run
 * Executes user code via Piston and returns stdout/stderr.
 */
export async function runCode(req, res) {
  const { code, language } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  try {
    const result = await executeCode(code, language);
    res.json(result);
  } catch (error) {
    console.error('Error in runCode:', error);
    res.status(500).json({ error: 'Code execution failed', details: error.message });
  }
}
