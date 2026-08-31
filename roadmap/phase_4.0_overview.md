# Phase 4.0 — Real-Time Communication Series: Overview & Index

> **What this file is:** This is the master overview and index for the entire Phase 4 series. Phase 4 has been split into 6 sub-phases because each communication method is deep enough to deserve its own standalone document. Read this file first — it tells you what every sub-phase covers, the priority order to read them in, and how all 5 technologies connect in the context of Apollo.

---

## Why Phase 4 Was Split

The original Phase 4 covered "SSE Token Streaming" as if it were the only real-time technology in the project. That is incomplete. Apollo uses **5 distinct live communication protocols**, each solving a different problem:

| # | Protocol | Layer | Direction | Used For |
|---|---|---|---|---|
| 1 | Server-Sent Events (SSE) | HTTP/1.1 | Server → Client (one-way) | AI token streaming |
| 2 | WebSockets (Socket.io) | TCP | Bidirectional (both ways) | Collaborative editor + WebRTC signaling |
| 3 | WebRTC | UDP / P2P | Peer ↔ Peer (no server) | Live video & audio call |
| 4 | Web Speech API | Browser native | Microphone → Browser | Voice-to-text dictation |
| 5 | HTTP Polling | HTTP/1.1 | Client → Server (repeated) | Judge0 code execution status |

Each has a completely different architecture, a different reason for being chosen, and completely different trade-offs. Understanding all 5 — and when to use each — is a senior-level expectation in any modern full-stack interview.

---

## The Phase 4 Series Map

```
Phase 4.0 ── You are here. Master overview and reading index.
    │
    ├── Phase 4.1 ── SSE: Server-Sent Events
    │                 The AI typing effect. One-directional HTTP streaming.
    │
    ├── Phase 4.2 ── WebSockets: Socket.io
    │                 Bidirectional real-time channel.
    │                 Powers collaborative editor + WebRTC signaling relay.
    │
    ├── Phase 4.3 ── WebRTC: Peer-to-Peer Video Call
    │                 How two browsers talk directly, no server in the middle.
    │                 STUN, ICE, SDP Offer/Answer handshake.
    │
    ├── Phase 4.4 ── Web Speech API
    │                 Browser-native voice-to-text. No external API needed.
    │
    ├── Phase 4.5 ── HTTP REST + Judge0 Polling
    │                 Long-polling pattern for asynchronous remote code compilation.
    │
    └── Phase 4.6 ── How All 5 Work Together
                      The complete cross-protocol flow of a FormalInterview session.
                      Where each protocol is active, which one hands off to the next.
```

---

## Phase 4.1 — SSE: Server-Sent Events
**File:** `phase_4.1_sse.md`

### What this phase will teach you:
- The problem SSE solves: why a normal `fetch()` + `response.json()` creates a 10-second blank wait for AI responses.
- What SSE actually is: a persistent HTTP connection where the server keeps writing data chunks and the browser keeps reading them.
- **The 3 mandatory response headers** (`Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`) — what each one does and what breaks if any are missing.
- **The exact SSE wire format**: `data: {...}\n\n` — the `data: ` prefix, the `\n\n` boundary, and the `[DONE]` terminal signal.
- **The `async function*` generator pattern** in `aiService.js` — what `yield` means, how the generator pauses and resumes, and why this is the right pattern for feeding a token stream.
- **The backend SSE loop** in `chatController.js`: `setHeader()` → `for await` → `res.write()` → `res.end()`.
- **The frontend `ReadableStream` consumer** in `api.js`: `response.body.getReader()` + `TextDecoder` + `while (!done)` loop.
- **The React streaming state pattern** in `Workspace.jsx`: how `setMessages(prev => [...prev])` creates the live typing effect without causing performance issues.
- **The `onChunk/onDone/onError` callback architecture** and why this is a Strategy Pattern.
- **Why `generateTests` does NOT use SSE** (`response_format: json_object` requires a full response).
- **4 production issues**: stream abandonment + AbortController fix, chunk fragmentation, header ordering, error-after-headers-sent.
- Flow diagram: from user click all the way to React DOM update.

**Key files:** `chatController.js`, `aiService.js`, `api.js`, `Workspace.jsx`
**Difficulty:** ⭐⭐⭐⭐⭐ (Senior-level)

---

## Phase 4.2 — WebSockets: Socket.io
**File:** `phase_4.2_websockets.md`

