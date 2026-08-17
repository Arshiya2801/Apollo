# Phase 4: SSE Token Streaming Pipeline

> **What this phase covers:** The most senior-level technical implementation in Apollo. Every time the AI types a response character-by-character in real time, this entire pipeline runs. After this phase, you must be able to whiteboard the full end-to-end SSE flow from the OpenAI API call all the way to the React `useState` update — without notes.

---

## 1. Why Does Streaming Exist? — The Problem First

Without streaming, here is what happens:

```
User clicks "Ask AI"
           │
           ▼
  Browser sends POST request
           │
           ▼
  Server waits... (OpenAI generates the full response)
  ... 3 seconds pass ...
  ... 7 seconds pass ...
  ... 11 seconds pass ...
           │
           ▼
  Server sends the ENTIRE response at once
           │
           ▼
  User's screen updates in one sudden flash
```

For a 500-word code review, this is a 10+ second blank wait with zero feedback. Users will think it broke and leave.

With streaming:
```
User clicks "Ask AI"
           │
           ▼
  Server opens a long-lived HTTP connection
  OpenAI generates: "The" → server sends it immediately
  OpenAI generates: " time" → server sends it immediately
  OpenAI generates: " complexity" → server sends it immediately
  ... every ~50ms, one more token arrives ...
           │
           ▼
  User sees the response being TYPED in real time
  First token arrives in < 500ms
  Feels alive and responsive
```

This is **Server-Sent Events (SSE)** — a standard browser technology for one-directional server-to-client streaming over HTTP.

---

## 2. SSE vs WebSockets — The Interview Question You Will Get

> **"Why did you use SSE instead of WebSockets for your AI streaming?"**

| Property | SSE | WebSockets |
|---|---|---|
| **Direction** | One-way: Server → Client only | Bidirectional: both directions |
| **Protocol** | Plain HTTP/1.1 | WebSocket upgrade (ws://) |
| **State** | Stateless — each request is independent | Stateful — connection must be maintained |
| **Load balancing** | Works out of the box with any load balancer | Requires sticky sessions |
| **Reconnection** | Browser auto-reconnects natively | Must implement manually |
| **Complexity** | Minimal — just `res.write()` on the server | Full connection lifecycle management needed |
| **Use case fit for Apollo** | ✅ Perfect: one question in, streaming answer out | ❌ Overkill: bidirectional not needed |

**The exact answer to give:**

> *"AI code analysis is inherently one-directional: the user submits a request, the server streams a response back. SSE is designed exactly for this pattern — it runs over standard HTTP/1.1, works transparently behind load balancers and proxies, supports native browser auto-reconnect, and requires zero extra infrastructure. WebSockets would require a persistent stateful connection and sticky session configuration — engineering complexity with no benefit for our use case. SSE is the right tool here."*

---

## 3. The 3 Magic SSE Response Headers — Why Each One Matters

Every SSE response in Apollo starts with these three lines (from `chatController.js`):

```javascript
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');
```

**Why each one is non-negotiable:**

### `Content-Type: text/event-stream`
This tells the browser: *"This is not a normal JSON response. This is a live event stream. Do NOT buffer it — deliver each chunk to JavaScript as it arrives."*

Without this header, the browser will buffer the entire response body internally and only deliver it all at once when the connection closes. Your streaming effect disappears completely.

### `Cache-Control: no-cache`
This tells every proxy, CDN, and reverse proxy between the client and server: *"Do NOT cache this response. Every request must reach the origin server fresh."*

Without this, a caching layer like Nginx or Cloudflare might buffer the response, cache it, and serve it as a single blob — killing the streaming effect.

### `Connection: keep-alive`
This tells the HTTP/1.1 layer: *"Keep this TCP connection open. Don't close it after the first chunk."*

HTTP/1.1 defaults to closing connections after each request-response cycle. `keep-alive` overrides this so the server can keep writing data to the same connection over many seconds.

**All three together create a persistent pipe that can carry live data.**

---

## 4. The SSE Wire Format — Exactly What Travels Over the Network

Open your browser's DevTools → Network tab → click the `/api/ai/chat` request → look at the "Event Stream" or "Response" tab. You will see this exact format:

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"text":"The"}

data: {"text":" time"}

data: {"text":" complexity"}

data: {"text":" of"}

data: {"text":" this"}

data: {"text":" algorithm"}

data: {"text":" is"}

data: {"text":" O(n)"}

data: [DONE]

