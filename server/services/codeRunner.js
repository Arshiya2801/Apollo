import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);
const JUDGE0_API = 'https://ce.judge0.com';

const JUDGE0_LANGUAGE_MAP = {
  java: 62,
  cpp: 54
};

/**
 * Executes code locally to bypass highly restrictive/rate-limited public APIs.
 * Supports JavaScript (node) and Python.
 */
export async function executeCode(code, language) {
  const isWindows = os.platform() === 'win32';

  if (language === 'javascript') {
    const tempFile = path.join(os.tmpdir(), `test_${Date.now()}_${Math.floor(Math.random() * 1000)}.js`);
    await fs.writeFile(tempFile, code);
    try {
      const { stdout, stderr } = await execAsync(`node "${tempFile}"`, { timeout: 5000 });
      return { stdout: stdout || '', stderr: stderr || '', exitCode: 0 };
    } catch (err) {
      return { stdout: err.stdout || '', stderr: err.stderr || err.message, exitCode: err.code || 1 };
    } finally {
      await fs.unlink(tempFile).catch(() => null);
    }
  } else if (language === 'python') {
    const tempFile = path.join(os.tmpdir(), `test_${Date.now()}_${Math.floor(Math.random() * 1000)}.py`);
    await fs.writeFile(tempFile, code);
    try {
      const pythonCmd = isWindows ? 'python' : 'python3';
      const { stdout, stderr } = await execAsync(`${pythonCmd} "${tempFile}"`, { timeout: 5000 });
      return { stdout: stdout || '', stderr: stderr || '', exitCode: 0 };
    } catch (err) {
      return { stdout: err.stdout || '', stderr: err.stderr || err.message, exitCode: err.code || 1 };
    } finally {
      await fs.unlink(tempFile).catch(() => null);
    }
  }

  // Fallback to Judge0 API for compiled languages (C++, Java) avoiding local toolchain dependencies
  const runtimeId = JUDGE0_LANGUAGE_MAP[language];
  if (!runtimeId) {
    throw new Error(`Execution runner currently not configured for: ${language}.`);
  }

  const submitRes = await fetch(`${JUDGE0_API}/submissions?base64_encoded=false&wait=false`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source_code: code,
      language_id: runtimeId,
    }),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`Judge0 submit error: ${submitRes.status} — ${errText}`);
  }

  const { token } = await submitRes.json();
  if (!token) {
    throw new Error('No token returned from Judge0 - the service may be ratelimiting requests.');
  }

  // Poll for result (max ~15 seconds)
  let result = null;
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1000));

    const pollRes = await fetch(
      `${JUDGE0_API}/submissions/${token}?base64_encoded=false&fields=stdout,stderr,status,exit_code,compile_output`
    );

    if (!pollRes.ok) {
      throw new Error(`Judge0 poll error: ${pollRes.status}`);
    }

    result = await pollRes.json();
    if (result.status?.id >= 3) {
      break;
    }
  }

  if (!result || result.status?.id < 3) {
    throw new Error('Code execution timed out');
  }

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || result.compile_output || '',
    exitCode: result.exit_code ?? -1,
  };
}
