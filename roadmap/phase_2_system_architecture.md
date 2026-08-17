# Phase 2: System Architecture & All Data Flows

> **What this phase covers:** The complete picture of how every layer of Apollo connects — the entry point, all middleware, every route, every controller, every service call, and every response. After this phase, you should be able to draw the full architecture from memory and trace any request from browser to database and back.

> **Why this comes before the individual deep dives:** You cannot explain how the AI streaming works, or how auth works, or how code execution works — if you don't first understand where each of these sits in the overall system. Architecture is the frame; everything else is the painting.

---

## 1. The 3-Tier Architecture

Apollo is a standard 3-tier web application. Understanding this tier model is the foundation of every architecture question.

```
┌─────────────────────────────────────────────────────────────────────┐
│  TIER 1: CLIENT (Browser)                                           │
│  ─────────────────────────────────────────────────────             │
│  Runtime: React 18 + Vite dev server (localhost:5173)              │
│  Routing: React Router v6 (BrowserRouter, client-side SPA)         │
│  Global State: AuthContext (createContext + useContext)             │
│  HTTP Layer: api.js — single file, all backend calls               │
│  Real-Time: socket.io-client (FormalInterview page only)           │
│  Editor: Monaco Editor (@monaco-editor/react)                      │
│  Notifications: react-hot-toast                                    │
│  Icons: lucide-react                                               │
│  Markdown Rendering: react-markdown (for AI responses)             │
└──────────────────────────┬──────────────────────────────────────────┘
                           │  HTTP/1.1 (REST + SSE)  +  ws:// (Socket.io)
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  TIER 2: SERVER (Node.js + Express 5 + Socket.io)                   │
│  ─────────────────────────────────────────────────────             │
│  Entry Point: server.js                                            │
│  Runtime Port: 5000 (dev) / process.env.PORT (prod)               │
│  HTTP Server: Node's built-in http.createServer(app)               │
│  WebSocket Server: Socket.io attached to the HTTP server           │
│  Middleware: cors(), express.json()                                │
│  Routes: /api/auth, /api/ai, /api/code, /health                   │
│  ─────────────────────────────────────────────────────             │
│  Controllers:                                                       │
│    authController.js  → OTP, bcrypt, JWT, Brevo email             │
│    chatController.js  → SSE streaming orchestrator                 │
│    codeController.js  → routes to codeRunner service              │
│  ─────────────────────────────────────────────────────             │
│  Sockets:                                                           │
│    interviewSockets.js → WebRTC signaling + code/question sync     │
│  ─────────────────────────────────────────────────────             │
│  Services:                                                          │
│    aiService.js       → OpenAI SDK wrapper, async generators       │
│    modeEngine.js      → prompt factory, buildPrompt/buildChat      │
│    codeRunner.js      → local exec OR Judge0 API                   │
│  ─────────────────────────────────────────────────────             │
│  Config:                                                            │
│    config/ai.js       → OpenAI client singleton                    │
│    config/db.js       → Mongoose connection                        │
└──────────────────────────┬──────────────────────────────────────────┘
                           │  Mongoose ODM (MongoDB Wire Protocol)
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  TIER 3: DATABASE (MongoDB Atlas — Cloud)                           │
│  ─────────────────────────────────────────────────────             │
│  Type: NoSQL document store                                        │
│  Collection: users                                                 │
│  Index: unique B-Tree index on email field (auto-created)          │
│  ODM: Mongoose v9 (schema validation, virtual fields, hooks)       │
└─────────────────────────────────────────────────────────────────────┘

─────────────────────────  EXTERNAL APIs  ─────────────────────────────
  OpenAI API       → AI language model calls (gpt-4o-mini)
  Judge0 API       → Sandboxed C++/Java compilation and execution
  Brevo API        → Transactional email delivery (OTP)
  Google STUN      → ICE candidate discovery for WebRTC peer connection
───────────────────────────────────────────────────────────────────────
```

---

## 2. The Server Entry Point — server.js Line by Line

`server.js` is the first file that runs. Everything flows from here. You must be able to explain every line:

```javascript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';     // ← NEW: Node's built-in HTTP module
import { Server } from 'socket.io';     // ← NEW: Socket.io WebSocket server

import aiRoutes from './routes/aiRoutes.js';
import codeRoutes from './routes/codeRoutes.js';
import authRoutes from './routes/authRoutes.js';
import connectDB from './config/db.js';
import initInterviewSockets from './sockets/interviewSockets.js'; // ← NEW

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') }); // ← NEW: also checks parent dir
connectDB();

const app = express();

// ── CRITICAL CHANGE: Socket.io requires a raw HTTP server, not just Express ──
// Express alone only handles HTTP. Socket.io needs to attach to an HTTP server
// so it can upgrade HTTP connections to WebSocket (ws://) connections.
const httpServer = createServer(app);   // Wraps the Express app in a Node HTTP server
const io = new Server(httpServer, {    // Socket.io attaches to the HTTP server
  cors: {
    origin: '*',                        // Allow all origins — tighten in production
    methods: ['GET', 'POST']
  }
});
// Key point: `app` and `io` share the SAME port (5000).
// HTTP requests (REST/SSE) → handled by Express (app)
// WebSocket requests (ws://) → handled by Socket.io (io)
// Both ride on `httpServer` — the port is the same.

const PORT = process.env.PORT || 5000;

// ── Middleware ──
app.use(cors());
app.use(express.json());

// ── Route mounting ──
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/code', codeRoutes);

// ── Health Check ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Apollo Backend is running' });
});

// ── Initialize WebSocket event handlers ──
initInterviewSockets(io);  // Registers all socket.on() listeners for the interview room

// ── Start Server ── (httpServer, NOT app.listen)
httpServer.listen(PORT, () => {
  console.log(`Apollo server running on port ${PORT}`);
});
// IMPORTANT: app.listen() would NOT work here.
// app.listen() creates its own internal HTTP server internally.
// Since we need to share the same server with Socket.io, we create
// httpServer manually and call httpServer.listen() instead.
```

### What is missing from server.js (own these in interviews):
1. **No JWT auth middleware**: There is no `app.use('/api/ai', verifyToken)` or `app.use('/api/code', verifyToken)`. Any unauthenticated request to these endpoints works. A bot can freely call your AI endpoints and drain your OpenAI credits.
2. **No rate limiting**: No `express-rate-limit`. 1,000 rapid requests from one IP will exhaust your OpenAI API limit.
3. **No global error handling middleware**: No `app.use((err, req, res, next) => {...})`. Unhandled errors in routes will either hang the request or crash the process.
4. **`cors()` with no origin restriction**: Should be `cors({ origin: process.env.CLIENT_URL })` in production.
5. **Socket.io has no auth either**: Anyone who can reach port 5000 can open a Socket.io connection and join any room by guessing a `roomId`. Production fix: verify JWT inside the Socket.io `connection` handler using `socket.handshake.auth.token`.

---

## 3. The Complete API Surface (Every Endpoint)

### Auth Routes — `/api/auth`
Defined in: `authRoutes.js` → handled by `authController.js`

| Method | Full URL | Purpose | Request Body | Success Response | Possible Errors |
|---|---|---|---|---|---|
| POST | `/api/auth/signup` | Create user, hash password, send OTP | `{ username, email, password }` | `201 { message, email }` | `400` user exists, `500` server error |
| POST | `/api/auth/verify-otp` | Match OTP, mark verified, issue JWT | `{ email, otp }` | `200 { message, token, user }` | `404` not found, `400` invalid/expired OTP |
| POST | `/api/auth/login` | Authenticate user, issue JWT | `{ email, password }` | `200 { message, token, user }` | `400` invalid credentials, `403` unverified |

### AI Routes — `/api/ai`
Defined in: `aiRoutes.js` → handled by `chatController.js` → calls `aiService.js`

| Method | Full URL | Response Type | Purpose | Body |
|---|---|---|---|---|
| POST | `/api/ai/chat` | **SSE Stream** | Unified — all modes, with/without history | `{ code, language, mode, history[] }` |
| POST | `/api/ai/explain` | **SSE Stream** | Code explanation | `{ code, language }` |
| POST | `/api/ai/complexity` | **SSE Stream** | Big-O time & space analysis | `{ code, language }` |
| POST | `/api/ai/roast` | **SSE Stream** | Savage code critique | `{ code, language }` |
| POST | `/api/ai/review` | **SSE Stream** | Detailed code review | `{ code, language }` |
| POST | `/api/ai/generate-tests` | **JSON** (not SSE) | Generate 3 test cases | `{ code, language }` |

### Code Route — `/api/code`
Defined in: `codeRoutes.js` → handled by `codeController.js` → calls `codeRunner.js`