```

**The protocol rules:**
1. Every event line starts with `data: ` (the literal string, including the space).
2. Every event line ends with `\n\n` (two newlines — the event boundary marker).
3. The terminal signal `data: [DONE]\n\n` tells the client: *"stream is finished, close."*

**Apollo's exact implementation (`chatController.js` lines 25-29):**
```javascript
for await (const text of stream) {
  res.write(`data: ${JSON.stringify({ text })}\n\n`);
  //          ↑            ↑               ↑
  //  protocol prefix    token wrapped    event boundary
  //                     in JSON object
}

res.write('data: [DONE]\n\n');   // Terminal signal
res.end();                        // Close the HTTP response
```

**Why wrap the text token in a JSON object?**

`res.write(`data: ${text}\n\n`)` would also work, but it's fragile. If `text` contains a newline character, it breaks the SSE protocol (which uses `\n\n` as an event boundary). Wrapping in `JSON.stringify({ text })` escapes all special characters, making the payload safe and parseable regardless of content.

---

## 5. The Backend Async Generator — The Heart of the Pipeline

This is the most technically interesting pattern in the entire codebase. In `aiService.js`:

```javascript
export async function* streamByMode(code, language, mode, history = []) {
//                  ↑
//          async GENERATOR function — produces values over time

  const prompt = buildPrompt(mode, code, language);
  const messages = [{ role: 'user', content: prompt }];

  const responseStream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: messages,
    stream: true,       // ← tells OpenAI to return a stream, not a full response
    max_completion_tokens: 8000,
  });

  for await (const chunk of responseStream) {
    // chunk is one token packet from OpenAI
    const text = chunk.choices[0]?.delta?.content || '';
    if (text) yield text;
    //         ↑
    //   YIELD: pauses the generator here,
    //   sends the token to whoever is consuming this generator,
    //   then resumes when they ask for the next one
  }
}
```

**What is `async function*` and `yield`?**

A normal function runs top to bottom and returns one value. A **generator function** (`function*`) can return multiple values, one at a time, pausing between each one.

- `yield text` is like saying: *"Here is the next value. Take it. Call me again when you need the next one."*
- The function does NOT exit at `yield`. It pauses. It resumes from the same line on the next call.

**The consumer in `chatController.js`:**
```javascript
const stream = streamByMode(code, language, mode);
//             ↑ stream is now a generator — it hasn't run yet

for await (const text of stream) {
//  ↑ each iteration: asks the generator for the next yield
  res.write(`data: ${JSON.stringify({ text })}\n\n`);
  // immediately writes each token to the HTTP response
}
```

**The complete token journey from OpenAI to the browser:**
```
OpenAI server
    │  yields one token ("The")
    ▼
openai.chat.completions (SDK stream)
    │  chunk.choices[0].delta.content = "The"
    ▼
aiService.js generator
    │  yield "The"
    ▼
chatController.js for-await loop
    │  res.write(`data: {"text":"The"}\n\n`)
    ▼
Express HTTP response stream (TCP socket)
    │  raw bytes travel over the network
    ▼
Browser — api.js ReadableStream reader
    │  onChunk("The") callback fires
    ▼
Workspace.jsx setMessages() call
    │  appends "The" to the last message in React state
    ▼
React re-renders the chat panel
    │  user sees "The" appear on screen
    ▼
