# Phase 4.3 — WebRTC: Peer-to-Peer Video Call

> **Series:** Phase 4 — Real-Time Communication in Apollo
> **What this file covers:** Everything about WebRTC in Apollo — what it is, why video goes peer-to-peer instead of through the server, what STUN/ICE/SDP are in simple terms, the complete 3-step handshake (Offer → Answer → ICE), every line of the WebRTC code in `FormalInterview.jsx`, what `getUserMedia` is, how the video stream attaches to a `<video>` element, and what TURN is (and why Apollo doesn't use it).

---

## 1. What is WebRTC? — Starting From Zero

**WebRTC (Web Real-Time Communication)** is a browser-native technology that lets two browsers talk **directly to each other** — streaming audio and video without any server in the middle.

### The Mental Model

Without WebRTC, video calling would look like this:

```
Normal video call (server-relayed):
  You ──[video]──► Server ──[video]──► Friend

  Problems:
  - Server pays for ALL the bandwidth (expensive)
  - Server must encode/decode video (CPU intensive)
  - Extra server hop adds 100-300ms of delay
  - Doesn't scale — 1000 simultaneous calls = massive server cost
```

With WebRTC:
```
WebRTC (peer-to-peer):
  You ──────────────────────────────────► Friend
        Direct browser-to-browser video

  Benefits:
  - Server pays zero bandwidth for video
  - No encoding/decoding on server
  - Lowest possible latency (no extra hop)
  - Scales to millions — each pair is independent
```

**In Apollo:** When an interviewer and student video call each other, their video streams travel **directly browser to browser**. Apollo's server (`server.js`) is NOT involved in carrying the video data. The server's only job was to introduce the two browsers to each other (via Socket.io signaling). Once they know each other's addresses, they talk directly.

---

## 2. The Big Problem WebRTC Solves — And Why It's Hard

Connecting two browsers directly sounds simple, but there is one massive obstacle: **NAT (Network Address Translation)**.

### What is NAT? (Simple Version)

Your home Wi-Fi router gives your laptop a private IP address like `192.168.1.5`. But the outside world cannot reach you at `192.168.1.5` — that address is private and invisible from the internet.

Your actual public IP (what the internet sees) might be `203.0.113.42` — that's your router's IP, shared by all devices on your home network.

```
The Internet
     │
     ▼
Your Router: 203.0.113.42 (public — internet can reach this)
     │
     ├─ Your Laptop:  192.168.1.5 (private — internet CANNOT reach this)
     ├─ Your Phone:   192.168.1.6 (private — internet CANNOT reach this)
     └─ Your TV:      192.168.1.7 (private — internet CANNOT reach this)
```

**The Problem for WebRTC:** If two users are both behind NAT, Browser A doesn't know Browser B's public IP. And even if it did, it wouldn't know which device behind that router is the right one, or which port to use. They can't find each other.

**The Solution: STUN Servers** — used by Apollo to solve this.

---

## 3. What is STUN? — The "Tell Me My Own Address" Service

**STUN (Session Traversal Utilities for NAT)** is a tiny, simple server whose only job is to tell you your own public IP address and port as seen from the outside internet.

```
Browser A asks STUN server: "What is my public IP and port?"
STUN server replies:         "You look like 203.0.113.42:54321"

Browser B asks STUN server: "What is my public IP and port?"
STUN server replies:         "You look like 198.51.100.7:49152"
```

Now both browsers know each other's public addresses. They can try to connect directly.

**Apollo's STUN configuration in `FormalInterview.jsx` (lines 9-14):**
```javascript
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};
```

- `stun.l.google.com:19302` — Google's free, public STUN server.
- Two servers listed as redundancy in case one is unreachable.
- Apollo pays $0 for STUN — Google provides this for free.

**Important:** STUN only helps in ~80% of cases (simple NAT setups). When both users are behind "Symmetric NAT" (like strict corporate firewalls), STUN doesn't work. In that case, a **TURN server** is needed (see Section 5).

---

## 4. The Three Key Concepts: SDP, ICE, and the Handshake

Before the code walk, you need to understand three terms. Interviewers love asking about these.

### SDP — Session Description Protocol

**What it is:** A text-based document that describes one browser's **media capabilities**.

**What it contains (in plain English):**
- *"I can send video in H.264 and VP8 format."*
- *"I can send audio in Opus codec."*
- *"I want to receive up to 720p resolution."*
- *"My network paths to try are..."*

**Think of it like:** A CV/resume for a browser's media capabilities. Browser A writes its CV (the Offer). Browser B reads it, writes its own CV back (the Answer). Now both know exactly how to talk to each other.

### ICE — Interactive Connectivity Establishment

**What it is:** The algorithm that finds the **best network path** between two browsers.

**What ICE candidates are:** A list of possible network addresses and ports that Browser A can be reached at. Each "candidate" is one possible path:

```
candidate 1: 192.168.1.5:54321          (local network address)
candidate 2: 203.0.113.42:54321         (STUN-discovered public address)
candidate 3: 203.0.113.42:54322         (another port mapping)
```

Both browsers collect all their candidates and send them to each other. ICE then tries all combinations to find the one that actually works (fastest, most direct).

**Think of it like:** Browser A gives Browser B 3 phone numbers. Browser B tries calling all 3 and sees which one actually connects. The successful number becomes the active path.

### The 3-Step Handshake

```
Step 1 — OFFER:
  Browser A (Interviewer) says:
  "Here is my SDP — my media capabilities and initial network info."
  Sends it to Browser B via Socket.io.

Step 2 — ANSWER:
  Browser B (Student) reads the Offer, responds:
  "Here is MY SDP — what I can match from your capabilities."
  Sends it back to Browser A via Socket.io.

Step 3 — ICE CANDIDATES:
  Both browsers independently discover their network paths via STUN.
  They send each path to the other via Socket.io.
  ICE tries all combinations.
  Best path found → Direct connection established.
  VIDEO AND AUDIO NOW FLOW PEER-TO-PEER.
```

---

## 5. What is TURN? (And Why Apollo Doesn't Use It)

When STUN fails (both users behind strict symmetric NAT, like corporate firewalls), a **TURN server (Traversal Using Relays around NAT)** acts as a relay between the two browsers.

```
Without TURN (STUN sufficient):
  Browser A ◄──────────────────────────────────► Browser B
                Direct P2P connection

With TURN (when STUN fails):
  Browser A ──[video]──► TURN Server ──[video]──► Browser B
               Relayed connection (server in the middle)
```

**Why Apollo doesn't use TURN:**
- TURN servers are expensive — they pay for all the video bandwidth.
- For an MVP, the cost is not justified.
- STUN works for most home internet connections (~80% of cases).
- Corporate/university firewalls (where TURN is needed) are edge cases for Apollo's target users.

**Production addition:** A proper deployment would add a self-hosted or cloud TURN server (like Coturn) to handle the remaining 20% of cases.

---

## 6. The Complete WebRTC Code Walk — `FormalInterview.jsx`

### Step 1: Ask the Browser for Camera and Microphone

```javascript
// FormalInterview.jsx — Lines 62-75
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
//                     ↑
//  This is the browser API that asks the user:
//  "This site wants to access your camera and microphone. Allow?"
//  The user sees a permission popup in the browser.

  .then(stream => {
  // ↑ If user clicks "Allow", 'stream' is a MediaStream object
  //   containing both a video track and an audio track.

    setLocalStream(stream);
    localStreamRef.current = stream;
    // ↑ Save the stream in both state and a ref
    //   (state for React UI, ref for use inside closures)

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      // ↑ Attach the stream to the <video> element on the page.
      //   This is your own face — what you see in the bottom video box.
      //   Note: the <video> element has 'muted' so you don't hear yourself.
    }

    s.emit('join-room', roomId, s.id);
    // ↑ Only join the Socket.io room AFTER getting camera.
    //   If we joined before, the interviewer would receive 'user-connected'
    //   and try to start WebRTC before we have a camera stream. Race condition!
  })

  .catch(err => {
    console.error('Failed to get media devices:', err);
    s.emit('join-room', roomId, s.id);
    // ↑ Even if camera permission is denied or hardware fails,
    //   still join the room so collaboration works (code editor, chat).
    //   The user just won't have video.
  });
```

**The `<video>` elements in the JSX:**
```jsx
{/* Your own face — muted so you don't hear yourself */}
<video ref={localVideoRef} autoPlay playsInline muted
       style={{ transform: 'scaleX(-1)' }} />
//     ↑ scaleX(-1) mirrors the image so it looks natural (like a mirror)

{/* The other person's face */}
<video ref={remoteVideoRef} autoPlay playsInline />
```

---

### Step 2: Create the RTCPeerConnection

```javascript
// FormalInterview.jsx — Lines 78-102
const createPeerConnection = () => {
  const pc = new RTCPeerConnection(rtcConfig);
  //          ↑ RTCPeerConnection is the browser's built-in WebRTC engine.
  //            rtcConfig contains the STUN servers to use for ICE.
  //            This creates a WebRTC connection object — not connected yet, just initialized.

  // Add local camera/mic tracks to the connection
  if (localStreamRef.current) {
    localStreamRef.current.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current);
      // ↑ Tell the WebRTC engine: "When you connect to the other browser,
      //   include this video track and this audio track in the stream."
      //   getTracks() returns [videoTrack, audioTrack]
    });
  }

  // When the other browser's video/audio arrives
  pc.ontrack = (event) => {
  //  ↑ This fires when the REMOTE browser's video/audio tracks arrive.
  //    After the handshake completes and the P2P connection is active.

    setRemoteStream(event.streams[0]);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = event.streams[0];
      // ↑ Attach the REMOTE stream to the second <video> element.
      //   This is the other person's face appearing on your screen.
    }
  };

  // When ICE discovers a network path to try
  pc.onicecandidate = (event) => {
  //  ↑ This fires every time ICE discovers one possible network path.
  //    It can fire many times — once per candidate found.

    if (event.candidate) {
      s.emit('ice-candidate', event.candidate, roomId);
      // ↑ Send this candidate to the other browser via Socket.io.
      //   The other browser adds it to their list of paths to try.
    }
  };

  return pc;
};
```

---

### Step 3: Interviewer Creates the Offer (Step 1 of Handshake)

```javascript
// FormalInterview.jsx — Lines 104-118
// This fires when the SERVER tells the interviewer: "A new student just joined!"
s.on('user-connected', async (userId, socketId) => {

  const pc = createPeerConnection();
  peerConnectionRef.current = pc;
  // ↑ Create a fresh RTCPeerConnection and save it for later use.

  const offer = await pc.createOffer();
  // ↑ Ask the WebRTC engine to generate the SDP Offer —
  //   a description of the interviewer's media capabilities.
  //   This is an async operation (takes a moment to compute).

  await pc.setLocalDescription(offer);
  // ↑ Tell your own WebRTC engine: "This is what I'm going to advertise."
  //   IMPORTANT: setLocalDescription() also triggers ICE candidate gathering to BEGIN.
  //   From this point, pc.onicecandidate will start firing.

  s.emit('offer', offer, roomId);
  // ↑ Send the SDP Offer to the student via Socket.io.
  //   The server relays it → student receives it in their 'offer' listener.

  // Also sync the current code/language/question to the new user
  s.emit('code-change', codeRef.current, roomId);
  s.emit('language-change', langRef.current, roomId);
  s.emit('question-update', questionRef.current, roomId);
  // ↑ When a student joins, immediately send them the current state
  //   of the editor so they don't start with a blank screen.
});
```

---

### Step 4: Student Receives Offer, Creates Answer (Step 2 of Handshake)

```javascript
// FormalInterview.jsx — Lines 120-128
s.on('offer', async (offer, socketId) => {
// ↑ Student receives the SDP Offer that the interviewer sent.

  const pc = createPeerConnection();
  peerConnectionRef.current = pc;
  // ↑ Student also creates their own RTCPeerConnection.

  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  // ↑ Tell your WebRTC engine: "This is what the other browser can do."
  //   RTCSessionDescription wraps the raw offer in the correct object type.

  const answer = await pc.createAnswer();
  // ↑ Create an SDP Answer — student's own media capabilities,
  //   matched against what the interviewer offered.
  //   "I can match your H.264 video, I'll use Opus audio."

  await pc.setLocalDescription(answer);
  // ↑ Store the answer as your own description.
  //   Also triggers ICE candidate gathering on the student side.

  s.emit('answer', answer, roomId);
  // ↑ Send the Answer back to the interviewer via Socket.io.
});
```

---

### Step 5: Interviewer Receives the Answer (Step 3 of Handshake — SDP Complete)

```javascript
// FormalInterview.jsx — Lines 130-134
s.on('answer', async (answer) => {
  if (peerConnectionRef.current) {
    await peerConnectionRef.current.setRemoteDescription(
      new RTCSessionDescription(answer)
    );
    // ↑ Interviewer stores the student's SDP as their remote description.
    //   Now BOTH sides have:
    //     - Their own local description (what they can do)
    //     - The other's remote description (what the other can do)
    //   The SDP negotiation is COMPLETE.
    //   ICE candidate exchange continues in parallel.
  }
});
```

---

### Step 6: ICE Candidate Exchange (Both Sides, Simultaneously)

```javascript
// FormalInterview.jsx — Lines 136-144
s.on('ice-candidate', async (candidate) => {
// ↑ When the other browser sends a candidate (network path to try):

  if (peerConnectionRef.current) {
    try {
      await peerConnectionRef.current.addIceCandidate(
        new RTCIceCandidate(candidate)
      );
      // ↑ Add this network path to the list of paths to try.
      //   WebRTC's ICE algorithm automatically tries all added candidates.
      //   When it finds a working path, the connection activates.
      //   Video and audio start flowing!
    } catch (e) {
      console.error('Error adding received ice candidate', e);
      // ↑ Can happen if the connection closed before this candidate arrived.
      //   Non-fatal — just log and continue.
    }
  }
});
```

---

### Step 7: Cleanup When Someone Leaves

```javascript
// FormalInterview.jsx — Lines 146-155
s.on('user-disconnected', () => {
  if (remoteVideoRef.current) {
    remoteVideoRef.current.srcObject = null;
    // ↑ Remove the video stream from the video element
    //   The black "Waiting for peer..." state reappears
  }
  setRemoteStream(null);
  // ↑ Update React state so the UI reflects no remote video

  if (peerConnectionRef.current) {
    peerConnectionRef.current.close();
    // ↑ Cleanly close the RTCPeerConnection
    //   This releases camera/network resources
    peerConnectionRef.current = null;
  }
});

// Also in the useEffect cleanup (when navigating away):
return () => {
  localStreamRef.current?.getTracks().forEach(track => track.stop());
  // ↑ Turn OFF the camera and microphone hardware
  //   Without this, the browser's camera indicator light stays on!

  peerConnectionRef.current?.close();
  s.disconnect();
};
```

---

## 7. Mic and Video Toggle — How It Actually Works

```javascript
// FormalInterview.jsx — Lines 173-191
const toggleMic = () => {
  if (localStream) {
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      // ↑ Setting enabled = false MUTES the track.
      //   The track still EXISTS in the stream — it just sends silence.
      //   This is different from stopping the track (which removes it entirely).
      //   With enabled=false, WebRTC keeps sending audio packets but they're silent.
      setMicMuted(!audioTrack.enabled);
    }
  }
};

const toggleVideo = () => {
  if (localStream) {
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      // ↑ Same concept for video.
      //   enabled=false → sends a black frame.
      //   The other person sees a black box instead of your face.
      setVideoOff(!videoTrack.enabled);
    }
  }
};
```

**Important distinction:**
- `track.enabled = false` → track is muted/black but still active. Can re-enable.
- `track.stop()` → track is permanently stopped. Camera light turns off. Cannot re-enable without calling `getUserMedia()` again.

Apollo uses `enabled = false` for toggles so the user can un-mute/un-pause without re-asking for camera permission.

---

## 8. The Complete WebRTC Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  APOLLO WEBRTC HANDSHAKE — Complete Timeline                                     │
└──────────────────────────────────────────────────────────────────────────────────┘

[Interviewer Browser]          [Apollo Server]          [Student Browser]
        │                           │                           │
        │ getUserMedia()             │                           │
        │ ← camera/mic stream       │                           │
        │                           │                           │
        │ emit('join-room')─────────►│                           │
        │                           │ socket.join('room-123')   │
        │                           │                           │
        │                           │◄──── emit('join-room') ───│ getUserMedia()
        │                           │ socket.join('room-123')   │ ← camera/mic
        │                           │                           │
        │◄── emit('user-connected') ─│                           │
        │                           │                           │
═══════════════════════════ STEP 1: OFFER ════════════════════════════════════
        │                           │                           │
        │ createPeerConnection()     │                           │
        │ pc.addTrack(videoTrack)    │                           │
        │ pc.addTrack(audioTrack)    │                           │
        │ offer = pc.createOffer()   │                           │
        │ pc.setLocalDescription()   │                           │
        │ → ICE gathering STARTS     │                           │
        │                           │                           │
        │ emit('offer', sdp) ────────►│                           │
        │                           │──── emit('offer', sdp) ───►│
        │                           │                           │
═══════════════════════════ STEP 2: ANSWER ═══════════════════════════════════
        │                           │                           │ createPeerConnection()
        │                           │                           │ pc.addTrack(videoTrack)
        │                           │                           │ pc.addTrack(audioTrack)
        │                           │                           │ pc.setRemoteDescription(offer)
        │                           │                           │ answer = pc.createAnswer()
        │                           │                           │ pc.setLocalDescription()
        │                           │                           │ → ICE gathering STARTS
        │                           │                           │
        │                           │◄─── emit('answer', sdp) ──│
        │◄─── emit('answer', sdp) ───│                           │
        │                           │                           │
        │ pc.setRemoteDescription()  │                           │
        │ SDP NEGOTIATION COMPLETE ✓ │                           │
        │                           │                           │
═══════════════════════════ STEP 3: ICE CANDIDATES ══════════════════════════
        │                           │                           │
        │ onicecandidate fires       │                           │ onicecandidate fires
        │ emit('ice-candidate',cand)─►│                           │ emit('ice-candidate',cand)
        │                           │──emit('ice-candidate')────►│
        │                           │◄─emit('ice-candidate')────│
        │◄──emit('ice-candidate')────│                           │
        │                           │                           │
        │ pc.addIceCandidate()       │                           │ pc.addIceCandidate()
        │ (multiple rounds)          │                           │ (multiple rounds)
        │                           │                           │
        │ ICE finds best path ────────────────────────────────── ICE finds best path
        │                           │                           │
═══════════════════════════ P2P CONNECTION ACTIVE ════════════════════════════
        │                           │                           │
        │◄══════ Direct video/audio stream (P2P) ══════════════►│
        │  NO SERVER INVOLVEMENT — bytes go browser to browser  │
        │                           │                           │
        │ pc.ontrack fires           │                           │ pc.ontrack fires
        │ remoteVideoRef.srcObject = │                           │ remoteVideoRef.srcObject =
        │ event.streams[0]           │                           │ event.streams[0]
        │                           │                           │
        │ ← Student's face appears  │                           │ ← Interviewer's face appears
```

---

## 9. What Goes Through Socket.io vs What Goes P2P

This is the most important conceptual distinction in WebRTC:

```
THROUGH SOCKET.IO (small control messages):
  ┌─────────────────────────────────────────────────────┐
  │ • SDP Offer   (text blob, ~2KB)                     │
  │ • SDP Answer  (text blob, ~2KB)                     │
  │ • ICE Candidates (JSON objects, ~200 bytes each)    │
  │ • code-change events                                │
  │ • question-update events                            │
  │ • user-connected / user-disconnected notifications  │
  └─────────────────────────────────────────────────────┘
  These are tiny control messages. Total: kilobytes.
  The server handles and relays all of these.

PEER-TO-PEER (large media streams):
  ┌─────────────────────────────────────────────────────┐
  │ • Video frames (H.264/VP8 encoded)                  │
  │ • Audio packets (Opus encoded)                      │
  └─────────────────────────────────────────────────────┘
  These are massive — 500Kbps to 2Mbps continuously.
  The server NEVER sees these. They go browser to browser.
```

---

## 10. `peerConnectionRef` — Why a Ref Instead of State

```javascript
const peerConnectionRef = useRef(null);
```

The `RTCPeerConnection` object (`pc`) is stored in a **ref**, not state.

**Why?**
1. `pc` is a native browser object that manages its own internal state (ICE, DTLS, media streams). React doesn't need to track it for rendering purposes.
2. Updating `pc` inside event handlers (like `onicecandidate`) would cause stale closure issues if stored in state.
3. We never want a state update from `pc` to trigger a re-render — the connection lives independently of the component render cycle.
4. The same `pc` instance must be shared across multiple socket event handlers (`offer`, `answer`, `ice-candidate`) — a ref provides the same reference to all of them.

---

## 11. Production Issues

### Issue 1: TURN Server Missing

**Problem:** ~20% of users (behind strict corporate or university firewalls using symmetric NAT) will have STUN fail. ICE cannot find a working P2P path. Their video call simply won't connect — no error message, just "Waiting for peer..." forever.

**Production fix:**
```javascript
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'apollo',
      credential: 'secure-password'
    }
  ]
};
```

A self-hosted **Coturn** server or a cloud provider like **Twilio Network Traversal Service** would handle these cases.

---

### Issue 2: Race Condition — ICE Before Remote Description

A subtle WebRTC bug: `ice-candidate` events can arrive on the receiver's side **before** `pc.setRemoteDescription()` has been called. If `addIceCandidate()` is called before `setRemoteDescription()`, it throws an error and the candidate is lost.

Apollo handles this with a `try/catch` that silently swallows the error:
```javascript
try {
  await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
} catch (e) {
  console.error('Error adding received ice candidate', e);
}
```

**Production fix:** Queue ICE candidates in an array and process them all after `setRemoteDescription()` completes:
```javascript
let pendingCandidates = [];

