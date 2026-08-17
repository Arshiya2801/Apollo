# Apollo — Complete Interview Prep Roadmap

> **How to use this**: This is your master index. Each phase covers a distinct, well-scoped topic. Study phases in order — each one builds on the previous. When you're ready to go deep on a phase, open its dedicated `phase_X_*.md` file. The phases are ordered by interview weight, not file order.

---

## 🗂️ Master Study Order

```
Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4
 WHY &        SYSTEM       AI MODE     SSE TOKEN
 TRADEOFFS    ARCHITECTURE ENGINE &    STREAMING
 (Mental      (Full Data   PROMPTS     PIPELINE
  Model)       Flows)

Phase 5 ──► Phase 6 ──► Phase 7 ──► Phase 8
 CODE          AUTH,        REACT       UNIQUE
 EXECUTION     SECURITY &   FRONTEND    FEATURES
 SANDBOX       DATABASE     DEEP DIVE   DEEP DIVE
 (Judge0 +     (JWT + OTP               (Interview,
  local exec)   + bcrypt)               Focus, Voice,
                                        Visualizer,
                                        Profile)

Phase 9 ──► Phase 10
 SYSTEM        INTERVIEW
 DESIGN &      Q&A BANK
 SCALING       (200 Qs
                with answers)
```

---

## 📌 Phase 1 — The "WHY" Layer (Mental Model & Trade-offs)
> *The most important phase. Every technology decision you made will be challenged. Prepare the Decision → Why → Trade-off template for every single choice.*

### What You Will Learn:
- What problem Apollo solves (passive learning vs. AI-guided active mentorship)
- Why **Node.js + Express** and not Python/FastAPI or Django
- Why **MongoDB** and not PostgreSQL for chat histories and user data
- Why **OpenAI SDK** (`gpt-4o-mini`) and not the Gemini SDK (rate limits, swappable architecture)
- Why **Monaco Editor** and not CodeMirror or Ace Editor
- Why **Server-Sent Events (SSE)** for AI and not WebSockets
- Why **`child_process.exec`** (local) for JS/Python but **Judge0 API** for C++/Java
- Why **Brevo HTTP API** for email OTP instead of Nodemailer SMTP
- Why the **Mode Engine uses a Factory Pattern** and not hardcoded if/else chains
- Why **`crypto.randomInt()`** and not `Math.random()` for OTP generation
- Why **bcrypt** and not SHA-256 or plain hashing
- Why **Vite** and not Create React App (CRA) for the frontend

### Trade-offs Master Table:
| Decision | Why This | What You Gave Up |
|---|---|---|
| Node.js over Python | Unified JS stack, raw `res.write()` for SSE, no venv hell | Richer AI/ML library ecosystem in Python |
| MongoDB over PostgreSQL | Dynamic nested chat logs, no rigid schema, one-doc-per-conversation | ACID transactions, relational joins, strict typing |
| Local `exec` for JS/Python | Instant, unlimited execution (no API rate limits) | **Security** — RCE attack surface (own this!) |
| Judge0 for C++/Java | Safe sandboxed compilation, no local toolchain needed | API rate limits (~100/day free), ~1-15s latency |
| SSE over WebSockets (AI) | Stateless, HTTP/1.1 native, trivially load-balanced | Cannot interrupt mid-stream without AbortController |
| Monaco over CodeMirror | VS Code engine, superior IntelliSense, language servers | ~2MB heavier bundle vs CodeMirror's ~300KB |
| Brevo HTTP over SMTP | Port 443 always open; cloud providers block SMTP ports | Dependency on Brevo account/credits |
| gpt-4o-mini over gpt-4o | 33× cheaper, 3× faster, sufficient for code tutoring | Less accurate on deeply complex multi-step reasoning |
| JWT over Sessions | Stateless, scales horizontally | Cannot revoke server-side without a token blacklist |
| OTP over OAuth | Full control over auth flow, teaches the complete stack | More user friction than "Sign in with Google" |

### File to Glance at:
- [server/package.json](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/server/package.json) — all backend dependencies in one place
- [client/package.json](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/client/package.json) — all frontend dependencies

---

## 📌 Phase 2 — System Architecture & All Data Flows
> *Understand the big picture first — how ALL the parts connect. This is the "walk me through your architecture" question that opens 90% of interviews.*