(~50ms later, the next token arrives and the cycle repeats)
```

---

## 6. The Frontend SSE Consumer — `api.js` Line by Line

`streamAIChat()` in `api.js` is the most complex function on the frontend. Here is a complete annotation:

```javascript
export async function streamAIChat({ code, language, mode, history, onChunk, onDone, onError }) {
  try {
    const response = await fetch(`${API_BASE}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, mode, history: history || [] }),
    });
    // ↑ This is a normal fetch — POST request with JSON body.
    //   fetch() resolves immediately when the server sends HTTP headers.
    //   The body hasn't arrived yet — that's what we read below.

    if (!response.ok) {
      throw new Error('Failed to fetch AI response');
    }

    const reader = response.body.getReader();
    // ↑ response.body is a ReadableStream — the raw HTTP body as a stream of bytes.
    //   getReader() returns a ReadableStreamDefaultReader for consuming it chunk by chunk.

    const decoder = new TextDecoder('utf-8');
    // ↑ Converts raw Uint8Array bytes → human-readable UTF-8 string.
    //   Required because SSE text must be decoded from binary.

    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      // ↑ reader.read() is async — it WAITS until the next chunk of bytes arrives.
      //   value: Uint8Array of raw bytes (one or more SSE lines)
      //   done: true when the server closes the connection (after res.end())

      done = readerDone;

      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        // ↑ { stream: true } tells TextDecoder this is a partial stream.
        //   Multi-byte characters (e.g., Chinese, emoji) might arrive split
        //   across two reads. stream:true buffers incomplete characters internally.

        const lines = chunk.split('\n');
        // ↑ Split by newline because each SSE event ends with \n\n.
        //   This gives us individual "data: {...}" lines.

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            // ↑ Strip the SSE "data: " prefix to get the raw payload.

            if (dataStr === '[DONE]') {
              done = true;   // ← Terminal signal: end the while loop
              break;
            }

            if (dataStr) {
              try {
                const dataObj = JSON.parse(dataStr);
                onChunk(dataObj.text);
                // ↑ Fire the callback with the extracted token string.
                //   onChunk is provided by the caller (Workspace.jsx).
              } catch {
                console.error('Error parsing stream chunk', dataStr);
                // ↑ Defensive: malformed JSON does not crash the stream.
              }
            }
          }
        }
      }
    }

    onDone?.();
    // ↑ Optional chaining: call onDone if it was provided. Signals stream completed.

  } catch (error) {
    console.error(error);
    onError?.(error);
    // ↑ Call onError if fetch fails entirely (network error, server down, etc.)
  }
}
```

---

## 7. The React Streaming State Update Pattern — Creating the "Typing" Effect

This is the most elegant part of the frontend implementation. In `Workspace.jsx`:

**When the user first clicks "Ask AI" (`handleAskAI`):**
```javascript
// Step 1: Immediately add TWO messages to state
setMessages([
  { role: 'user',  content: 'Please run Code Review mode on my code.' },
  { role: 'model', content: '' }  // ← Empty placeholder for the AI response
]);

// Step 2: Start streaming — each token fires onChunk
await streamAIChat({
  code, language,
  mode: activeMode.key,
  history: [],
  onChunk: (text) => {
    setMessages(prev => {
      const newMessages = [...prev];
      //                   ↑ Always spread to a NEW array (React needs a new reference
      //                     to detect state changes)

      const lastIndex = newMessages.length - 1;
      const lastMsg = newMessages[lastIndex];

      newMessages[lastIndex] = {
        ...lastMsg,
        content: (lastMsg.content || '') + text
        //                                 ↑ APPEND the new token to whatever is already there
      };

      return newMessages;
    });
  },
});
```

**Why this creates the "typing" effect:**
1. State starts as: `[{user message}, {model: ""}]`
2. After token 1: `[{user message}, {model: "The"}]` → React re-renders
3. After token 2: `[{user message}, {model: "The time"}]` → React re-renders
4. After token 3: `[{user message}, {model: "The time complexity"}]` → React re-renders
5. After ~200 tokens: full response is complete.

Each `setMessages` call triggers a React re-render that updates only the last message bubble. The user perceives this as the AI typing in real time.

**The critical detail — why `[...prev]` and not direct mutation:**
```javascript
// ❌ WRONG — direct mutation (React won't detect the change):
prev[lastIndex].content += text;
return prev;  // same array reference — React skips re-render!

// ✅ CORRECT — new array reference (React detects the change):
const newMessages = [...prev];  // creates a new array
newMessages[lastIndex] = { ...lastMsg, content: lastMsg.content + text };
return newMessages;  // different reference — React re-renders
```

React uses **reference equality** (`===`) to detect state changes. Mutating the existing array and returning the same reference means React sees no change and skips the re-render entirely.

**`handleSendMessage()` — Follow-up Messages:**
```javascript
const handleSendMessage = async () => {
  const input = chatInput;
  setChatInput('');

  setMessages(prev => [
    ...prev,
    { role: 'user', content: input },
    { role: 'model', content: '' }  // ← new empty placeholder appended
  ]);

  await streamAIChat({
    code, language,
    mode: activeMode.key,
    history: messages.concat([{ role: 'user', content: input }]),
    //        ↑ ENTIRE conversation history is sent to the backend
    //          so OpenAI has context of all prior turns
    onChunk: (text) => {
      setMessages(prev => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;
        newMessages[lastIndex] = {
          ...newMessages[lastIndex],
          content: (newMessages[lastIndex].content || '') + text
        };
        return newMessages;
      });
    },
  });
};
```

The key difference from `handleAskAI()`: `history` is populated with the full conversation, enabling Type 2 multi-turn mode.

---

## 8. The Callback Architecture — Why `onChunk`, `onDone`, `onError`?

`streamAIChat()` receives three optional callback functions instead of returning a value or throwing:

```javascript
streamAIChat({
  code, language, mode, history,
  onChunk: (text) => { /* called for each arriving token */ },
  onDone:  ()     => { /* called once when stream ends cleanly */ },
  onError: (err)  => { /* called once if stream fails */ },
});
```

**Why callbacks instead of returning the stream?**

Because `streamAIChat` does complex async work (fetch, ReadableStream, TextDecoder, line parsing, JSON parsing) internally. The caller (Workspace.jsx, WorkspaceChat.jsx, Interview.jsx) should not have to re-implement this pipeline for every page. The callbacks separate *what to do with each token* from *how to extract the tokens*.

This is a **Strategy Pattern** — the extraction logic is fixed inside `streamAIChat`, but the "strategy" for handling tokens is plugged in from the outside. Different pages use different `onChunk` implementations (Workspace appends to one state array, Interview appends to its messages state differently) without duplicating any SSE parsing code.

---

## 9. The `generateTests` Endpoint — Why It Does NOT Use SSE

```javascript
// In chatController.js:
export async function generateTests(req, res) {
  const tests = await generateTestsAsJson(code, language);
  res.json(tests);  // ← Normal JSON response, NOT SSE
}

// In aiService.js:
export async function generateTestsAsJson(code, language) {
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'system', content: prompt }],
    response_format: { type: "json_object" }  // ← Forces structured JSON output
    // NO "stream: true" — this is a blocking full response
  });

  const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
  return parsed.tests || [];
}
```

**Why no streaming for test generation?**

Because `response_format: { type: "json_object" }` requires OpenAI to return a **complete, valid JSON object**. You cannot parse partial JSON mid-stream — `JSON.parse('{"tests": [{"input":')` throws a SyntaxError. The entire `{ "tests": [...] }` payload must arrive before it can be parsed. So the only option is a blocking await for the full response.

**Trade-off to discuss in interviews:** Test generation has a noticeable 3-5 second delay before anything appears. The production fix would be to stream raw JSON text and use a streaming JSON parser library (like `jsonrepair` or `@streamparser/json`), but that adds significant complexity and was deprioritized for MVP.

---

## 10. Production Issues — What You Must Own in Interviews

### Issue 1: Stream Abandonment (User Closes Tab Mid-Stream)

**What happens:** User clicks "Ask AI", then closes the browser tab 2 seconds into the stream. The server has no idea — it keeps calling `res.write()` on a dead connection, and OpenAI keeps generating tokens. API tokens are wasted.

**What Apollo does currently:** Nothing. The stream continues until OpenAI finishes generating. `res.write()` on a closed socket silently fails in Node.js.

**Production fix:**
```javascript
// In chatController.js:
const abortController = new AbortController();

req.on('close', () => {
  abortController.abort();  // Signal the OpenAI call to cancel
});

const responseStream = await openai.chat.completions.create({
  model: MODEL,
  messages,
  stream: true,
  signal: abortController.signal  // Wired into the OpenAI SDK
});
```

When the client disconnects, `req` emits a `'close'` event. `abort()` signals the OpenAI SDK to cancel the HTTP request to OpenAI's servers immediately, saving both server CPU and API credits.

### Issue 2: Chunk Fragmentation

**What happens:** The browser's `reader.read()` may return multiple SSE events concatenated in one `value`:
```
"data: {\"text\":\"The\"}\n\ndata: {\"text\":\" time\"}\n\n"
```
Or worse, a single event split across two reads:
```
Read 1: "data: {\"tex"
Read 2: "t\":\"The\"}\n\n"
```

**How Apollo handles it:** `chunk.split('\n')` handles multiple events in one chunk. TextDecoder with `{ stream: true }` handles incomplete multi-byte characters. A JSON parse error on a split event is caught silently by the `try/catch`.

**Production fix:** Maintain a persistent line buffer between reads. Only process lines when a complete `\n\n` event boundary is seen. Libraries like `@microsoft/fetch-event-source` handle this correctly.

### Issue 3: SSE Headers Must Be Set BEFORE Any Write

```javascript
// ❌ Wrong order:
res.status(200);  // This can flush headers in some Express versions
res.setHeader('Content-Type', 'text/event-stream');  // Too late!

// ✅ Correct order (what Apollo does):
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');
// Status 200 is implicit when you start writing body
```

In Apollo's `chatController.js`, headers are always set first before entering the `try` block — this is correct.

### Issue 4: Error Handling After Headers Are Sent

Once `res.setHeader()` and the first `res.write()` have been called, the HTTP status code is committed (200 OK). You cannot send `res.status(500).json(...)` anymore.

Apollo handles this correctly with `res.headersSent`:
```javascript
} catch (error) {
  if (!res.headersSent) {
    // Stream hasn't started — can send a proper HTTP error response
    res.status(500).json({ error: 'Failed to generate response' });
  } else {
    // Stream already started — inject an error event into the SSE stream
    res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`);
    res.end();
  }
}
```

---

## 11. `API_BASE` — Environment URL Switching

In `api.js`:
```javascript
export const API_BASE = import.meta.env.VITE_API_BASE
  || (import.meta.env.MODE === 'production'
    ? 'https://practium6.onrender.com'
    : 'http://localhost:5000');