s.on('ice-candidate', async (candidate) => {
  if (peerConnectionRef.current?.remoteDescription) {
    await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
  } else {
    pendingCandidates.push(candidate);  // Queue for later
  }
});
// After setRemoteDescription:
for (const c of pendingCandidates) {
  await pc.addIceCandidate(new RTCIceCandidate(c));
}
pendingCandidates = [];
```

---

### Issue 3: Camera Not Released on Page Leave

Apollo's cleanup function handles this correctly:
```javascript
return () => {
  localStreamRef.current?.getTracks().forEach(track => track.stop());
};
```

Without this, the camera's orange/green indicator light in the browser tab stays ON even after leaving the interview page — because the camera stream is still active. Always stop all tracks in cleanup.

---

## 12. Key Files for This Phase

| File | What to Focus On |
|---|---|
| [client/src/pages/FormalInterview.jsx](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/client/src/pages/FormalInterview.jsx) ⭐ | `rtcConfig`, `getUserMedia`, `createPeerConnection`, `addTrack`, `ontrack`, `onicecandidate`, `createOffer`, `setLocalDescription`, `setRemoteDescription`, `createAnswer`, `addIceCandidate`, cleanup |
| [server/sockets/interviewSockets.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/server/sockets/interviewSockets.js) ⭐ | `offer`, `answer`, `ice-candidate` relay events — note the server just forwards them, it doesn't process them |

---

## 13. Interview Questions — Own These Answers

**Q1: "What is WebRTC and why does Apollo use it for video calls instead of routing video through the server?"**
> WebRTC is a browser-native protocol for direct peer-to-peer video and audio streaming. Apollo uses it because routing video through the server would require the server to handle 500Kbps–2Mbps per active call, making it extremely expensive to scale. With WebRTC, the server only handles tiny signaling messages (offer/answer/ICE, totaling kilobytes). The actual video flows directly browser-to-browser. The server's bandwidth cost for video is zero.

**Q2: "What is the 3-step WebRTC handshake?"**
> Step 1 — Offer: The interviewer creates an `RTCPeerConnection`, calls `createOffer()` to generate an SDP blob describing their media capabilities, calls `setLocalDescription()`, and sends the offer to the student via Socket.io. Step 2 — Answer: The student receives the offer, calls `setRemoteDescription()`, then `createAnswer()` to create their matching SDP, calls `setLocalDescription()`, and sends the answer back. Step 3 — ICE: Both sides independently discover their network paths via the STUN server. They send their ICE candidates to each other via Socket.io. ICE tries all combinations and finds the best direct path. Video and audio then flow peer-to-peer.

**Q3: "What is a STUN server and why does Apollo use Google's?"**
> STUN is a simple service that tells a browser its own public IP address and port as seen from the outside internet. This is necessary because browsers behind NAT routers only know their private IP (`192.168.x.x`), which is unreachable from outside. STUN reveals the public-facing address. Apollo uses Google's free public STUN server (`stun.l.google.com:19302`) because it's reliable, free, and requires zero infrastructure.

**Q4: "What is SDP?"**
> SDP (Session Description Protocol) is a text document that describes a browser's media capabilities — what video codecs it supports, what audio formats, what resolution, and what network addresses. In WebRTC, Browser A sends its SDP as an "Offer." Browser B responds with its own SDP as an "Answer." Once both have each other's SDP, they know exactly how to communicate. Apollo never parses SDP manually — the browser's `RTCPeerConnection` generates and interprets it automatically.

**Q5: "What is the difference between `track.enabled = false` and `track.stop()`?"**
> `track.enabled = false` mutes the track — the stream still exists and sends silence/black frames. The camera hardware is still on. You can re-enable it without asking for permission again. `track.stop()` permanently stops the track, releases the camera hardware, and turns off the camera indicator light. Re-enabling requires calling `getUserMedia()` again, which triggers another permission popup. Apollo uses `enabled = false` for mic/video toggles so users can un-mute without a permission dialog.

**Q6: "Why is Socket.io involved in a WebRTC call? I thought WebRTC was peer-to-peer?"**
> The P2P video stream is peer-to-peer, but before two browsers can connect directly, they need to exchange their SDP descriptions and ICE candidates. This initial exchange (called "signaling") requires a server as a middleman — browsers have no way to find each other without one. Apollo uses Socket.io as the signaling relay. Once both browsers have each other's SDP and ICE info and find a working path, Socket.io is no longer involved in the video call. The video travels directly browser-to-browser.