| Method | Full URL | Response Type | Purpose | Body |
|---|---|---|---|---|
| POST | `/api/code/run` | **JSON** | Execute user code | `{ code, language }` |

### Health Check
| Method | Full URL | Purpose |
|---|---|---|
| GET | `/health` | Server liveness check for uptime monitors |

### Socket.io Events — `ws://` (Real-Time, Not HTTP)
Defined in: `sockets/interviewSockets.js` → registered via `initInterviewSockets(io)` in `server.js`

Socket.io events are **not HTTP routes**. They are event-based messages over a persistent WebSocket connection. The client emits an event; the server listens with `socket.on()`; the server broadcasts back with `socket.to(roomId).emit()`.

| Event (Client → Server) | Server broadcasts to room | Purpose |
|---|---|---|
| `join-room (roomId, userId)` | `user-connected (userId, socketId)` | User joins interview room; notifies others |
| `offer (offer, roomId)` | `offer (offer, socketId)` | WebRTC Step 1: Initiator sends SDP offer |
| `answer (answer, roomId)` | `answer (answer, socketId)` | WebRTC Step 2: Receiver sends SDP answer |
| `ice-candidate (candidate, roomId)` | `ice-candidate (candidate)` | WebRTC Step 3: Exchange ICE network candidates |
| `code-change (code, roomId)` | `code-change (code)` | Sync editor content to all room members |
| `language-change (lang, roomId)` | `language-change (lang)` | Sync language selector to all room members |
| `question-update (text, roomId)` | `question-update (text)` | Interviewer broadcasts problem to student |
| *(disconnect)* | `user-disconnected (userId, socketId)` | Notifies room when someone leaves |

**The room concept:** Each `FormalInterview` session has a unique `roomId` (a UUID generated by the host). Socket.io's `socket.join(roomId)` puts the socket into a named group. `socket.to(roomId).emit(...)` sends to everyone in that group *except* the sender. This is how one user's code change instantly appears in the other user's editor.

---

## 4. Request Flow: AI Chat with Socratic Mode (The Most Important Flow)

This is the most complex, interesting flow in the entire project. Interviewers will almost certainly ask you to trace it end-to-end. Know every step.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1: User selects "Socratic Coach" mode and sends a message
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Frontend — Workspace.jsx — handleSendMessage()]
  User types: "How do I solve Two Sum?"
  setChatInput('') → clears input
  Optimistically adds message to state:
    setMessages(prev => [
      ...prev,
      { role: 'user', content: "How do I solve Two Sum?" },
      { role: 'model', content: '' }  ← empty placeholder for streaming
    ])

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2: Frontend sends HTTP POST to the backend
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Frontend — api.js — streamAIChat()]
  fetch('http://localhost:5000/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: "function twoSum(nums, target) {",   ← current editor content
      language: "javascript",
      mode: "socratic",
      history: [
        { role: 'user', content: "How do I solve Two Sum?" }
      ]
    })
  })

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3: Express router receives and dispatches
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[server.js] app.use('/api/ai', aiRoutes)
[aiRoutes.js] router.post('/chat', streamChat)
  → Matches the URL, dispatches to streamChat controller

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4: Controller sets SSE headers and selects stream type
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[chatController.js — streamChat()]
  Destructures: { code, language, mode: 'socratic', history: [...] }
  
  Validates: if (!code) → 400 error (history.length > 0, so passes)
  
  Sets SSE response headers (response starts NOW, before any AI data):
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
  
  Detects: history.length > 0 → TRUE
  Chooses: streamChatByMode() (multi-turn chat, Type 2)
  NOT: streamByMode() (single-shot, Type 1)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 5: aiService builds the messages array for OpenAI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[aiService.js — streamChatByMode('socratic', code, 'javascript', history)]
  Calls: modeEngine.buildChatContents('socratic', code, 'javascript', history)

