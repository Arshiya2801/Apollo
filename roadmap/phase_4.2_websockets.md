# Phase 4.2 — WebSockets & Socket.io

> **Series:** Phase 4 — Real-Time Communication in Apollo
> **What this file covers:** Everything about WebSockets and Socket.io in Apollo — what WebSockets are, how they differ from HTTP and SSE, why Socket.io is used instead of raw WebSockets, how `server.js` sets up the Socket.io server (and why `app.listen()` doesn't work here), what every single socket event in `interviewSockets.js` does, how `FormalInterview.jsx` connects and uses Socket.io on the frontend, the room system, and every production issue you need to defend.

---

## 1. What is a WebSocket? — Starting From Zero

**WebSocket** is a communication protocol that lets a browser and a server talk to each other **both ways, at the same time, over a single persistent connection**.

### The Mental Model

Think about how normal HTTP works vs WebSocket:

**Normal HTTP (Like sending letters):**
- You write a letter (request), seal it, send it to the server.
- The server writes back (response), sends it to you.
- The conversation is over. Both mailboxes close.
- Next time you want to talk, you open a new mailbox from scratch.

**WebSocket (Like a phone call):**
- You dial (connect). The line opens.
- You can talk anytime. The server can talk anytime.
- Neither side needs to "start" the conversation — both can send freely.
- The line stays open until one of you hangs up.

```
Normal HTTP:
  Browser ──[Request]──► Server
  Browser ◄──[Response]── Server
  Connection closes. Next request starts fresh.

WebSocket:
  Browser ──[Connect]──► Server
  ← Phone line stays open →
  Browser ──[send: "hello"]──► Server    (any time)
  Browser ◄──[send: "world"]── Server    (any time)
  Browser ──[send: "code changed"]──► Server
  Browser ◄──[send: "peer joined"]── Server
  Browser ──[Disconnect]──► Server
```

---

## 2. SSE vs WebSocket — Apollo Uses Both, Here's Why

In Apollo, **SSE** and **WebSocket** exist side by side. They solve different problems.

| | SSE | WebSocket (Socket.io) |
|---|---|---|
| **Direction** | Server → Client only | Both directions simultaneously |
| **Protocol** | Regular HTTP/1.1 | HTTP upgrade → then TCP directly |
| **Persistence** | One-time stream per request | Long-lived connection (stays open) |
| **Use in Apollo** | AI token streaming | Collaborative editor + video signaling |
| **Why perfect for its use case** | AI just streams one answer out | Both users need to send data to each other constantly |

**Plain English:**
- **SSE** is used when the **server** is the only one sending data (AI words flowing to the user).
- **WebSocket** is used when **both sides** need to send data (student types code → server sends it to interviewer; interviewer types question → server sends it to student).

---

## 3. Why Socket.io and Not Raw WebSockets?

The browser has a built-in `WebSocket` class. Apollo uses **Socket.io** — a library built on top of raw WebSockets. Here's why:

| Feature | Raw WebSocket | Socket.io |
|---|---|---|
| **Auto-reconnect** | ❌ Must implement yourself | ✅ Built-in automatic reconnect |
| **Named events** | ❌ Just raw messages (strings/bytes) | ✅ Named events like `'code-change'`, `'offer'` |
| **Rooms** | ❌ Must track yourself | ✅ Built-in `socket.join(roomId)` |
| **Broadcasting** | ❌ Must loop through all connections | ✅ `socket.to(roomId).emit(...)` |
| **Fallback** | ❌ Fails if WebSocket blocked | ✅ Falls back to HTTP long-polling |
| **Cross-browser** | ❌ Some edge cases exist | ✅ Handles all browsers |

**The short answer:** Socket.io adds the "rooms", "named events", and "auto-reconnect" features that any real app needs — without you writing them all from scratch.

---

## 4. How the HTTP → WebSocket Upgrade Works

This is what happens when the browser first connects to Socket.io:

```
STEP 1: Browser sends a special HTTP request asking to "upgrade"
  GET /socket.io/?... HTTP/1.1
  Upgrade: websocket          ← "I want to switch protocols"
  Connection: Upgrade
  Sec-WebSocket-Key: xyz...   ← A security handshake key

STEP 2: Server agrees and switches protocols
  HTTP/1.1 101 Switching Protocols  ← "I agree, switching now"
  Upgrade: websocket
  Connection: Upgrade
  Sec-WebSocket-Accept: abc...      ← Server's handshake response

STEP 3: HTTP is gone. Raw TCP WebSocket connection is active.
  From now on: both sides send raw WebSocket frames directly.
  No HTTP headers, no new requests. Just live two-way messages.
```

**Why does this matter?** It explains why Socket.io still uses port `5000` (same as HTTP) — it starts as HTTP, then upgrades to a raw TCP socket on the same port. The browser and server share the same physical port for two completely different protocols.

---

## 5. The `createServer` Pattern in `server.js` — The Critical Change

This is the most common interview question about this part of Apollo.

### Why `app.listen()` doesn't work with Socket.io:

```javascript
// ❌ Old way (what Apollo used to do):
const app = express();
app.listen(5000);
// This creates an INTERNAL http.Server inside Express.
// Socket.io cannot access that internal server to attach to it.
// Socket.io and Express would be on DIFFERENT servers — impossible to share the same port.
```

```javascript
// ✅ New way (what Apollo does now — server.js lines 19-25):
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
//                ↑ We create the raw Node.js HTTP server ourselves
//                  and wrap Express inside it.
//                  Now we hold the reference to the HTTP server.

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});
//  ↑ Socket.io attaches itself to the SAME httpServer.
//    Now HTTP and WebSocket traffic both flow through port 5000.

httpServer.listen(5000);
//  ↑ We start the server ourselves (not app.listen!)
```

**In simple English:**
- `app.listen()` is like letting Express handle the door of the building. Express holds the key and won't let Socket.io in.
- `createServer(app)` is like building the door yourself, and then giving BOTH Express and Socket.io copies of the key. They both live in the same building on the same floor.

---

## 6. How Socket.io is Initialized — `server.js` Full Walk

```javascript
// server.js — Complete annotated version

import express from 'express';
import { createServer } from 'http';       // Step 1: Import raw HTTP module
import { Server } from 'socket.io';        // Step 2: Import Socket.io

import initInterviewSockets from './sockets/interviewSockets.js';

const app = express();
const httpServer = createServer(app);      // Step 3: Wrap Express in HTTP server
const io = new Server(httpServer, {        // Step 4: Attach Socket.io to same server
  cors: {
    origin: '*',             // Allows any browser origin to connect via WebSocket
    methods: ['GET', 'POST'] // Allowed HTTP methods for the upgrade request
  }
});

// Express middleware and routes registered normally on 'app'...
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/code', codeRoutes);

// Step 5: Register all Socket.io event handlers
initInterviewSockets(io);
// ↑ Passes the 'io' server to interviewSockets.js
//   interviewSockets.js registers all the socket.on() listeners

// Step 6: Start the server (NOT app.listen!)
httpServer.listen(PORT, () => {
  console.log(`Apollo server running on port ${PORT}`);
});
```

---

## 7. `interviewSockets.js` — Every Event Explained

This is the **entire WebSocket backend** of Apollo. Only 48 lines. Let's walk through every event.

```javascript
export default function initInterviewSockets(io) {
  io.on('connection', (socket) => {
  //      ↑ Fires every time ANY new browser connects via Socket.io
  //        'socket' represents this one specific connected user
  //        Every user gets their own unique socket.id (like a temporary ID card)

    console.log(`User connected: ${socket.id}`);
```

---

### Event 1: `join-room` — Entering the Interview Room

```javascript
    socket.on('join-room', (roomId, userId) => {
    //  ↑ Client sends: "I want to join room 'room-abc-123' with userId 'xyz'"

      socket.join(roomId);
      //  ↑ Socket.io puts this socket into a named group called "room-abc-123"
      //    Think of it like joining a group chat.
      //    Messages sent to this room will only go to people in it.

      socket.to(roomId).emit('user-connected', userId, socket.id);
      //  ↑ Tells EVERYONE ELSE in the room: "A new user just joined!"
      //    (The new user themselves does NOT receive this — socket.to() excludes the sender)
```

**Plain English:** Student opens the invite link → their browser emits `join-room` → server adds them to the room → server tells the interviewer (already in the room): *"Someone just joined!"*

---

### Event 2: `disconnect` — Leaving the Room

```javascript
      socket.on('disconnect', () => {
        socket.to(roomId).emit('user-disconnected', userId, socket.id);
        //  ↑ When this user's connection drops (tab closed, internet lost, etc.),
        //    tell everyone else in the room: "This user left."
      });
```

**Plain English:** If the student closes their tab, the interviewer's UI shows *"Peer disconnected"* and their video box goes blank.

---

### Events 3, 4, 5: WebRTC Signaling (The 3-Step Handshake)

These three events don't contain any interview/collaboration logic — they are a **pure relay service** for WebRTC. The Socket.io server is just passing packages between the two browsers so they can establish a direct video call. (Full detail in Phase 4.3.)

```javascript
    socket.on('offer', (offer, roomId) => {
      socket.to(roomId).emit('offer', offer, socket.id);
      // ↑ Interviewer sends their video "offer" to the server.
      //   Server forwards it to the student.
      //   Server does NOT understand or process the offer — just relays it.
    });

    socket.on('answer', (answer, roomId) => {
      socket.to(roomId).emit('answer', answer, socket.id);
      // ↑ Student receives the offer, creates an "answer", sends it.
      //   Server forwards it back to the interviewer.
    });

    socket.on('ice-candidate', (candidate, roomId) => {
      socket.to(roomId).emit('ice-candidate', candidate, socket.id);
      // ↑ Both sides send their network addresses (ICE candidates) to each other
      //   via the server, until a direct P2P path is found.
      //   After this, video flows browser-to-browser without the server.
    });
```

**Plain English:** The server is like a meeting arranger. It introduces the interviewer and student to each other by passing their contact info (offer/answer/ICE). Once they have each other's info, they call each other directly — the server is no longer involved in the video call.

---

### Events 6, 7: Code & Language Synchronization

```javascript
    socket.on('code-change', (code, roomId) => {
      socket.to(roomId).emit('code-change', code);
      // ↑ Student types in the Monaco editor → emits 'code-change' with full code string
      //   Server broadcasts it to the interviewer
      //   Interviewer's Monaco editor shows the exact same code in real-time
    });

    socket.on('language-change', (language, roomId) => {
      socket.to(roomId).emit('language-change', language);
      // ↑ Either user changes the language dropdown (JavaScript → Python)
      //   Server broadcasts it to the room
      //   Both editors switch language simultaneously
    });
```

**Plain English:** Every keystroke in the student's editor travels to the interviewer's screen within milliseconds — like Google Docs live collaboration but for code.

---

### Event 8: Question Synchronization

```javascript
    socket.on('question-update', (questionText, roomId) => {
      socket.to(roomId).emit('question-update', questionText);
      // ↑ Interviewer types the DSA problem in their question panel
      //   Server broadcasts it to the student
      //   Student's problem panel updates live as the interviewer types
    });
```

**Plain English:** The interviewer types "Given a linked list, reverse it..." and the student sees the problem appear on their screen word-by-word in real time.

---

## 8. The Frontend — `FormalInterview.jsx` Socket Setup

```javascript
// FormalInterview.jsx — Lines 56-75

useEffect(() => {
  const s = io(API_BASE);
  //          ↑ Opens a Socket.io connection to the backend
  //            API_BASE = 'http://localhost:5000' (dev) or Render URL (prod)
  //            Socket.io automatically handles the HTTP → WebSocket upgrade

  setSocket(s);
  socketRef.current = s;
  //  ↑ Saved in BOTH state and a ref.
  //    State so React knows about the socket.
  //    Ref so event handlers (closures) can access the LATEST socket without re-registering.

  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
      setLocalStream(stream);
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      //  ↑ Attach camera/mic stream to the <video> element on the page (your own face)

      s.emit('join-room', roomId, s.id);
      //  ↑ Only join the room AFTER media is ready
      //    This ensures when the WebRTC offer/answer starts, your camera stream exists
    })
    .catch(err => {
      s.emit('join-room', roomId, s.id);
      //  ↑ Even if camera is denied, still join the room
      //    User can still participate in code collaboration (without video)
    });

  // Cleanup when user leaves the page
  return () => {
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    //  ↑ Turn off camera and microphone to free hardware resources
    peerConnectionRef.current?.close();
    //  ↑ Close the WebRTC connection
    s.disconnect();
    //  ↑ Cleanly disconnect from Socket.io (triggers 'disconnect' event on server)
  };
}, [roomId]);
```

---

## 9. How Code Sync Works (Client Side)

When the student types in the Monaco editor:

```javascript
// FormalInterview.jsx — code editor onChange handler
const handleCodeChange = (newCode) => {
  setCode(newCode);
  // ↑ Update local React state (shows in your own editor)

  socketRef.current.emit('code-change', newCode, roomId);
  // ↑ Immediately emit the full code string to the server
  //   Server broadcasts it to everyone else in the room
  //   Interviewer's editor is updated via the 'code-change' listener:
};

// Listener set up in useEffect:
s.on('code-change', (newCode) => setCode(newCode));
// ↑ When server sends 'code-change', update the local state
//   React re-renders the Monaco editor with the new code
```

**Important note:** Apollo sends the **full code string** every keystroke — not just the character that changed. This is called "full state sync" and is simpler to implement than "delta sync" (sending only the diff). For large codebases, delta sync (like Operational Transforms in Google Docs) would be more bandwidth-efficient.

---

## 10. The Room System — How `socket.join()` Works

The room system is the most important Socket.io concept. Without it, every message would go to ALL users on the server — not just the people in one interview session.

```
Without rooms (BAD):
  Student A types code → io.emit('code-change') → ALL users on the server see it
  100 different interview sessions all interfere with each other!

With rooms (CORRECT):
  Student A types code → socket.to('room-abc').emit('code-change')
  Only the interviewer in room 'room-abc' receives it.
  Student B in 'room-xyz' is completely unaffected.
```

**Socket.io emit variations — know all four:**

| Method | Who receives it |
|---|---|
| `socket.emit('event', data)` | Only you (the sender) |
| `socket.to(roomId).emit('event', data)` | Everyone in the room EXCEPT the sender |
| `io.to(roomId).emit('event', data)` | Everyone in the room INCLUDING the sender |
| `io.emit('event', data)` | Every connected user on the entire server |

In Apollo, **`socket.to(roomId).emit()`** is used for everything — because you never want to receive your own code-change or your own question-update back.

---

## 11. The Complete WebSocket Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  APOLLO WEBSOCKET FLOW — FormalInterview Session                               │
└────────────────────────────────────────────────────────────────────────────────┘

PHASE 1: CONNECTION SETUP
──────────────────────────────────────────────────────────────────────
[Interviewer Browser]                    [Apollo Server - server.js]
  io(API_BASE) ──────────────────────────► io.on('connection', socket)
  Camera: getUserMedia() starts           socket.id = 'ABC'
  s.emit('join-room', 'room-123', 'ABC') ►socket.join('room-123')
                                           Room 'room-123' = [ABC]

[Student Browser]
  io(API_BASE) ──────────────────────────► io.on('connection', socket)
  Camera: getUserMedia() starts           socket.id = 'XYZ'
  s.emit('join-room', 'room-123', 'XYZ') ►socket.join('room-123')
                                           Room 'room-123' = [ABC, XYZ]
                                           socket.to('room-123').emit('user-connected')
[Interviewer]◄──────────────────────────── 'user-connected' event fires
  → Starts WebRTC handshake

PHASE 2: WEBRTC SIGNALING (Relay through Socket.io)
──────────────────────────────────────────────────────────────────────
[Interviewer] s.emit('offer', sdpOffer) ►socket.to(room).emit('offer')
                                         [Student]◄── receives offer
[Student] s.emit('answer', sdpAnswer) ──►socket.to(room).emit('answer')
                                         [Interviewer]◄── receives answer
[Both] s.emit('ice-candidate', cand) ───►socket.to(room).emit('ice-candidate')
       [Both sides receive each other's candidates]
       → Direct WebRTC video call established! (Socket.io no longer involved in video)

PHASE 3: LIVE COLLABORATION (Real-time sync)
──────────────────────────────────────────────────────────────────────
[Student types code] ──────────────────────────────────────────────►
  s.emit('code-change', 'function sum..', 'room-123')
         ↓
  [Server] socket.to('room-123').emit('code-change', 'function sum..')
         ↓
  [Interviewer] receives 'code-change' → setCode('function sum..')
  → Monaco editor updates live ◄──────────────────────────────────────

[Interviewer types question] ──────────────────────────────────────►
  s.emit('question-update', 'Reverse a linked list', 'room-123')
         ↓
  [Server] socket.to('room-123').emit('question-update', 'Reverse a linked list')
         ↓
  [Student] receives 'question-update' → setQuestion('Reverse a linked list')
  → Problem panel updates live ◄──────────────────────────────────────

PHASE 4: DISCONNECTION
──────────────────────────────────────────────────────────────────────
[Student closes tab]
  s.disconnect() ─────────────────────────────────────────────────►
  [Server] socket 'disconnect' fires
           socket.to('room-123').emit('user-disconnected')
  [Interviewer] receives 'user-disconnected'
  → Video box goes blank → RTCPeerConnection closes
```

---

## 12. `socketRef` vs `socket` State — Why Both Exist

In `FormalInterview.jsx`, notice the socket is stored in **two places**:

```javascript
const [socket, setSocket] = useState(null);  // React state
const socketRef = useRef(null);              // Ref
```

**Why?**

Socket.io event listeners (like `s.on('user-connected', ...)`) are **closures** — they capture the variables from when they were created. If they capture `socket` from React state, they get a stale version from the time the listener was registered.

**`socketRef`** is a mutable ref — it always points to the current value regardless of when the closure was created. Code that needs the socket inside event handlers uses `socketRef.current` to avoid stale closure bugs.

| | `socket` state | `socketRef.current` |
|---|---|---|
| **Used by** | React rendering, conditional checks | Event handlers inside useEffect closures |
| **Updates** | Triggers re-render | Does NOT trigger re-render |
| **Stale closure risk** | ❌ Yes — closures capture old state | ✅ No — always current value |

---

## 13. Production Issue — No Authentication on Socket.io

**The problem:** Right now, any user who knows a `roomId` can join any interview room. The server does not verify who they are before allowing `socket.join(roomId)`.

```javascript
// Current (insecure):
socket.on('join-room', (roomId, userId) => {
  socket.join(roomId);  // ← No verification whatsoever
});
```

**What a malicious user could do:**
- Open the browser console.
- Run `io('http://your-server.com').emit('join-room', 'room-xyz', 'hacker')`.
- Listen to all code changes, questions, and WebRTC signals in that private interview.

**Production fix:**
```javascript
// Secure version — verify JWT on connection:
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;  // Attach verified user to socket
    next();
  } catch {
    next(new Error('Authentication error'));
  }
});