### What You Will Learn:
- The complete 3-tier client → server → database architecture
- How `server.js` is the root entry point that mounts middleware and 3 route groups
- Every API endpoint in the project (method, URL, purpose, request/response shape)
- The complete flow for every major feature: AI chat, code execution, signup, OTP, login
- Why the frontend has a single `api.js` service file for all HTTP communication
- How the frontend uses `import.meta.env.MODE` to auto-switch between dev/prod URLs
- What happens when CORS is `cors()` with no restrictions (and why that's risky in production)
- The missing production features: no JWT middleware guard on routes, no rate limiting, no global error handler

### Architecture Diagram to Master:
```
Browser (React + Vite)
    │
    ├── /api/ai/chat      ──► SSE Stream  ─► chatController → modeEngine → aiService → OpenAI
    ├── /api/ai/explain   ──► SSE Stream  ─► chatController → aiService.streamExplanation()
    ├── /api/ai/roast     ──► SSE Stream  ─► chatController → aiService.streamRoastCode()
    ├── /api/ai/review    ──► SSE Stream  ─► chatController → aiService.streamCodeReview()
    ├── /api/ai/complexity──► SSE Stream  ─► chatController → aiService.streamComplexity()
    ├── /api/ai/generate-tests ─► REST JSON ─► chatController → aiService.generateTestsAsJson()
    ├── /api/code/run     ──► REST JSON   ─► codeController → codeRunner.executeCode()
    │                                          ├── JS/Python → child_process.exec (local)
    │                                          └── C++/Java  → Judge0 API (POST + poll GET)
    ├── /api/auth/signup  ──► REST JSON   ─► authController → bcrypt → MongoDB → Brevo
    ├── /api/auth/verify-otp ─► REST JSON ─► authController → OTP match → jwt.sign()
    └── /api/auth/login   ──► REST JSON   ─► authController → bcrypt.compare → jwt.sign()
                                                                         │
                                                                   MongoDB Atlas
```

### All Routes (Complete Table):
| Method | Endpoint | Auth Required? | Purpose |
|---|---|---|---|
| POST | `/api/auth/signup` | No | Create user, hash password, send OTP |
| POST | `/api/auth/verify-otp` | No | Verify OTP, issue JWT |
| POST | `/api/auth/login` | No | Authenticate, issue JWT |
| POST | `/api/ai/chat` | No* | Unified SSE stream for all AI modes |
| POST | `/api/ai/explain` | No* | SSE stream code explanation |
| POST | `/api/ai/complexity` | No* | SSE stream Big-O analysis |
| POST | `/api/ai/roast` | No* | SSE stream code roast |
| POST | `/api/ai/review` | No* | SSE stream code review |
| POST | `/api/ai/generate-tests` | No* | Generate 3 JSON test cases |
| POST | `/api/code/run` | No* | Execute code (local or Judge0) |
| GET | `/health` | No | Uptime health check |

*Routes have no server-side JWT middleware — frontend ProtectedRoute handles redirection only.

### Key Files (Read In Order):
1. [server/server.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/server/server.js)
2. [server/routes/aiRoutes.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/server/routes/aiRoutes.js)
3. [client/src/App.jsx](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/client/src/App.jsx)
4. [client/src/services/api.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/client/src/services/api.js) ⭐

---

## 📌 Phase 3 — The AI Mode Engine & Prompt Architecture
> *The architecturally most clever part of the project. This is what interviewers will want to explore most because it shows product thinking.*

### What You Will Learn:
- **The Factory Pattern**: `modeEngine.js` is a dictionary mapping 15+ mode keys → system prompt strings. Adding a new AI mode = adding one key to the dictionary. Zero controller changes.
- **Type 1 vs Type 2 Modes** (the fundamental split):
  - **Type 1 — Editor Modes** (9 modes): Single-shot. User submits code → one AI response. Uses `buildPrompt()` → concatenates system prompt + code into one user message.
  - **Type 2 — Chat Modes** (6 modes): Conversational, multi-turn. Uses `buildChatContents()` → builds a proper `messages` array with `system`, `context`, and full `history`.
- **Every mode and its purpose**: `explain`, `complexity`, `review`, `refactor`, `debug`, `security`, `roast`, `visualizer`, `editor_hint`, `socratic`, `hint`, `dsa`, `multilingual`, `persona_friendly`, `interview_interviewer`, `interview_evaluator`.
- **Prompt Engineering Patterns**: Word count limits ("Max 150 words"), forced output format ("First line: **Time: O(___)**"), persona enforcement, anti-solution rules for Socratic mode, severity badges (🟢🟡🔴).
- **The Code Visualizer mode** is the most complex: forces the LLM to output a strict `{ steps: [...] }` JSON with `nodes` and `edges` arrays in React Flow format.
- **The Interview Evaluator mode**: scores on 3 dimensions (Technical Correctness, Efficiency, Communication), returns **HIRED / NO HIRE** verdict.
- **Why one unified `/api/ai/chat` endpoint** for all modes instead of 15 separate endpoints.

### The Mode Registry (Frontend — modeConfig.js):
| Key | Label | Type | Purpose |
|---|---|---|---|
| `explain` | Code Explainer | Type 1 + Type 2 | Section-by-section walkthrough |
| `complexity` | Complexity | Type 1 | Big-O time and space analysis |
| `review` | Code Review | Type 1 | Bugs, anti-patterns, SOLID violations |
| `refactor` | Refactor Studio | Type 1 | Rewrites messy code as clean modern code |
| `debug` | Debug Companion | Type 1 | Finds exact buggy line, shows fix |
| `security` | Security Guardian | Type 1 | Scans for XSS, SQLi, OWASP Top 10 |
| `roast` | Roast My Code | Type 1 | Savage but educational critique |
| `visualizer` | Code Visualizer | Type 1 | Animates data structures (React Flow) |
| `editor_hint` | Get a Hint | Type 1 | One nudge, no solution |
| `socratic` | Socratic Coach | Type 2 | Responds ONLY with guiding questions |
| `hint` | Hint-First | Type 2 | Progressive hints, never full answer |
| `dsa` | DSA Learning | Type 2 | Algorithm coaching, brute-force → optimal |
| `multilingual` | Multilingual | Type 2 | Explains in any spoken language |
| `persona_friendly` | Friendly Buddy | Type 2 | Warm, encouraging, beginner-friendly |
| `interview_interviewer` | — | Type 2 | Generates DSA problems, no hints |
| `interview_evaluator` | — | Type 2 | Grades candidate, HIRED / NO HIRE verdict |

### Key Files (Read These in Full):
- [server/services/modeEngine.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/server/services/modeEngine.js) ⭐ *The heart of Apollo — read every prompt*
- [server/services/aiService.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/server/services/aiService.js) ⭐
- [client/src/modes/modeConfig.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/client/src/modes/modeConfig.js)

---

## 📌 Phase 4 — SSE Token Streaming Pipeline
> *The hardest technical concept in the project. This is a senior-level implementation. Master it completely.*

### What You Will Learn:
- **Why SSE (not WebSockets)**: SSE is unidirectional, HTTP/1.1 native, stateless, trivially load-balanced. WebSockets require persistent stateful connections — overkill for "one question in, streaming answer out".
- **The 3 magic SSE response headers**: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`. Without all 3, browsers buffer the response and it won't stream.
- **The `data: ` line protocol**: Every SSE chunk must start with `data: ` and end with `\n\n`. Terminal signal is `data: [DONE]\n\n`.
- **Async generators (`async function*`)**: `aiService.js` uses `for await...of` on the OpenAI stream and `yield`s each text token. The controller then uses another `for await...of` to consume those yields.
- **The full backend SSE loop**: How `chatController.js` calls `res.setHeader()`, then `res.write()` in an async loop, then `res.end()`.
- **The frontend `ReadableStream` reader**: `api.js` uses `response.body.getReader()` and `TextDecoder` in a `while (!done)` loop to parse incoming `data: ` lines.
- **The streaming state update pattern in React**: How `onChunk` appends to the *last message* in the `messages` array by index — creating the "typing" effect without a full re-render of the whole list.
- **What happens when the user closes the browser mid-stream**: The stream continues on the server, wasting OpenAI tokens. The production fix is `req.on('close', () => abort())` with an `AbortController`.
- **Why `generateTestsAsJson` does NOT use SSE**: Test generation uses `response_format: { type: "json_object" }` which requires the full response before it can be parsed as JSON.

### SSE Data Protocol (Exact Wire Format):
```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"text":"The"}