[modeEngine.js — buildChatContents()]
  Builds this messages array:
  [
    {
      role: 'system',
      content: 'You are Apollo Socratic Coach — you teach by asking, NEVER by telling...'
    },
    {
      role: 'system',
      content: 'User\'s code context (javascript):\n```javascript\nfunction twoSum(nums, target) {\n```'
    },
    {
      role: 'user',        ← from history[0]
      content: 'How do I solve Two Sum?'
    }
  ]
  Returns the array to streamChatByMode

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 6: OpenAI SDK call with stream: true
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[aiService.js]
  const responseStream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [...],      ← the array from step 5
    stream: true,         ← crucial: returns an async iterable
    max_completion_tokens: 8000,
  });
  // OpenAI starts generating tokens. Each token arrives as a "chunk".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 7: Async generator yields each token
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[aiService.js — streamChatByMode is an async function*]
  for await (const chunk of responseStream) {
    const text = chunk.choices[0]?.delta?.content || '';
    if (text) yield text;
    //         ^^^^ yields: "What", then " data", then " structure", then "..."
  }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 8: Controller writes each token as an SSE event
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[chatController.js — back in streamChat()]
  for await (const text of stream) {
    res.write(`data: ${JSON.stringify({ text })}\n\n`);
  }
  // Wire format sent to browser:
  // data: {"text":"What"}\n\n
  // data: {"text":" data"}\n\n
  // data: {"text":" structure"}\n\n
  // ... (hundreds of such events)
  
  res.write('data: [DONE]\n\n');
  res.end();   ← closes the HTTP connection

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 9: Frontend reads the stream and updates UI in real-time
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[api.js — streamAIChat()]
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let done = false;

  while (!done) {
    const { value, done: readerDone } = await reader.read();
    done = readerDone;
    
    if (value) {
      const chunk = decoder.decode(value, { stream: true });
      // chunk might be: 'data: {"text":"What"}\n\ndata: {"text":" data"}\n\n'
      
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.replace('data: ', '').trim();
          if (dataStr === '[DONE]') { done = true; break; }
          
          const dataObj = JSON.parse(dataStr);  // { text: "What" }
          onChunk(dataObj.text);                // calls the callback
        }
      }
    }
  }

[Workspace.jsx — onChunk callback]
  // Receives "What", then " data", then " structure" one by one
  setMessages(prev => {
    const newMessages = [...prev];
    const lastIndex = newMessages.length - 1;  // the empty placeholder
    newMessages[lastIndex] = {
      ...newMessages[lastIndex],
      content: (newMessages[lastIndex].content || '') + text
      //        "What" → "What data" → "What data structure" → ...
    };
    return newMessages;
  });
  // React re-renders the last chat bubble on each chunk → "typing" effect

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL FLOW COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User sees: "What data structure lets you look up values by key in O(1) time?"
appearing word-by-word as the model generates it.
```

---

## 5. Request Flow: Signup → OTP → Login

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SIGNUP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Auth.jsx] User submits { username, email, password }
  → calls signupUser() from api.js
  → POST /api/auth/signup

[authController.js — signup()]
  1. User.findOne({ email })
     → If found: 400 'User already exists'
  
  2. bcrypt.genSalt(10)                → generates 10-round salt
     bcrypt.hash(password, salt)       → "$2a$10$..."
  
  3. crypto.randomInt(100000, 999999)  → e.g., 482913
     otpExpiry = Date.now() + 600000   → 10 minutes from now (ms)
  
  4. new User({ username, email, password: hash, otp: "482913",
               otpExpiry, isVerified: false })
     user.save()                       → writes to MongoDB
  
  5. sendEmail(email, 'Apollo - Verification OTP', 
              'Your verification OTP is: 482913. It expires in 10 minutes.')
     → Brevo HTTP API call (async, not awaited — doesn't block response)
  
  6. Response: 201 { message: "Signup successful. Please verify OTP.", email }

[Auth.jsx]
  → toast.success(res.message)
  → setShowOtp(true)    ← switches UI to OTP input form

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OTP VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Auth.jsx] User types "482913" and submits
  → calls verifyOtp({ email, otp: "482913" }) from api.js
  → POST /api/auth/verify-otp

[authController.js — verifyOtp()]
  1. User.findOne({ email })
     → Not found: 404

  2. user.isVerified check
     → Already verified: 400 'User already verified'
  
  3. user.otp !== "482913" OR user.otpExpiry < Date.now()
     → Invalid or expired: 400
  
  4. user.isVerified = true
     user.otp = undefined          ← clears OTP from database
     user.otpExpiry = undefined    ← clears expiry from database
     user.save()
  
  5. jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' })
     → "eyJhbGciOiJIUzI1NiIsInR..."
  
  6. Response: 200 { message, token: "eyJ...", user: { id, username, email } }

[Auth.jsx]
  → login(res.user, res.token)    ← calls AuthContext.login()
  → AuthContext stores in state + localStorage
  → navigate('/workspace')

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LOGIN (returning user)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Auth.jsx] User submits { email, password }
  → POST /api/auth/login

[authController.js — login()]
  1. User.findOne({ email })
     → Not found: 400 'Invalid credentials'
     (same error as wrong password — prevents email enumeration attack)
  
  2. bcrypt.compare(password, user.password)
     → No match: 400 'Invalid credentials'
  
  3. !user.isVerified?
     → Generate new OTP, save to DB, send email
     → Return 403 { message: '...new OTP sent', unverified: true }
  
  4. All checks passed:
     jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' })
     → 200 { message: 'Logged in successfully', token, user }

[Auth.jsx]
  → If 403 (unverified): toast.error, setShowOtp(true)
  → If 200: login(res.user, res.token), navigate('/workspace')
```