// Then in join-room:
socket.on('join-room', (roomId) => {
  // socket.user is now guaranteed to be a verified, authenticated user
  socket.join(roomId);
  socket.to(roomId).emit('user-connected', socket.user.username, socket.id);
});
```

**How the frontend sends the token:**
```javascript
const s = io(API_BASE, {
  auth: { token: localStorage.getItem('apollo_token') }
});
```

---

## 14. Key Files for This Phase

| File | What to Focus On |
|---|---|
| [server/server.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/server/server.js) ⭐ | `createServer(app)`, `new Server(httpServer)`, `initInterviewSockets(io)`, `httpServer.listen()` — understand why each line exists |
| [server/sockets/interviewSockets.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/server/sockets/interviewSockets.js) ⭐ | All 8 events. For each: who emits it, what the server does with it, who receives it. |
| [client/src/pages/FormalInterview.jsx](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/client/src/pages/FormalInterview.jsx) ⭐ | `io(API_BASE)` setup, `s.emit('join-room')`, all `s.on()` listeners, `socketRef` vs `socket` state, cleanup function |

---

## 15. Interview Questions — Own These Answers

**Q1: "Why does Apollo use `createServer(app)` instead of `app.listen()`?"**
> When you call `app.listen()`, Express creates an internal HTTP server that you have no reference to. Socket.io needs to attach to the same HTTP server to share the same port. By calling `createServer(app)` ourselves, we hold the reference to the HTTP server and can pass it to both `new Server(io)` (Socket.io) and `httpServer.listen()`. Both HTTP and WebSocket traffic now share port 5000.

**Q2: "What is `socket.to(roomId).emit()` and how is it different from `io.emit()`?"**
> `socket.to(roomId).emit()` sends a message to everyone in a specific room EXCEPT the sender. `io.emit()` sends to every connected user on the entire server regardless of room. In Apollo, `socket.to(roomId)` is always used so that code changes and question updates only reach the other person in the same interview session.

**Q3: "Why does Socket.io need the HTTP → WebSocket upgrade?"**
> WebSocket is a different protocol from HTTP. To establish a WebSocket connection, the browser sends a standard HTTP request with special headers (`Upgrade: websocket`, `Connection: Upgrade`). The server responds with `101 Switching Protocols`, and from that point, the TCP connection switches from HTTP to raw WebSocket frames. Socket.io handles this upgrade internally — the developer just calls `io(url)`.

**Q4: "What happens if the student closes their tab during the interview?"**
> The browser calls `s.disconnect()` (either explicitly from cleanup, or Socket.io detects the closed connection). On the server, the `disconnect` event fires inside the `join-room` handler's scope. The server emits `user-disconnected` to everyone else in the room. On the interviewer's side, the `user-disconnected` listener sets `remoteVideoRef.current.srcObject = null` (video goes blank), sets `remoteStream` to null, and closes the `RTCPeerConnection`.

**Q5: "What are the two roles of Socket.io in the FormalInterview feature?"**
> Socket.io plays two completely different roles simultaneously. First, it is a **real-time state synchronization channel** — it keeps the code editor, language selector, and question panel synchronized between interviewer and student in real time. Second, it is a **WebRTC signaling relay** — it passes SDP offers, answers, and ICE candidates between the two browsers during the WebRTC handshake so they can establish a direct peer-to-peer video call. After the WebRTC handshake completes, Socket.io is no longer involved in the video stream.

**Q6: "Why is there no authentication on Socket.io in Apollo?"**
> This is an MVP gap. Currently any user who knows the roomId can join any interview room. The production fix is using Socket.io middleware (`io.use()`) to verify a JWT token from `socket.handshake.auth.token` before allowing any connection to proceed.