data: {"text":" time"}

data: {"text":" complexity"}

data: [DONE]

```

### Key Files (Read in Order):
1. [server/controllers/chatController.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/server/controllers/chatController.js) ⭐ *Lines with `res.write()` — the SSE loop*
2. [server/services/aiService.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/server/services/aiService.js) ⭐ *The `async function*` generator pattern*
3. [client/src/services/api.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/client/src/services/api.js) ⭐ *The `getReader()` → `while` loop*

---

## 📌 Phase 5 — Code Execution Sandbox (Judge0 + Local Runner)
> *The most security-sensitive part of the project. You will be directly challenged on the RCE vulnerability. Prepare an airtight defense.*

### What You Will Learn:
- **The Dual-Engine Design**: JS and Python run locally via `child_process.exec`. C++ and Java go to the Judge0 cloud API. This is a deliberate MVP tradeoff, not an oversight.
- **Why NOT Judge0 for all languages**: Judge0's free tier (~100 submissions/day) is exhausted immediately during development. JS/Python need unlimited instant execution.
- **The local execution flow step-by-step**: `fs.writeFile()` to `os.tmpdir()` → `execAsync(node "${tempFile}")` with a 5-second timeout → capture `{ stdout, stderr }` → `fs.unlink()` in `finally` block (critical: always cleans up even on error).
- **Cross-platform handling**: `os.platform() === 'win32'` selects `python` vs `python3` command.
- **`promisify(exec)`**: Why the callback-based `child_process.exec` must be promisified to work with `async/await`.
- **The Judge0 asynchronous polling architecture**: POST submission → receive `token` → poll GET every 1000ms (up to 15 iterations, 15 seconds max) → `status.id >= 3` means done → return `{ stdout, stderr, exitCode }`.
- **Judge0 status codes**: `1` = In Queue, `2` = Processing, `3` = Accepted, `4` = Wrong Answer, `5` = Time Limit Exceeded, `6` = Compilation Error, etc.
- **The language ID map**: `java: 62`, `cpp: 54` — these are Judge0 API language IDs.
- **The RCE Vulnerability and production fix**: A malicious user submits `require('child_process').execSync('rm -rf /')`. Production fix: Docker/Firecracker microVM with no network, read-only fs, 256MB RAM limit.
- **The Interview page's limited run count**: The Interview Simulator restricts users to only 3 code runs during the coding phase (`maxRuns = 3`) to simulate real interview pressure.

### Execution Decision Tree:
```
POST /api/code/run { code, language }
    │
    ├── language === 'javascript' ?
    │       → Write to /tmp/test_1234.js
    │       → execAsync(`node "/tmp/test_1234.js"`, { timeout: 5000 })
    │       → unlink temp file (finally)
    │       → Return { stdout, stderr, exitCode: 0 }
    │
    ├── language === 'python' ?
    │       → Write to /tmp/test_1234.py
    │       → execAsync(`python3 "/tmp/test_1234.py"`, { timeout: 5000 })
    │       → unlink temp file (finally)
    │       → Return { stdout, stderr, exitCode: 0 }
    │
    └── language === 'cpp' or 'java' ?
            → JUDGE0_LANGUAGE_MAP[language] → 54 (cpp) or 62 (java)
            → POST ce.judge0.com/submissions → { token: "abc-xyz" }
            → Poll GET ce.judge0.com/submissions/abc-xyz every 1s (max 15s)
            → status.id >= 3 → break
            → Return { stdout, stderr, exitCode }