---

## 6. Request Flow: Code Execution (JavaScript vs C++)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JAVASCRIPT EXECUTION (local)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Workspace.jsx] User clicks "Run Code" with language = 'javascript'
  → runCode({ code: "console.log('hello')", language: 'javascript' })
  → POST /api/code/run

[codeController.js — runCode()]
  → calls codeRunner.executeCode(code, 'javascript')

[codeRunner.js — executeCode()]
  1. language === 'javascript' → YES
  2. tempFile = '/tmp/test_1721123456789_742.js'
  3. fs.writeFile(tempFile, "console.log('hello')")
  4. execAsync('node "/tmp/test_1721123456789_742.js"', { timeout: 5000 })
     → Node.js spawns a child process
     → Child process runs the file
     → stdout = "hello\n", stderr = ""
  5. fs.unlink(tempFile)   ← always runs in finally block
  6. Return { stdout: "hello\n", stderr: "", exitCode: 0 }

[Workspace.jsx]
  → setOutput({ stdout: "hello\n", stderr: "", exitCode: 0 })
  → Output panel displays "hello"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
C++ EXECUTION (Judge0)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Workspace.jsx] User clicks "Run Code" with language = 'cpp'
  → POST /api/code/run { code: "#include<iostream>...", language: "cpp" }

[codeRunner.js — executeCode()]
  1. language !== 'javascript' && language !== 'python' → falls through
  2. JUDGE0_LANGUAGE_MAP['cpp'] = 54
  
  3. POST https://ce.judge0.com/submissions?base64_encoded=false&wait=false
     Body: { source_code: "#include<iostream>...", language_id: 54 }
     Response: { token: "abc-xyz-123" }
  
  4. Polling loop (max 15 iterations, 1000ms sleep between each):
     GET https://ce.judge0.com/submissions/abc-xyz-123?fields=stdout,stderr,status,exit_code,compile_output
     
     Iteration 1 (1s): { status: { id: 1, description: "In Queue" } }
     Iteration 2 (2s): { status: { id: 2, description: "Processing" } }
     Iteration 3 (3s): { status: { id: 3, description: "Accepted" },
                         stdout: "Hello World\n", exit_code: 0 }
     → status.id >= 3 → BREAK
  
  5. Return { stdout: "Hello World\n", stderr: "", exitCode: 0 }
```

---

## 7. Request Flow: AI Test Generation (Non-Streaming)

This flow is different from all others — it uses a standard synchronous REST response, not SSE.

```
[Workspace.jsx — handleGenerateTests()]
  → fetchGeneratedTests({ code, language }) from api.js
  → POST /api/ai/generate-tests

[chatController.js — generateTests()]
  → generateTestsAsJson(code, language) from aiService.js

[aiService.js — generateTestsAsJson()]
  → openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: 'Return JSON with a "tests" array...' }],
      response_format: { type: "json_object" }  ← forces JSON output, NO streaming
    })
  → Waits for COMPLETE response (not streamed)
  → rawText = response.choices[0].message.content
     e.g., '{"tests":[{"inputs":"nums=[2,7], target=9","expectedOutput":"[0,1]",...}]}'
  → JSON.parse(rawText).tests  → returns array

[chatController.js]
  → res.json(tests)   ← standard JSON response, no SSE

[Workspace.jsx]
  → setTestCases(generated.map(tc => ({ ...tc, status: 'pending', actualOutput: null })))
