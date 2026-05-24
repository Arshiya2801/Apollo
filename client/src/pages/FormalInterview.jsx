import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import * as LucideIcons from 'lucide-react';
import CodeEditor from '../components/CodeEditor/CodeEditor';
import { API_BASE } from '../services/api';
import './Interview.css';

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
];

function FormalInterview() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // `host=true` indicates the user is the Interviewer who created the room
  const isHost = searchParams.get('host') === 'true';
  const role = isHost ? 'Interviewer' : 'Student';

  const [socket, setSocket] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [micMuted, setMicMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  
  const [code, setCode] = useState('// Write your code here...\n');
  const [language, setLanguage] = useState('javascript');
  const [question, setQuestion] = useState('');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const codeRef = useRef(code);
  const langRef = useRef(language);
  const questionRef = useRef(question);

  useEffect(() => { codeRef.current = code; }, [code]);
  useEffect(() => { langRef.current = language; }, [language]);
  useEffect(() => { questionRef.current = question; }, [question]);

  // Initialize Socket and Media
  useEffect(() => {
    const s = io(API_BASE);
    setSocket(s);
    socketRef.current = s;

    // Get Local Media
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        setLocalStream(stream);
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        // Join room after media is ready
        s.emit('join-room', roomId, s.id);
      })
      .catch(err => {
        console.error('Failed to get media devices:', err);
        // Even if media fails, still join so they can see code
        s.emit('join-room', roomId, s.id);
      });

    // ── WebRTC Signaling Logic ──
    const createPeerConnection = () => {
      const pc = new RTCPeerConnection(rtcConfig);
      
      // Add local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          s.emit('ice-candidate', event.candidate, roomId);
        }
      };

      return pc;
    };

    s.on('user-connected', async (userId, socketId) => {
      console.log('User connected:', userId);
      // The person already in the room creates the offer
      const pc = createPeerConnection();
      peerConnectionRef.current = pc;
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      s.emit('offer', offer, roomId);

      // Sync current state to the new user
      s.emit('code-change', codeRef.current, roomId);
      s.emit('language-change', langRef.current, roomId);
      s.emit('question-update', questionRef.current, roomId);
    });

    s.on('offer', async (offer, socketId) => {
      const pc = createPeerConnection();
      peerConnectionRef.current = pc;
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      s.emit('answer', answer, roomId);
    });

    s.on('answer', async (answer) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    s.on('ice-candidate', async (candidate) => {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding received ice candidate', e);
        }
      }
    });

    s.on('user-disconnected', () => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      setRemoteStream(null);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    });

    // ── Synchronization Logic ──
    s.on('code-change', (newCode) => setCode(newCode));
    s.on('language-change', (newLang) => setLanguage(newLang));
    s.on('question-update', (newQ) => setQuestion(newQ));

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      s.disconnect();
    };
  }, [roomId]); // Deliberately omit other deps to run only once

  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoOff(!videoTrack.enabled);
      }
    }
  };

  const handleCopyLink = () => {
    // Generate the invite link (without ?host=true so the joiner defaults to Student)
    const link = `${window.location.origin}/interview/join/${roomId}`;
    navigator.clipboard.writeText(link);
    alert('Invite link copied to clipboard!');
  };

  const handleLeave = () => {
    if (window.confirm('Are you sure you want to leave the interview room?')) {
      navigate('/interview');
    }
  };

  return (
    <div className="iv-root" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0d0d12', color: '#fff' }}>
      
      {/* HEADER */}
      <header style={{ height: '60px', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LucideIcons.Sparkles color="#9B40E0" size={20} />
          <h2 style={{ fontSize: '20px', margin: 0, fontFamily: 'var(--ws-font-display, "Playfair Display", serif)', fontStyle: 'italic', fontWeight: 400 }}>Formal Interview ({role})</h2>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          {isHost && (
            <button onClick={handleCopyLink} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#2d2d3a', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'var(--ws-font-body)', fontSize: '13px' }}>
              <LucideIcons.Copy size={14} /> Copy Invite
            </button>
          )}
          <button onClick={handleLeave} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f85149', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'var(--ws-font-body)', fontSize: '13px' }}>
            <LucideIcons.LogOut size={14} /> Leave
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* LEFT COLUMN: Question & Video */}
        <div style={{ width: '350px', borderRight: '1px solid #333', display: 'flex', flexDirection: 'column', background: '#15151c' }}>
          
          {/* Question Area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderBottom: '1px solid #333' }}>
            <div style={{ padding: '12px 16px', background: '#1e1e24', borderBottom: '1px solid #333', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LucideIcons.FileText size={14} /> Question Details
            </div>
            {isHost ? (
              <textarea 
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value);
                  socketRef.current?.emit('question-update', e.target.value, roomId);
                }}
                placeholder="Type or paste the problem description here for the student..."
                style={{ flex: 1, padding: '16px', background: 'transparent', border: 'none', color: '#ccc', resize: 'none', outline: 'none', fontFamily: 'inherit' }}
              />
            ) : (
              <div style={{ flex: 1, padding: '16px', color: '#ccc', whiteSpace: 'pre-wrap', overflowY: 'auto' }}>
                {question || <span style={{ color: '#666', fontStyle: 'italic' }}>Waiting for interviewer to provide the question...</span>}
              </div>
            )}
          </div>

          {/* Video Calls */}
          <div style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '8px 16px', background: '#1e1e24', borderBottom: '1px solid #333', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LucideIcons.Video size={14} /> Video Call
            </div>
            
            <div style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
              {/* Remote Video */}
              <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {!remoteStream && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '13px' }}>
                    Waiting for peer...
                  </div>
                )}
                <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                  {isHost ? 'Student' : 'Interviewer'}
                </div>
              </div>

              {/* Local Video */}
              <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                  You ({role})
                </div>
                
                {/* Media Controls Overlay */}
                <div style={{ position: 'absolute', bottom: '8px', right: '8px', display: 'flex', gap: '6px' }}>
                  <button onClick={toggleMic} style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: micMuted ? '#f85149' : 'rgba(0,0,0,0.6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    {micMuted ? <LucideIcons.MicOff size={14} /> : <LucideIcons.Mic size={14} />}
                  </button>
                  <button onClick={toggleVideo} style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: videoOff ? '#f85149' : 'rgba(0,0,0,0.6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    {videoOff ? <LucideIcons.VideoOff size={14} /> : <LucideIcons.Video size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Code Editor */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '8px 16px', background: '#1e1e24', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LucideIcons.Code2 size={14} /> Collaborative Editor
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
              <span style={{ fontSize: '12px', color: '#888' }}>Language:</span>
              <select 
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value);
                  socketRef.current?.emit('language-change', e.target.value, roomId);
                }}
                style={{ background: '#2d2d3a', color: '#fff', border: '1px solid #444', borderRadius: '4px', padding: '4px 8px', fontSize: '12px' }}
              >
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ flex: 1, position: 'relative' }}>
            <CodeEditor 
              value={code} 
              onChange={(newCode) => {
                setCode(newCode);
                socketRef.current?.emit('code-change', newCode, roomId);
              }} 
              language={language} 
              theme="vs-dark" 
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default FormalInterview;