```

### Key Files:
- [server/services/codeRunner.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/server/services/codeRunner.js) ⭐ *Read every single line*
- [server/controllers/codeController.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/server/controllers/codeController.js)
- [client/src/pages/Interview.jsx](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/client/src/pages/Interview.jsx) — lines 100-112 (limited run logic)

---

## 📌 Phase 6 — Authentication, Security & Database
> *Understand the complete auth lifecycle. You built the entire auth stack from scratch — this is a major talking point.*

### What You Will Learn:

#### OTP Signup Flow:
- `crypto.randomInt(100000, 999999)` → 6-digit OTP (cryptographically secure, unlike `Math.random()`)
- `bcrypt.genSalt(10)` → `bcrypt.hash(password, salt)` → stored hash (never plain password)
- `otpExpiry = Date.now() + 10 * 60 * 1000` → 10-minute OTP window
- User saved to MongoDB with `isVerified: false`
- Brevo HTTP API sends OTP email (smart fallback to Nodemailer SMTP if Brevo fails)

#### OTP Verify Flow:
- `user.otp !== otp || user.otpExpiry < Date.now()` → invalid (checks BOTH match AND expiry)
- On success: `user.otp = undefined; user.otpExpiry = undefined` → clears OTP from DB
- `jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' })` → issues 7-day token

#### Login Flow (Unverified User Edge Case):
- If user exists but `!user.isVerified`: generates a NEW OTP, saves it, sends email, returns `403 { unverified: true }`
- This prevents users who abandoned verification from being permanently locked out