### What this phase will teach you:
- What WebSockets actually are: upgrading an HTTP connection to a raw TCP socket for full-duplex, persistent, bidirectional messaging.
- **Why Apollo uses Socket.io instead of raw WebSockets**: auto-reconnect, room abstraction, event naming, fallback polling.
- **The HTTP → WebSocket upgrade handshake**: what the `Upgrade: websocket` header does, what `101 Switching Protocols` means.
- **The `createServer()` pattern in `server.js`**: why Express alone (`app.listen()`) cannot host Socket.io, and why `http.createServer(app)` is needed.
- **Rooms**: what `socket.join(roomId)` does, what `socket.to(roomId).emit()` does vs `socket.emit()` vs `io.emit()` — differences and when to use each.
- **Every event in `interviewSockets.js`** with full annotation: `join-room`, `user-connected`, `code-change`, `language-change`, `question-update`, `user-disconnected`, `offer`, `answer`, `ice-candidate`.
- **The double role of Socket.io in Apollo**: both a real-time sync channel (editor content) AND a signaling relay for WebRTC.
- **SSE vs WebSockets** — the full decision matrix and when to use each.
- **Socket.io authentication gap**: how any user with the URL can join any room and the production fix (JWT inside `socket.handshake.auth`).
- Flow diagram: from `socket.emit()` in one browser to DOM update in the other.

**Key files:** `server/server.js`, `server/sockets/interviewSockets.js`, `client/src/pages/FormalInterview.jsx`
**Difficulty:** ⭐⭐⭐⭐

---

## Phase 4.3 — WebRTC: Peer-to-Peer Video Call
**File:** `phase_4.3_webrtc.md`

### What this phase will teach you:
- What WebRTC is: a browser-native protocol for direct peer-to-peer media streaming (video/audio) without routing media through your server.
- **Why P2P for video**: server-relayed video would require massive bandwidth and latency — WebRTC keeps it between the two browsers.
- **The 3-step WebRTC handshake (SDP Offer/Answer + ICE)**:
  - **Step 1 — Offer**: Host creates `RTCPeerConnection`, calls `createOffer()`, gets an SDP (Session Description Protocol) blob describing its media capabilities, sets it as local description, sends it to student via Socket.io.
  - **Step 2 — Answer**: Student receives offer, calls `createAnswer()`, sets it as local description, sends the answer back via Socket.io.
  - **Step 3 — ICE Candidates**: Both sides discover their public IPs via STUN, exchange candidates via Socket.io, call `addIceCandidate()`, establish a direct path.