```

**Why `response_format: json_object` here and NOT streaming?**
The test generation response is a JSON object. You cannot parse partial JSON. If you streamed `'{"te'` and tried to `JSON.parse()` it, you'd get a SyntaxError. You need the complete string before parsing. This forces us to wait for the full response and use a standard REST call rather than SSE.

---

## 8. The Frontend api.js Service Layer — Architecture

`api.js` is the **single source of truth** for all frontend-backend HTTP communication. Every component talks to the backend exclusively through this file. No component directly calls `fetch()`. This is the Service Layer pattern:

```
React Components
    │
    │  import { streamAIChat, runCode, loginUser } from '../services/api.js'
    ▼
api.js  (Service Layer)
    │
    │  All backend calls centralized here
    │  Handles: URL construction, headers, body serialization,
    │           SSE parsing, error wrapping
    ▼
Backend Express Server
```

### SSE Function Template (used by 5 functions):
All SSE streaming functions in `api.js` share this identical pattern:
```javascript
export async function streamSomething({ code, language, onChunk, onDone, onError }) {
  try {
    const response = await fetch(`${API_BASE}/api/ai/something`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language }),
    });

    if (!response.ok) throw new Error('Failed to fetch');

    const reader = response.body.getReader();          // ReadableStream reader
    const decoder = new TextDecoder('utf-8');          // Binary → string decoder
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
            if (dataStr === '[DONE]') { done = true; break; }
            const dataObj = JSON.parse(dataStr);
            onChunk(dataObj.text);                     // called per token
          }
        }
      }
    }
    onDone?.();
  } catch (error) {
    onError?.(error);
  }
}
```

### Environment URL switching:
```javascript
const API_BASE = import.meta.env.MODE === 'production'
  ? 'https://practium6.onrender.com'   // Render deployed backend
  : 'http://localhost:5000';           // Local development
```
`import.meta.env.MODE` is `'development'` when running `npm run dev`, and `'production'` when running `npm run build`. No manual switching needed.

---

## 9. The Config Layer — ai.js and db.js

### `config/ai.js` — The OpenAI Singleton:
```javascript
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default openai;
```
This creates **one** OpenAI client instance that is imported and reused by all functions in `aiService.js`. This is the **Singleton Pattern**. Creating a new `OpenAI()` client on every request would be wasteful — the client maintains connection pools and configuration state that should be shared.

### `config/db.js` — MongoDB Connection with DNS Fix:
```javascript
import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']); // Force Google DNS for querySrv resolution
```
This is a non-obvious but important line. MongoDB Atlas connection strings use a DNS SRV record (`mongodb+srv://...`). On some networks (especially corporate or certain cloud environments), the default DNS resolver returns `ECONNREFUSED` when trying to resolve SRV records. Forcing Google's public DNS servers (8.8.8.8, 8.8.4.4) bypasses this issue. Without this fix, `mongoose.connect()` would fail silently on Render's infrastructure.

---

## 10. The Middleware Chain — What Happens Before Every Request

Every request to any route passes through this chain in order:

```
Incoming HTTP Request
        │
        ▼
  1. cors()
     ─────────────────────────────────────────────────────
     Sets response headers:
       Access-Control-Allow-Origin: *
       Access-Control-Allow-Methods: GET, POST, ...
     Allows the browser to make cross-origin requests
     (React on :5173 calling Express on :5000)
     Without this: browser blocks all requests with CORS error
        │
        ▼
  2. express.json()
     ─────────────────────────────────────────────────────
     Reads the raw request body stream
     Checks Content-Type: application/json header
     Parses JSON string → JavaScript object
     Attaches to req.body
     Without this: req.body is undefined — controller crashes
        │
        ▼
  3. Router matching
     ─────────────────────────────────────────────────────
     app.use('/api/auth', authRoutes) → match?
     app.use('/api/ai', aiRoutes)     → match?
     app.use('/api/code', codeRoutes) → match?
     app.get('/health', handler)      → match?
        │
        ▼
  4. Route handler → Controller function
     ─────────────────────────────────────────────────────
     The specific function (signup, streamChat, runCode...)
     runs and sends the response
```

---

## 11. The FormalInterview Data Flow (New Feature)