#### Frontend JWT Storage:
- `AuthContext.jsx` stores JWT in `localStorage` under `'token'` key
- On app load: reads from localStorage to restore session (`useEffect` on mount)
- `login()` → writes to state + localStorage. `logout()` → clears both + redirects to `/auth`
- `ProtectedRoute` in `App.jsx` redirects to `/auth` if `user === null`

#### MongoDB Schema (User):
```javascript
{
  username: { type: String, required: true },
  email:    { type: String, required: true, unique: true },  // B-Tree index auto-created
  password: { type: String, required: true },  // bcrypt hash
  isVerified: { type: Boolean, default: false },
  otp:        { type: String },     // undefined after verification
  otpExpiry:  { type: Date },       // undefined after verification
  timestamps: true                  // createdAt, updatedAt auto-managed
}
```

#### Security Vulnerabilities to Own:
| Vulnerability | Severity | Production Fix |
|---|---|---|
| No JWT middleware on AI/code routes | High | `verifyToken` middleware on all `/api/ai/*` and `/api/code/*` routes |
| `cors()` with no origin restriction | Medium | `cors({ origin: process.env.CLIENT_URL })` |
| No rate limiting on AI endpoints | High | `express-rate-limit`: 10 req/min per IP |
| No OTP rate limiting | Medium | Max 3 OTP requests per email per 15 minutes |
| JWT in `localStorage` (XSS risk) | Medium | `HttpOnly` cookie is safer but adds complexity |
| Local `exec` RCE | Critical | Docker/Firecracker microVM isolation |

### Key Files:
- [server/controllers/authController.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/server/controllers/authController.js) ⭐ *Every line is an interview goldmine*
- [server/models/User.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/server/models/User.js)
- [server/config/db.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/server/config/db.js)
- [client/src/context/AuthContext.jsx](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/client/src/context/AuthContext.jsx)

---

## 📌 Phase 7 — React Frontend Architecture (Pages, Routing, State)
> *Understand how every page is structured, how routing and protection works, and how state flows through the app.*

### What You Will Learn:

#### Routing (App.jsx):
- `BrowserRouter` → client-side SPA routing. All navigation never reloads the page.
- `ProtectedRoute` component: checks `useAuth().user`. If `null` (not logged in), redirects to `/auth`. This is frontend-only protection — the backend routes are NOT protected by middleware.
- Route `/auth` redirects already-logged-in users to `/workspace` (already-authenticated guard).
- Route `/dashboard` redirects to `/workspace` (legacy redirect).

#### All Pages and Their Purpose:
| Route | Page | Protected? | Purpose |
|---|---|---|---|
| `/` | LandingV2 | No | Marketing page, scroll animations |
| `/auth` | Auth | No (redirect if logged in) | Signup / OTP verify / Login flow |
| `/features` | Features | No | Feature showcase with demo cards |
| `/workspace` | Workspace | ✅ Yes | Main coding workspace (Monaco + AI modes) |
| `/workspace/chat` | WorkspaceChat | ✅ Yes | Dedicated conversational AI chat workspace |
| `/roast` | Roast | ✅ Yes | Dedicated full-screen code roast page |
| `/code-review` | Review | ✅ Yes | Dedicated full-screen code review page |
| `/interview` | Interview | ✅ Yes | AI interview simulator (4-phase state machine) |
| `/focus` | Focus | ✅ Yes | Pomodoro timer + distraction-free editor |
| `/profile` | Profile | ✅ Yes | Settings, saved items, account management |

#### State Management Strategy:
- **No Redux, no Zustand** — all state is local `useState` inside each page component.
- **Global auth state only**: `AuthContext` with `createContext` + `useContext` pattern. Provides `{ user, token, login, logout }` to the whole tree.
- **localStorage persistence**:
  - `token` + `user` → authentication session across page refreshes
  - `apollo-theme` → dark/light mode preference
  - `apollo_settings` → Profile page settings (accent color, editor theme, AI preferences, etc.)

#### Workspace-Specific State (The most complex page):
- **Resizable panels**: `sidebarWidth` and `chatWidth` state tracked with `useRef` on `mousedown` / `mousemove` / `mouseup` events — fully custom drag-to-resize without any library.
- **Dark/Light mode toggle**: Updates a CSS class on `document.documentElement` and persists to `localStorage`.
- **Active mode tracking**: `activeMode` state from `EDITOR_MODES` array. Switching modes clears `messages` and `chatInput`.
- **Test case state machine**: `testCases` array with `status: 'pending' | 'passed' | 'failed'` per case. `handleGenerateTests()` fetches from AI, `handleRunTests()` executes each one and updates status.
- **Tabs**: `activeTab` tracks `'testcase'` vs `'output'` in the bottom panel.