```

**How this works:**
1. First priority: `VITE_API_BASE` environment variable (set in `.env` or deployment config). Allows any override without code changes.
2. Fallback: Checks `import.meta.env.MODE`:
   - `'development'` when running `npm run dev` (Vite dev server) → uses `localhost:5000`
   - `'production'` when running `npm run build` → uses the Render deployment URL

`import.meta.env` is Vite's equivalent of `process.env`. Vite replaces these values at **build time** (not runtime) — the actual string URLs are baked into the production bundle during compilation.

---

## 12. Key Files to Read in Full (For This Phase)

Read these in order — each layer feeds into the next:

1. **[server/controllers/chatController.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/server/controllers/chatController.js)** ⭐ — The SSE orchestrator. Focus on: `setHeader()` calls, `for await (const text of stream)`, `res.write()`, `res.write('[DONE]')`, `res.end()`, and the `res.headersSent` error handling pattern.

2. **[server/services/aiService.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/server/services/aiService.js)** ⭐ — The async generator. Focus on: `async function*`, `yield text`, `for await (const chunk of responseStream)`, `chunk.choices[0]?.delta?.content`. Compare `streamByMode` (Type 1) with `streamChatByMode` (Type 2).

3. **[client/src/services/api.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/client/src/services/api.js)** ⭐ — The frontend SSE consumer. Focus on: `response.body.getReader()`, `TextDecoder`, `while (!done)`, `reader.read()`, `chunk.split('\n')`, `line.startsWith('data: ')`, the `[DONE]` check, and the `onChunk` callback firing.

4. **[client/src/pages/Workspace.jsx](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/client/src/pages/Workspace.jsx)** ⭐ — The React streaming state. Focus on: `handleAskAI()` and `handleSendMessage()`. Understand the `setMessages(prev => [...prev])` append pattern and why a new array reference is always created.

---

## 13. Interview Questions Specific to This Phase

1. **"Walk me through exactly what happens after the user clicks 'Ask AI' in Apollo."**
   → Frontend calls `streamAIChat()` in `api.js` → `fetch()` to `/api/ai/chat` → Express routes to `streamChat()` in `chatController.js` → sets 3 SSE headers → calls `streamByMode()` in `aiService.js` → OpenAI SDK called with `stream: true` → async generator `yield`s each token → `for await` loop in controller writes `data: {text}\n\n` to the HTTP response → browser's `ReadableStream` delivers each write to `api.js`'s `reader.read()` → lines split, JSON parsed, `onChunk(text)` fires → Workspace.jsx `setMessages()` appends token to last message → React re-renders the chat bubble with the new text.

2. **"What are the three SSE response headers and why is each one required?"**
   → `Content-Type: text/event-stream` — prevents browser buffering, enables streaming. `Cache-Control: no-cache` — prevents CDN/proxy caching. `Connection: keep-alive` — keeps the TCP connection open so the server can keep writing data over time.

3. **"What is an async generator and why did you use it?"**
   → An async generator (`async function*`) is a function that can `yield` multiple values asynchronously over time. Apollo uses it in `aiService.js` because the OpenAI SDK returns a stream of token chunks. By wrapping it in an async generator, we can `yield` each token to the calling controller, which immediately writes it to the HTTP response. This creates a clean separation: the service layer handles AI stream extraction, the controller handles HTTP streaming.

4. **"What happens if the user closes the browser mid-stream?"**
   → Currently, Apollo does not handle this. The server continues writing to a dead connection, and OpenAI keeps generating tokens (wasting API credits). The production fix is `req.on('close', () => abortController.abort())` wired into the OpenAI SDK call via `signal: abortController.signal`.

5. **"Why doesn't `generateTests` use SSE streaming?"**
   → It uses `response_format: { type: "json_object" }`, which forces OpenAI to return a complete valid JSON object. You cannot `JSON.parse()` partial JSON — the full response must arrive before it can be parsed. Therefore it must be a blocking await, not a stream.

6. **"How does the typing animation work? Isn't calling setState hundreds of times expensive?"**
   → Each token fires `setMessages(prev => [...prev])` which triggers a React re-render. In React 18, automatic batching minimizes unnecessary renders. Each re-render only updates the last message bubble (a small DOM subtree), so the cost is very low per update. The perceived "typing" effect is real — each token appends to the content string and React commits it to the DOM within milliseconds.
