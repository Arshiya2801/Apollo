// Use VITE_API_BASE if provided, otherwise fallback based on environment
export const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.MODE === 'production' 
  ? 'https://practium6.onrender.com' 
  : 'http://localhost:5000');

/**
 * Generic SSE streaming function — sends code + mode to the unified /api/ai/chat endpoint.
 * All mode-specific streaming goes through this single function.
 */
export async function streamAIChat({ code, language, mode, history, onChunk, onDone, onError }) {
  try {
    const response = await fetch(`${API_BASE}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, mode, history: history || [] }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch AI response');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;

      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();

            if (dataStr === '[DONE]') {
              done = true;
              break;
            }

            if (dataStr) {
              try {
                const dataObj = JSON.parse(dataStr);
                onChunk(dataObj.text);
              } catch {
                console.error('Error parsing stream chunk', dataStr);
              }
            }
          }
        }
      }
    }

    onDone?.();
  } catch (error) {
    console.error(error);
    onError?.(error);
  }
}

/**
 * Streams an AI code explanation via SSE.
 * Calls the provided `onChunk` callback with each text token.
 */
export async function streamExplainCode({ code, language, onChunk, onDone, onError }) {
  try {
    const response = await fetch(`${API_BASE}/api/ai/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch explanation');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;

      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();

            if (dataStr === '[DONE]') {
              done = true;
              break;
            }

            if (dataStr) {
              try {
                const dataObj = JSON.parse(dataStr);
                onChunk(dataObj.text);
              } catch {
                console.error('Error parsing stream chunk', dataStr);
              }
            }
          }
        }
      }
    }

    onDone?.();
  } catch (error) {
    console.error(error);
    onError?.(error);
  }
}

/**
 * Streams an AI complexity analysis via SSE.
 * Calls the provided `onChunk` callback with each text token.
 */
export async function streamAnalyzeComplexity({ code, language, onChunk, onDone, onError }) {
  try {
    const response = await fetch(`${API_BASE}/api/ai/complexity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch complexity analysis');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;

      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();

            if (dataStr === '[DONE]') {
              done = true;
              break;
            }

            if (dataStr) {
              try {
                const dataObj = JSON.parse(dataStr);
                onChunk(dataObj.text);
              } catch {
                console.error('Error parsing stream chunk', dataStr);
              }
            }
          }
        }
      }
    }

    onDone?.();
  } catch (error) {
    console.error(error);
    onError?.(error);
  }
}

/**
 * Fetches AI generated tests as a JSON array.
 */
export async function fetchGeneratedTests({ code, language }) {
  const response = await fetch(`${API_BASE}/api/ai/generate-tests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, language }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch generated tests');
  }

  return response.json();
}

/**
 * Executes code via the backend runner with optional stdin.
 * Returns { stdout, stderr, exitCode }.
 */
export async function runCode({ code, language, stdin }) {
  const response = await fetch(`${API_BASE}/api/code/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, language, stdin: stdin || '' }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Execution failed');
  }

  return result;
}

export async function signupUser({ username, email, password }) {
  const response = await fetch(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Signup failed');
  }
  return response.json();
}

export async function verifyOtp({ email, otp }) {
  const response = await fetch(`${API_BASE}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'OTP verification failed');
  }
  return response.json();
}

export async function loginUser({ email, password }) {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Login failed');
  }
  return response.json();
}

/**
 * Streams an AI code roast via SSE.
 */
export async function streamRoastCode({ code, language, onChunk, onDone, onError }) {
  try {
    const response = await fetch(`${API_BASE}/api/ai/roast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch roast');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;

      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();

            if (dataStr === '[DONE]') {
               done = true;
               break;
            }

            if (dataStr) {
              try {
                const dataObj = JSON.parse(dataStr);
                onChunk(dataObj.text);
              } catch {
                console.error('Error parsing stream chunk', dataStr);
              }
            }
          }
        }
      }
    }

    onDone?.();
  } catch (error) {
    console.error(error);
    onError?.(error);
  }
}

/**
 * Streams an AI code review via SSE.
 */
export async function streamReviewCode({ code, language, onChunk, onDone, onError }) {
  try {
    const response = await fetch(`${API_BASE}/api/ai/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch review analysis');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;

      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();

            if (dataStr === '[DONE]') {
              done = true;
              break;
            }

            if (dataStr) {
              try {
                const dataObj = JSON.parse(dataStr);
                onChunk(dataObj.text);
              } catch {
                console.error('Error parsing stream chunk', dataStr);
              }
            }
          }
        }
      }
    }

    onDone?.();
  } catch (error) {
    console.error(error);
    onError?.(error);
  }
}