### Key Files:
- [client/src/App.jsx](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/client/src/App.jsx) ⭐ *Routing, ProtectedRoute*
- [client/src/pages/Workspace.jsx](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/client/src/pages/Workspace.jsx) ⭐ *Biggest component — study fully*
- [client/src/pages/WorkspaceChat.jsx](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/client/src/pages/WorkspaceChat.jsx)
- [client/src/context/AuthContext.jsx](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/client/src/context/AuthContext.jsx)

---

## 📌 Phase 8 — Unique Features Deep Dive (Interview, Focus, Voice, Visualizer, Profile)
> *These are the differentiating features of Apollo. Each one has unique implementation details that interviewers will probe.*

### 8A — Interview Simulator (4-Phase State Machine)
The Interview page (`Interview.jsx`) implements a full state machine with 4 distinct phases:

```
SETUP ──► CODING ──► FOLLOWUP ──► RESULT
 │           │            │           │
Pick         45min     Follow-up    AI
difficulty   timer     Q&A chat   evaluation
& language  (counts    (3 turns)   HIRED /
            down)                  NO HIRE
```

- **SETUP Phase**: User picks difficulty (Easy/Medium/Hard) and language. The AI (`interview_interviewer` mode) hasn't been called yet.
- **CODING Phase**: `startInterview()` calls `streamAIChat` with mode `interview_interviewer`. The AI generates a Blind 75-style DSA problem. A 45-minute countdown timer runs via `setInterval` in `useEffect`. User has **only 3 code runs** (`maxRuns = 3`, `runCount` state).
- **FOLLOWUP Phase**: `handleCompleteCoding()` transitions here. The `interview_interviewer` AI asks 3 deep behavioral follow-up questions about the candidate's implementation choices.
- **RESULT Phase**: After 3 user responses, `evaluatePerformance()` is called automatically with a 1.5s delay. It calls `streamAIChat` with mode `interview_evaluator`. The evaluator receives the full problem, the candidate's code, and the entire follow-up conversation and outputs a scored verdict.

**Key interview question**: "How does the timer know when to auto-submit?" — The `useEffect` watching `phase` starts `setInterval`. When `timeLeft <= 1`, it calls `handleCompleteCoding()` and clears itself.

### 8B — Focus Mode (Pomodoro + Distraction-Free Editor)
`Focus.jsx` is a Pomodoro productivity tool with a Monaco editor:

- **4 presets**: Focus (25min), Short Break (5min), Long Break (15min), Sprint (10min).
- **Timer logic**: `setInterval` in `useEffect` watching `[isActive, activePreset]`. When timer hits 0, auto-switches preset (Focus → Short Break, Break → Focus) and increments `sessions` counter.
- **Auto-switching**: After a Focus or Sprint session completes, automatically switches to Short Break preset and resets time. After a break, switches back to Focus.
- **The session counter**: `sessions` state tracks how many completed pomodoros in the current sitting.
- **Why this feature**: Shows product thinking beyond a pure coding tool. Developers code better with structured breaks (Pomodoro Technique).

### 8C — Voice Input (Web Speech API)
Inside `Workspace.jsx`, the microphone button activates browser-native speech recognition:

- Uses `window.SpeechRecognition || window.webkitSpeechRecognition` (Chrome/Edge only — no Firefox support).
- `recognition.continuous = true` → keeps listening until `handleStopRecording()` is called.
- `recognition.interimResults = true` → shows real-time "as-you-speak" transcription in the chat input box before the final transcript is committed.
- **Interim vs Final results**: The `onresult` handler separates `isFinal` results (committed to `finalTranscript`) from interim results (shown temporarily in input). This prevents flickering.
- The voice input appends to whatever was already typed — it doesn't overwrite.
- **`recognitionRef`** (useRef): Stores the recognition instance so `handleStopRecording()` can call `.stop()` on it across renders.

**Key interview question**: "Why `useRef` for the recognition instance and not `useState`?" — Because `recognitionRef` doesn't need to trigger a re-render when it changes. It's mutable storage that persists across renders but changing it is a side effect, not a state transition.

### 8D — Code Visualizer (React Flow + AI JSON)
`CodeVisualizer.jsx` renders animated data structure visualizations:

- **How it works**: User clicks "Visualize" → `streamAIChat` with mode `visualizer` → AI returns a **strict JSON** with `{ steps: [{explanation, nodes, edges}, ...] }` in React Flow format.
- **The `visualizer` system prompt** is the most complex in the entire codebase. It instructs the AI to: output nodes with `id`, `data.label`, optional `className: "highlighted"`, and edges with `source`, `target`, `animated`, `label`.
- **Step-by-step playback**: The component plays through the `steps` array one at a time, updating the React Flow graph with each step's node/edge state.
- **The critical AI constraint**: "CRITICAL: You MUST include ALL nodes and ALL edges of the structure in EVERY step. Do not skip nodes just because they aren't changing." — This prevents the graph from having missing nodes mid-animation.
- **Pointer tracking**: Nodes representing algorithm pointers (like `curr`, `prev`, `head`) have them appended to their label: `"Value: 5\n[curr, head]"`.
- **React Flow auto-layout**: No x/y coordinates are given to the AI — the frontend uses React Flow's auto-layout engine.

### 8E — Profile Page (localStorage Settings System)
`Profile.jsx` is the largest file in the project (1197 lines, 50KB). It implements:

- **`useSettings()` custom hook**: Reads `apollo_settings` from `localStorage` on mount with `DEFAULT_SETTINGS` as fallback. Persists any changes immediately via `useEffect`.
- **`useSavedItems()` custom hook**: Manages a `savedItems` array in `localStorage`. Supports adding, removing (with `toast.success` confirmation), and displaying saved code snippets, chat sessions, and bookmarks.
- **Settings categories**: Appearance (dark mode, accent color, editor theme, font size), AI Preferences (default mode, personality, response style), Notifications (email alerts, weekly reports, session reminders), Language (app language, AI language), Security (2FA toggle — UI only, not wired to backend).
- **All settings are UI-only** (stored in `localStorage`, not persisted to MongoDB). This is an explicit MVP trade-off to own in interviews: "Settings would be persisted to the User document in MongoDB in production."
- **`react-hot-toast`**: Used throughout the Profile page for save confirmations, delete confirmations, and error feedback.

### Key Files:
- [client/src/pages/Interview.jsx](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/client/src/pages/Interview.jsx) ⭐
- [client/src/pages/Focus.jsx](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/client/src/pages/Focus.jsx)
- [client/src/pages/Workspace.jsx](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/client/src/pages/Workspace.jsx) *(lines 180-240: voice input)*
- [client/src/components/Visualizer/CodeVisualizer.jsx](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/client/src/components/Visualizer/CodeVisualizer.jsx) ⭐
- [client/src/pages/Profile.jsx](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/client/src/pages/Profile.jsx)

---

## 📌 Phase 9 — System Design & Scaling Apollo
> *Prepare the "design Apollo for N users" question. This is asked in every system design round at mid-level and above.*

### What You Will Learn:
- What breaks first at 1k, 10k, 100k, 1M users and why
- How to scale the SSE AI streaming layer horizontally
- How to add caching to slash OpenAI costs
- How to harden code execution with Docker
- How to add async job queues for long-running compilations

### Scaling Tiers:
| Scale | Bottleneck | Fix |
|---|---|---|
| 1,000 users | Nothing — single Node instance handles fine | — |
| 10,000 users | Node.js single thread CPU-bound by bcrypt + concurrent SSE streams | Multiple Node instances + PM2 cluster mode |
| 10,000 users | OpenAI API bills grow linearly | Redis Semantic Cache (cache responses to common questions) |
| 50,000 users | MongoDB Atlas free tier hits connection limits | MongoDB Atlas M10+ with connection pooling |
| 100,000 users | Local `exec` code execution is a security and resource bomb | Docker/Firecracker microVM per execution |
| 1M users | Judge0 polling is synchronous and blocks the event loop | BullMQ + Redis async job queue for code execution |
| Any scale | No rate limiting → OpenAI key drained by bots | `express-rate-limit` middleware + API key rotation |

### The Redis Semantic Cache (Know This):
Common coding questions have nearly identical phrasings. "Explain bubble sort" and "walk me through bubble sort" should return the same cached answer. Redis Semantic Cache uses vector embeddings to find semantically similar queries, returning cached responses at ~1ms instead of calling OpenAI at ~2000ms and $0.001 per request.

### Key Concepts to Study Before This Phase:
- [ ] Load balancers (round-robin vs. least-connections)
- [ ] Redis Pub/Sub
- [ ] Docker container lifecycle
- [ ] Message queues (BullMQ, RabbitMQ conceptually)
- [ ] CDN for static frontend assets