This is the flow for the `FormalInterview.jsx` page — a real-time 2-person interview room.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1: Interviewer creates a room
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Interview.jsx — LOBBY phase]
  Interviewer clicks "Create Room"
  → crypto.randomUUID() generates a unique roomId
  → navigate(`/interview/join/${roomId}?host=true`)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2: FormalInterview mounts — connects Socket + gets camera
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[FormalInterview.jsx — useEffect on mount]
  const s = io(API_BASE)           ← opens WebSocket to server
  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    → localStream stored in state + localVideoRef.current.srcObject
  s.emit('join-room', roomId, s.id)  ← announces presence to server

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3: Student joins via invite link
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Server — interviewSockets.js]
  socket.on('join-room', roomId, userId)
    → socket.join(roomId)                  ← adds to room group
    → socket.to(roomId).emit('user-connected', userId, socket.id)
                                            ← tells the host someone joined

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4: WebRTC peer connection (3-way handshake)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Host — hears 'user-connected']
  createPeerConnection()  ← RTCPeerConnection with Google STUN
  pc.createOffer()        ← SDP offer (describes host's media capabilities)
  pc.setLocalDescription(offer)
  s.emit('offer', offer, roomId)  ← sends offer to student via server

[Student — hears 'offer']
  createPeerConnection()
  pc.setRemoteDescription(offer)   ← learns host's media capabilities
  pc.createAnswer()                ← SDP answer (describes student's capabilities)
  pc.setLocalDescription(answer)
  s.emit('answer', answer, roomId) ← sends answer back to host

[Both sides — ICE candidates]
  pc.onicecandidate → s.emit('ice-candidate', candidate, roomId)
  ← each side discovers its public IP via Google STUN (stun.l.google.com)
  ← exchanges candidates until a direct peer-to-peer path is found
  → pc.addIceCandidate()  ← adds received candidates
  → once both have each other's candidates: direct video/audio flows P2P
  → video appears in remoteVideoRef.current — NO server involved in media!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 5: Real-time collaboration (code + question sync)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[FormalInterview.jsx]
  Interviewer types problem in textarea:
    socketRef.current.emit('question-update', text, roomId)
    → Server broadcasts to room → Student's UI updates instantly
  
  Student types code in Monaco editor:
    socketRef.current.emit('code-change', code, roomId)
    → Server broadcasts to room → Interviewer sees code in real-time
  
  Either changes language:
    socketRef.current.emit('language-change', lang, roomId)
    → Both editors switch language simultaneously
```

**Key distinction — what goes through the server vs what doesn't:**
- `code-change`, `question-update`, `language-change` → go through Socket.io server (relayed)
- **Video and audio** → flows **directly peer-to-peer** between browsers via WebRTC after the handshake. The server is NOT involved in media streaming at all. The server only provides the signaling channel (offer/answer/ICE) to help the peers find each other.

---

## 12. Key Files to Read (In Exact Order)

Study these files in this specific order — each one makes more sense after reading the previous:

1. **[server/server.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/server/server.js)** — The entry point. Focus on `createServer`, `new Server(httpServer)`, and `httpServer.listen()`.
2. **[server/sockets/interviewSockets.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/server/sockets/interviewSockets.js)** ⭐ — *All Socket.io events. Understand join-room, WebRTC signaling relay, and code sync.*
3. **[client/src/pages/FormalInterview.jsx](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/client/src/pages/FormalInterview.jsx)** ⭐ — *The complete WebRTC + Socket.io client implementation. Read the useEffect carefully.*
4. **[server/config/ai.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/server/config/ai.js)** — The OpenAI singleton. 9 lines but conceptually important.
5. **[server/config/db.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/server/config/db.js)** — Mongoose connection with DNS fix. Understand the `dns.setServers` line.
6. **[server/routes/aiRoutes.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/server/routes/aiRoutes.js)** — See how URLs map to controller functions.
7. **[server/controllers/chatController.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/server/controllers/chatController.js)** ⭐ — *The SSE streaming loop is here. Read every line carefully.*
8. **[server/services/aiService.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/server/services/aiService.js)** ⭐ — *The async generator pattern. Understand how `yield` feeds the controller loop.*
9. **[server/controllers/authController.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/server/controllers/authController.js)** ⭐ — *The complete auth lifecycle. Read every branch.*
10. **[server/services/codeRunner.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/server/services/codeRunner.js)** ⭐ — *The dual execution engine. Understand every branch.*
11. **[client/src/App.jsx](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/client/src/App.jsx)** — Routing, ProtectedRoute, all page registrations including `/interview/join/:roomId`.
12. **[client/src/services/api.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/client/src/services/api.js)** ⭐ — *The complete frontend HTTP layer. All SSE parsing is here.*
