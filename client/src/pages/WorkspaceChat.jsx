import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import CodeEditor from '../components/CodeEditor/CodeEditor';
import { streamAIChat } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CHAT_MODES } from '../modes/modeConfig';
import * as LucideIcons from 'lucide-react';
import '../App.css';
import './WorkspaceChat.css';

function ModeIcon({ name, size = 16, color, strokeWidth = 1.8 }) {
  const Icon = LucideIcons[name];
  if (!Icon) return null;
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
}

function WorkspaceChat() {
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState(CHAT_MODES[0]);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [codeOpen, setCodeOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('apollo-theme');
    return saved ? saved === 'dark' : true;
  });

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) { root.classList.remove('light-mode'); root.classList.add('dark-mode'); }
    else { root.classList.remove('dark-mode'); root.classList.add('light-mode'); }
    localStorage.setItem('apollo-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { inputRef.current?.focus(); }, [activeMode]);

  const handleModeSelect = (mode) => {
    if (mode.key === activeMode.key) return;
    setActiveMode(mode);
    setMessages([]);
    setChatInput('');
  };

  const handleSend = async () => {
    const text = chatInput.trim();
    if (!text || loading) return;
    setChatInput('');
    setLoading(true);

    const historyForApi = [...messages];
    setMessages(prev => [...prev, { role: 'user', content: text }, { role: 'model', content: '' }]);

    await streamAIChat({
      code: code.trim() || '// No code provided',
      language,
      mode: activeMode.key,
      history: historyForApi.concat({ role: 'user', content: text }),
      onChunk: (chunk) => setMessages(prev => {
        const updated = [...prev];
        const last = updated.length - 1;
        updated[last] = { ...updated[last], content: updated[last].content + chunk };
        return updated;
      }),
      onError: () => setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1].content = 'Error: Could not generate response.';
        return updated;
      }),
    });
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleStartRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice typing. Please use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
    };

    let finalTranscript = chatInput; // Keep whatever was already typed

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let currentFinal = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          currentFinal += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (currentFinal) {
        finalTranscript += (finalTranscript ? ' ' : '') + currentFinal;
        setChatInput(finalTranscript);
      } else if (interimTranscript) {
        // Show interim results while they speak
        setChatInput(finalTranscript + (finalTranscript ? ' ' : '') + interimTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === 'not-allowed') {
        alert("Please allow microphone access to use voice typing.");
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleStopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className={`wsc-root ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      {/* TOP BAR */}
      <div className="ws-topbar">
        <div className="ws-topbar-left">
          <div className="ws-topbar-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <LucideIcons.Sparkles size={16} color="#9B40E0" />
            <span>Apollo</span>
          </div>
          <div className="ws-topbar-divider" />
          <div className="ws-active-mode-badge" style={{ color: activeMode.color, borderColor: `${activeMode.color}30` }}>
            <ModeIcon name={activeMode.lucideIcon} size={13} color={activeMode.color} />
            <span>{activeMode.label}</span>
          </div>
        </div>
        <div className="ws-topbar-center">
          <span style={{ fontSize: '0.75rem', color: 'var(--ws-text-muted)', fontWeight: 500 }}>AI Coaching Chat</span>
        </div>
        <div className="ws-topbar-right">
          <button className="ws-icon-btn" onClick={() => setDarkMode(!darkMode)} title="Toggle theme">
            {darkMode ? <LucideIcons.Moon size={15} /> : <LucideIcons.Sun size={15} />}
          </button>
          <div className="ws-topbar-divider" />
          <div className="ws-user-badge">
            <div className="ws-user-avatar">{(user?.username || 'U').charAt(0).toUpperCase()}</div>
            <div className="ws-user-info">
              <span className="ws-user-name">{user?.username || 'User'}</span>
              <span className="ws-user-email">{user?.email || ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="wsc-body">
        <aside className="wsc-sidebar">
          <div className="ws-sidebar-section">
            <span className="ws-section-label">WORKSPACES</span>
            <button className="ws-mode-item" onClick={() => navigate('/workspace')}>
              <LucideIcons.Code2 size={15} color="#666" />
              <span>Code Editor</span>
            </button>
            <button className="ws-mode-item active" onClick={() => navigate('/workspace/chat')}>
              <LucideIcons.MessageSquare size={15} color="#9B40E0" />
              <span>AI Coaching Chat</span>
            </button>
          </div>

          <div className="ws-sidebar-section">
            <span className="ws-section-label">IMMERSIVE</span>
            <button className="ws-mode-item" onClick={() => navigate('/interview')}>
              <LucideIcons.ShieldCheck size={15} color="#666" />
              <span>Interview Prep</span>
            </button>
            <button className="ws-mode-item" onClick={() => navigate('/focus')}>
              <LucideIcons.Target size={15} color="#666" />
              <span>Focus Session</span>
            </button>
          </div>

          <div className="ws-sidebar-section" style={{ flex: 1, overflowY: 'auto' }}>
            <span className="ws-section-label">CHAT PERSONAS</span>
            <nav className="ws-mode-list">
              {CHAT_MODES.map((mode) => (
                <button
                  key={mode.key}
                  className={`ws-mode-item ${activeMode.key === mode.key ? 'active' : ''}`}
                  onClick={() => handleModeSelect(mode)}
                  title={mode.description}
                >
                  <ModeIcon name={mode.lucideIcon} size={15} color={activeMode.key === mode.key ? mode.color : '#666'} />
                  <span>{mode.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="ws-sidebar-bottom">
            <button className="ws-mode-item" onClick={logout}>
              <LucideIcons.LogOut size={15} color="#666" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* MAIN CHAT */}
        <div className="wsc-main">
          {/* Mode Chips */}
          <div className="wsc-mode-bar">
            <span className="wsc-mode-bar-label">Active Brain:</span>
            {CHAT_MODES.map((mode) => (
              <button
                key={mode.key}
                className={`wsc-mode-chip ${activeMode.key === mode.key ? 'active' : ''}`}
                onClick={() => handleModeSelect(mode)}
                style={activeMode.key === mode.key ? { '--chip-color': mode.color, borderColor: `${mode.color}40`, background: `${mode.color}15` } : {}}
              >
                <ModeIcon name={mode.lucideIcon} size={12} color={activeMode.key === mode.key ? mode.color : '#888'} />
                {mode.label}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
          <div className="wsc-chat-area">
            {messages.length > 0 ? (
              <>
                {messages.map((msg, i) => (
                  <div key={i} className={`wsc-msg ${msg.role === 'model' ? 'ai-msg' : 'user-msg'}`}>
                    {msg.role === 'model' ? (
                      <ReactMarkdown>{msg.content || (loading && i === messages.length - 1 ? '●●●' : '')}</ReactMarkdown>
                    ) : (
                      <span>{msg.content}</span>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </>
            ) : (
              <div className="wsc-empty">
                <div className="wsc-empty-icon">
                  <ModeIcon name={activeMode.lucideIcon} size={28} color={`${activeMode.color}60`} />
                </div>
                <h3>{activeMode.label}</h3>
                <p>{activeMode.description}</p>
                <div className="wsc-empty-hint">
                  <LucideIcons.Sparkles size={12} color="var(--ws-text-muted)" />
                  Type a message below to start chatting
                </div>
              </div>
            )}
          </div>

          {/* Code Attachment */}
          {codeOpen && (
            <div className="wsc-code-panel">
              <div className="wsc-code-header" onClick={() => setCodeOpen(false)}>
                <div className="wsc-code-header-left">
                  <LucideIcons.Code2 size={14} color="var(--ws-text-secondary)" />
                  <span>Code Context</span>
                  <select className="ws-lang-select" value={language} onChange={(e) => setLanguage(e.target.value)} onClick={(e) => e.stopPropagation()} style={{ marginLeft: '0.5rem' }}>
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                  </select>
                </div>
                <button className="wsc-code-toggle"><LucideIcons.ChevronDown size={16} /></button>
              </div>
              <div className="wsc-code-body">
                <CodeEditor language={language} value={code} onChange={setCode} theme={darkMode ? 'vs-dark' : 'light'} />
              </div>
            </div>
          )}

          {/* Input */}
          <div className="wsc-input-area">
            <button className={`wsc-context-badge ${code.trim() ? 'has-code' : ''}`} onClick={() => setCodeOpen(!codeOpen)} title={codeOpen ? 'Hide code panel' : 'Attach code for context'}>
              <LucideIcons.Code2 size={12} />
              {code.trim() ? 'Code attached' : 'Add code'}
              <LucideIcons.ChevronUp size={10} style={{ transform: codeOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s' }} />
            </button>
            <div className="wsc-input-wrapper">
              <input 
                ref={inputRef} 
                type="text" 
                className="wsc-input" 
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)} 
                onKeyDown={handleKeyDown} 
                placeholder={isRecording ? 'Listening...' : `Ask ${activeMode.label}...`} 
                disabled={loading} 
              />
            </div>
            
            <button 
              className={`wsc-mic-btn ${isRecording ? 'recording' : ''}`} 
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              disabled={loading}
              title={isRecording ? "Stop recording" : "Use Voice Typing"}
            >
              {isRecording ? <LucideIcons.Square size={16} color="#ef4444" fill="#ef4444" /> : <LucideIcons.Mic size={16} />}
            </button>

            <button className="wsc-send-btn" onClick={handleSend} disabled={loading || (!chatInput.trim() && !isRecording)}>
              <LucideIcons.Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkspaceChat;