---

## 📌 Phase 10 — Interview Q&A Bank (Battle-Ready)
> *Every question you may face, organized by topic. Practice answering these out loud.*

### Questions You Will Be Able to Answer After All Phases:

**Architecture & Design (5 most likely):**
1. Walk me through the complete flow when a user clicks "Ask AI" in Socratic mode.
2. Why did you choose SSE over WebSockets for AI streaming? When would you switch?
3. You have 20 AI modes but only one `/api/ai/chat` endpoint. How?
4. What is the Factory Pattern and how did you use it in `modeEngine.js`?
5. What architectural decisions would you change if you were building this for production?

**Backend & Node.js:**
6. What happens in Node's Event Loop when `bcrypt.hash()` runs? Does it block?
7. Explain async generators (`async function*`). How does `yield` work with `for await...of`?
8. What is `promisify` and why did you need it for `child_process.exec`?
9. If a user closes their browser mid-stream, does OpenAI keep generating? Is that a problem?
10. Your AI routes have no auth middleware. How would a bot drain your OpenAI credits?

**Security:**
11. I can hack your server right now. Walk me through the RCE exploit and your fix.
12. Why is `crypto.randomInt()` safer than `Math.random()` for OTPs?
13. What attacks does `cors()` with no restriction enable?
14. JWT in localStorage vs HttpOnly cookie — explain the tradeoff.
15. Your OTP expiry check: `user.otpExpiry < Date.now()` — what unit is `otpExpiry` and why does this comparison work?

**Frontend & React:**
16. Why `useRef` for the speech recognition instance and not `useState`?
17. How do you update a streaming message without re-rendering the entire chat list?
18. Your resizable panels use mouse events — why not CSS resize? What edge cases did you handle?
19. What is the Context API pattern you used for auth? When would you switch to Redux?
20. How does `ProtectedRoute` work? Why is it frontend-only and what does that mean for security?

**AI & Prompt Engineering:**
21. Your resume says Gemini, but your code uses OpenAI. Explain.
22. How do you prevent the Socratic coach from giving away the answer if a user says "Just tell me the answer"?
23. The Code Visualizer prompt is very strict. What happens if the AI doesn't return valid JSON?
24. Why does test generation use `response_format: json_object` but AI chat uses SSE streaming?
25. How do you control hallucination in the Code Review mode?

**The Interview Simulator:**
26. Walk me through the 4-phase state machine in Interview.jsx.
27. How does the 45-minute timer trigger auto-submission when it reaches zero?
28. Why restrict users to only 3 code runs during the interview?
29. How does the `evaluatePerformance()` function get the full context of the interview?
30. What AI modes power the Interview Simulator and what is each one's job?

### Quick-Fire Answer Template (for every question):
1. **What it does** (1 sentence — the "what")
2. **Why you built it that way** (the design decision — the "why")
3. **The trade-off** (what you gave up — shows senior thinking)

---

## 📊 Priority Matrix (Study This Order)

| Phase | Difficulty | Interview Weight | Time to Study |
|---|---|---|---|
| Phase 1 — WHY & Tradeoffs | Easy | ⭐⭐⭐⭐⭐ | 2 hours |
| Phase 2 — System Architecture | Medium | ⭐⭐⭐⭐⭐ | 2 hours |
| Phase 3 — AI Mode Engine | Medium | ⭐⭐⭐⭐⭐ | 3 hours |
| Phase 4 — SSE Streaming | Hard | ⭐⭐⭐⭐⭐ | 3 hours |
| Phase 5 — Code Execution | Medium | ⭐⭐⭐⭐⭐ | 2 hours |
| Phase 6 — Auth & Security | Medium | ⭐⭐⭐⭐ | 2 hours |
| Phase 8A — Interview Simulator | Medium | ⭐⭐⭐⭐ | 1.5 hours |
| Phase 8D — Code Visualizer | Hard | ⭐⭐⭐⭐ | 1.5 hours |
| Phase 7 — React Frontend | Easy | ⭐⭐⭐ | 2 hours |
| Phase 8B/C/E — Focus, Voice, Profile | Easy | ⭐⭐⭐ | 1 hour |
| Phase 9 — System Design | Hard | ⭐⭐⭐⭐ | 2 hours |
| Phase 10 — Q&A Bank | Synthesis | ⭐⭐⭐⭐⭐ | Last — 3 hours |