- **What STUN is**: the Google STUN server (`stun.l.google.com:19302`) and how it solves the NAT traversal problem (your private IP `192.168.x.x` can't be contacted from outside — STUN reveals your public IP and port mapping).
- **What SDP is**: a text blob describing codecs, resolution, IP, ports — "here is what I can send and receive."
- **What ICE is**: the algorithm that finds the best path between two peers (local → STUN-discovered public → TURN relay as last resort).
- **What TURN is**: a relay server used when STUN fails (symmetric NAT) — Apollo does not use TURN (cost tradeoff).
- **`getUserMedia()`**: the browser permission to access camera and microphone, how to attach the stream to a `<video>` element.
- **`ontrack`**: how the remote video stream arrives and is displayed in `remoteVideoRef.current.srcObject`.
- **What goes through Socket.io vs what goes P2P**: signaling (offer/answer/ICE) through Socket.io → then media (video/audio) goes directly browser-to-browser.
- Flow diagram: the complete handshake sequence as a timeline.

**Key files:** `client/src/pages/FormalInterview.jsx`, `server/sockets/interviewSockets.js`
**Difficulty:** ⭐⭐⭐⭐⭐ (Most complex)

---

## Phase 4.4 — Web Speech API
**File:** `phase_4.4_web_speech.md`

### What this phase will teach you:
- What the Web Speech API is: a browser-native API that converts live microphone audio to text without any external API, network requests, or cost.
- **`window.SpeechRecognition` vs `window.webkitSpeechRecognition`**: browser compatibility — Chrome and Edge support it natively, Firefox does not.
- **Continuous mode vs one-shot mode**: `continuous: true` keeps listening until you explicitly stop; `continuous: false` stops after the first pause.
- **Interim vs final results**: interim results update as you speak (live preview); final results are committed and stable.
- **How Apollo wires it to the chat input**: voice output is appended to `chatInput` state, then the user can edit and send it.
- **`recognition.start()` and `recognition.stop()`**: the start/stop lifecycle.
- **`onresult` event**: how `event.results[i][0].transcript` gives you the recognized text at each interim step.
- **The UX pattern**: recording indicator (`isRecording` state), toast notifications if browser doesn't support it.
- **Limitations**: English-only (set via `recognition.lang = 'en-US'`), no offline mode, requires HTTPS in production.
- Flow diagram: microphone → browser engine → transcript → React state → chat input.

**Key files:** `client/src/pages/Workspace.jsx` (handleStartRecording section)
**Difficulty:** ⭐⭐

---

## Phase 4.5 — HTTP REST + Judge0 Long Polling
**File:** `phase_4.5_http_polling.md`

### What this phase will teach you:
- **The Dual-Engine Design**: why JS and Python run locally via `child_process.exec`, but C++ and Java go to the Judge0 remote sandbox API.
- **What long polling is**: repeatedly sending HTTP GET requests at a fixed interval until you get a "done" response, simulating real-time without WebSockets.
- **The Judge0 asynchronous submission model**: POST code → receive `token` → poll GET until `status_id >= 3`.
- **The full local execution flow**: `fs.writeFile(tmpFile)` → `child_process.exec("node tmpFile")` with 5s timeout → capture `stdout/stderr` → `fs.unlink(tmpFile)` in `finally` block (cleanup always runs).
- **`promisify(exec)`**: why the callback-based Node.js `exec` must be wrapped in `util.promisify` to work with `async/await`.
- **`os.tmpdir()`**: why temporary files go in the OS temp directory and not the project directory.
- **`os.platform() === 'win32'`**: cross-platform handling for `python` vs `python3` command name.
- **Judge0 status codes**: `1`=In Queue, `2`=Processing, `3`=Accepted, `4`=Wrong Answer, `5`=Time Limit Exceeded, `6`=Compilation Error.
- **The language ID map**: `java: 62`, `cpp: 54`.
- **Polling strategy**: 1000ms interval, max 15 iterations (15 second timeout).
- **The RCE vulnerability**: a user can submit `require('child_process').execSync('rm -rf /')` and it will execute on your server. Current mitigation: none (MVP). Production fix: Docker/Firecracker microVM isolation.
- Flow diagram: user submits C++ code → Judge0 POST → polling loop → response → Workspace output panel.

**Key files:** `server/services/codeRunner.js`, `server/controllers/codeController.js`, `client/src/services/api.js` (runCode), `client/src/pages/Workspace.jsx`
**Difficulty:** ⭐⭐⭐

---

## Phase 4.6 — How All 5 Protocols Work Together
**File:** `phase_4.6_all_together.md`

### What this phase will teach you:
- **The full lifecycle of a `FormalInterview` session** traced across all active protocols simultaneously: which protocol is active at which moment.
- **The Protocol Responsibility Map**: which layer "owns" which data in the interview room.
  - Socket.io owns: room join, code sync, question sync, language sync, WebRTC signaling.
  - WebRTC owns: video and audio media.
  - SSE owns: all AI-powered analysis (not present in FormalInterview, but used in the AI Interview modes).
  - Web Speech owns: voice input for question/code dictation.
  - HTTP REST owns: code execution submissions to Judge0.
- **Why these 5 coexist instead of one unified protocol doing everything**: the architectural argument for using the right tool for the right job.
- **Port sharing**: how all 5 share the same `5000` port because they use different protocol upgrade handshakes on the same TCP connection.
- **Timeline diagram**: what is happening in each protocol layer during a full 30-minute interview session.
- **The handoff sequence**: HTTP REST creates auth → Socket.io opens signaling channel → WebRTC bootstraps video → SSE streams AI hints → Web Speech inputs voice commands.
- **What a senior interviewer would ask**: cross-protocol design question answers.
- **Bandwidth breakdown**: SSE is tiny (text tokens), Socket.io is tiny (JSON events), WebRTC can be 500Kbps–2Mbps (video), REST is bursty (code submissions), Speech API uses no bandwidth.
- **Where things can go wrong across layers**: failure modes, cascade failures, and defensive patterns.

**Key files:** All files from Phases 4.1–4.5
**Difficulty:** ⭐⭐⭐⭐⭐

---

## Reading Order Recommendation

| Order | Phase | Why First |
|---|---|---|
| 1st | Phase 4.1 — SSE | Most used feature; cleanest architecture to understand first |
| 2nd | Phase 4.2 — Socket.io | Needed to understand WebRTC signaling in the next phase |
| 3rd | Phase 4.3 — WebRTC | Depends on Socket.io as its signaling channel |
| 4th | Phase 4.5 — HTTP Polling | Completely independent; easier to grasp after the harder ones |
| 5th | Phase 4.4 — Web Speech | Simplest; purely frontend; no server involvement |
| 6th | Phase 4.6 — All Together | Only makes sense after you understand each individual protocol |

---

## Files in This Phase 4 Series

| File | Contents |
|---|---|
| `phase_4.0_overview.md` | This file — master index |
| `phase_4.1_sse.md` | Server-Sent Events deep dive |
| `phase_4.2_websockets.md` | Socket.io deep dive |
| `phase_4.3_webrtc.md` | WebRTC + STUN + ICE deep dive |
| `phase_4.4_web_speech.md` | Web Speech API deep dive |
| `phase_4.5_http_polling.md` | REST + Judge0 polling deep dive |
| `phase_4.6_all_together.md` | Cross-protocol integration and interview synthesis |

---

> **Command the next file:** Tell me "generate 4.1", "generate 4.2", etc. to receive each deep-dive document in full.
