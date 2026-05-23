import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import * as LucideIcons from 'lucide-react';
import CodeEditor from '../components/CodeEditor/CodeEditor';
import ImmersiveNav from '../components/ImmersiveNav';
import { streamAIChat, runCode } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Interview.css';

const PHASES = {
  SETUP: 'setup',
  CODING: 'coding',
  FOLLOWUP: 'followup',
  RESULT: 'result'
};

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
];

function Interview() {
  const [phase, setPhase] = useState(PHASES.SETUP);
  const [difficulty, setDifficulty] = useState('Medium');
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const [problem, setProblem] = useState('');
  const [code, setCode] = useState('// Your solution here...\n');
  const [language, setLanguage] = useState('javascript');
  const [runCount, setRunCount] = useState(0);
  const [maxRuns] = useState(3);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState(null);
  const [error, setError] = useState(null);

  const { user } = useAuth();
  const navigate = useNavigate();
  const chatEndRef = useRef(null);

  // ── Phase transition helper ──
  const handleCompleteCoding = () => {
    setPhase(PHASES.FOLLOWUP);
    setMessages([{
      role: 'model',
      content: "Thank you for submitting your solution. I've reviewed it. Let me ask you a few follow-up questions.\n\n**First:** Walk me through your approach. Why did you choose this particular data structure or algorithm?"
    }]);
  };

  // ── Countdown timer ──
  useEffect(() => {
    let interval = null;
    if (phase === PHASES.CODING) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            handleCompleteCoding();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [phase]);

  // ── Auto-scroll chat ──
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ── Start the interview ──
  const startInterview = async () => {
    setLoading(true);
    setError(null);
    setPhase(PHASES.CODING);
    await streamAIChat({
      code: '// Candidate will write solution here',
      language,
      mode: 'interview_interviewer',
      history: [{ role: 'user', content: `Start the interview. Give me a ${difficulty} difficulty DSA/algorithm coding problem. Include: problem title, description, constraints, and 2 example test cases. Do NOT provide the solution.` }],
      onChunk: (chunk) => setProblem(prev => prev + chunk),
      onDone: () => setLoading(false),
      onError: (err) => { setLoading(false); setError(`Failed to generate problem: ${err}`); }
    });
  };

  // ── Run code (limited) ──
  const handleRun = async () => {
    if (runCount >= maxRuns || phase !== PHASES.CODING) return;
    setRunning(true);
    setRunCount(prev => prev + 1);
    try {
      const res = await runCode({ code, language });
      setOutput(res);
    } catch (e) {
      setOutput({ stderr: e.message });
    }
    setRunning(false);
  };

  // ── Follow-up chat ──
  const handleSendFollowup = async () => {
    if (!chatInput.trim() || loading) return;
    const text = chatInput;
    setChatInput('');
    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages([...newMessages, { role: 'model', content: '' }]);
    setLoading(true);

    await streamAIChat({
      code,
      language,
      mode: 'interview_interviewer',
      history: newMessages,
      onChunk: (chunk) => setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], content: updated[updated.length - 1].content + chunk };
        return updated;
      }),
      onDone: () => {
        setLoading(false);
        // Auto-transition to evaluation after 3 back-and-forth exchanges
        if (newMessages.filter(m => m.role === 'user').length >= 3) {
          setTimeout(() => {
            setPhase(PHASES.RESULT);
            evaluatePerformance(newMessages);
          }, 1500);
        }
      },
      onError: (err) => { setLoading(false); setError(`Follow-up error: ${err}`); }
    });
  };

  // ── AI Evaluation ──
  const evaluatePerformance = async (msgs) => {
    setLoading(true);
    const evalHistory = (msgs || messages).map(m => ({ role: m.role, content: m.content }));
    let evalText = '';
    await streamAIChat({
      code,
      language,
      mode: 'interview_evaluator',
      history: [
        { role: 'user', content: `Here is the problem:\n${problem}\n\nHere is the candidate's code:\n\`\`\`${language}\n${code}\n\`\`\`\n\nHere is the follow-up discussion:\n${evalHistory.map(m => `${m.role === 'user' ? 'CANDIDATE' : 'INTERVIEWER'}: ${m.content}`).join('\n\n')}\n\nPlease evaluate this candidate.` }
      ],
      onChunk: (chunk) => {
        evalText += chunk;
        setResult(evalText);
      },
      onDone: () => setLoading(false),
      onError: (err) => { setLoading(false); setError(`Evaluation error: ${err}`); }
    });
  };

  // ── Retry interview ──
  const retryInterview = () => {
    setPhase(PHASES.SETUP);
    setDifficulty('Medium');
    setTimeLeft(45 * 60);
    setProblem('');
    setCode('// Your solution here...\n');
    setRunCount(0);
    setMessages([]);
    setChatInput('');
    setResult(null);
    setOutput(null);
    setError(null);
  };

  // ═══════════════ RENDERS ═══════════════

  const renderSetup = () => (
    <div className="iv-setup-card">
      <div className="iv-setup-header">
        <div className="iv-setup-icon">
          <LucideIcons.ShieldCheck size={36} color="#9B40E0" />
        </div>
        <h2>Technical Interview Simulator</h2>
        <p className="iv-setup-sub">45 minutes · Full-screen · Restricted Execution</p>
      </div>

      <div className="iv-setup-body">
        <label className="iv-field-label">Difficulty</label>
        <div className="iv-diff-selector">
          {['Easy', 'Medium', 'Hard'].map(d => (
            <button
              key={d}
              className={`iv-diff-btn ${difficulty === d ? 'active' : ''} iv-diff-${d.toLowerCase()}`}
              onClick={() => setDifficulty(d)}
            >
              {d}
            </button>
          ))}
        </div>

        <label className="iv-field-label">Language</label>
        <div className="iv-lang-selector">
          {LANGUAGES.map(l => (
            <button
              key={l.value}
              className={`iv-lang-btn ${language === l.value ? 'active' : ''}`}
              onClick={() => setLanguage(l.value)}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="iv-rules">
          <div className="iv-rule"><LucideIcons.Clock size={13} /> <span>45-minute countdown — cannot be paused</span></div>
          <div className="iv-rule"><LucideIcons.Terminal size={13} /> <span>Limited to <strong>{maxRuns}</strong> code executions</span></div>
          <div className="iv-rule"><LucideIcons.MessageSquare size={13} /> <span>Follow-up behavioral questions after submission</span></div>
          <div className="iv-rule"><LucideIcons.Award size={13} /> <span>AI Hiring Committee evaluates your performance</span></div>
        </div>
      </div>

      {error && <div className="iv-error">{error}</div>}

      <button className="iv-start-btn" onClick={startInterview} disabled={loading}>
        {loading ? (
          <><LucideIcons.Loader2 size={16} className="iv-spin" /> Generating Problem...</>
        ) : (
          <><LucideIcons.Play size={16} /> Begin Interview</>
        )}
      </button>
    </div>
  );

  const renderCoding = () => (
    <div className="iv-coding-layout">
      <div className="iv-problem-panel">
        <div className="iv-panel-header">
          <LucideIcons.Book size={14} />
          <span>Problem Statement</span>
          <span className="iv-difficulty-badge">{difficulty}</span>
        </div>
        <div className="iv-panel-body scrollable">
          {problem ? (
            <ReactMarkdown>{problem}</ReactMarkdown>
          ) : (
            <div className="iv-loading-problem">
              <LucideIcons.Loader2 size={20} className="iv-spin" />
              <span>Generating your challenge...</span>
            </div>
          )}
        </div>
      </div>
      <div className="iv-editor-panel">
        <div className="iv-panel-header">
          <LucideIcons.Code2 size={14} />
          <span>Solution · {LANGUAGES.find(l => l.value === language)?.label}</span>
        </div>
        <div className="iv-editor-wrapper">
          <CodeEditor value={code} onChange={setCode} language={language} theme="vs-dark" />
        </div>
        <div className="iv-console-area">
          <div className="iv-console-header">
            <span><LucideIcons.Terminal size={12} /> Terminal {output ? '— Result' : ''}</span>
            <div className="iv-run-status">
              Runs: <strong className={runCount >= maxRuns ? 'exhausted' : ''}>{runCount}/{maxRuns}</strong>
            </div>
          </div>
          <div className="iv-console-body">
            {running && <div className="iv-running"><LucideIcons.Loader2 size={14} className="iv-spin" /> Executing...</div>}
            {!running && output ? (
              <pre className={output.stderr ? 'err' : ''}>{output.stdout || output.stderr || 'No output'}</pre>
            ) : !running ? (
              <span className="muted">Run your solution to see output... ({maxRuns - runCount} runs remaining)</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  const renderFollowup = () => (
    <div className="iv-followup-layout">
      <div className="iv-chat-window">
        <div className="iv-panel-header">
          <LucideIcons.MessageSquare size={14} />
          <span>Follow-up Discussion</span>
          <span className="iv-phase-badge">Behavioral</span>
        </div>
        <div className="iv-chat-messages scrollable">
          {messages.map((m, i) => (
            <div key={i} className={`iv-msg ${m.role}`}>
              <div className="iv-msg-avatar">
                {m.role === 'model' ? <LucideIcons.UserCheck size={14} /> : (user?.username?.[0]?.toUpperCase() || 'U')}
              </div>
              <div className="iv-msg-bubble">
                <span className="iv-msg-role">{m.role === 'model' ? 'Interviewer' : 'You'}</span>
                <div className="iv-msg-content">
                  <ReactMarkdown>{m.content || '...'}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div className="iv-chat-input-area">
          <input
            type="text"
            placeholder="Explain your thinking..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendFollowup()}
            disabled={loading}
          />
          <button onClick={handleSendFollowup} disabled={loading || !chatInput.trim()}>
            {loading ? <LucideIcons.Loader2 size={16} className="iv-spin" /> : <LucideIcons.Send size={16} />}
          </button>
        </div>
      </div>
      <div className="iv-reference-code">
        <div className="iv-panel-header">
          <LucideIcons.FileCode size={14} />
          <span>Your Submitted Solution</span>
        </div>
        <div className="iv-ref-code-body">
          <CodeEditor value={code} onChange={() => {}} language={language} theme="vs-dark" />
        </div>
      </div>
    </div>
  );

  const renderResult = () => (
    <div className="iv-result-card">
      <div className="iv-result-header">
        <LucideIcons.Award size={48} color={result?.includes('HIRED') ? '#22c55e' : result?.includes('NO HIRE') ? '#f85149' : '#9B40E0'} />
        <h2>Interview Complete</h2>
        <p>Your performance has been evaluated by the Hiring Committee.</p>
      </div>
      <div className="iv-result-body scrollable">
        {result ? (
          <ReactMarkdown>{result}</ReactMarkdown>
        ) : (
          <div className="iv-loading-problem">
            <LucideIcons.Loader2 size={20} className="iv-spin" />
            <span>Evaluating your performance...</span>
          </div>
        )}
      </div>
      <div className="iv-result-actions">
        <button className="iv-retry-btn" onClick={retryInterview}>
          <LucideIcons.RotateCcw size={14} /> Try Again
        </button>
        <button className="iv-exit-btn" onClick={() => navigate('/workspace')}>
          <LucideIcons.ArrowLeft size={14} /> Back to Workspace
        </button>
      </div>
    </div>
  );

  return (
    <div className="iv-root">
      <ImmersiveNav
        title="Technical Interview"
        subtitle={
          phase === PHASES.SETUP ? 'Configure your session' :
          phase === PHASES.CODING ? `Coding · ${difficulty}` :
          phase === PHASES.FOLLOWUP ? 'Behavioral Follow-up' :
          'Evaluation'
        }
        timer={phase === PHASES.CODING ? formatTime(timeLeft) : null}
        onExit={() => {
          if (phase === PHASES.SETUP || window.confirm("Quitting now will mark this session as 'Incomplete'. Are you sure?")) {
            navigate('/workspace');
          }
        }}
        actions={
          phase === PHASES.CODING && (
            <div className="iv-nav-actions">
              <button className="iv-nav-run-btn" onClick={handleRun} disabled={runCount >= maxRuns || running}>
                {running ? <LucideIcons.Loader2 size={13} className="iv-spin" /> : <LucideIcons.Play size={13} />}
                {running ? 'Running...' : `Run (${maxRuns - runCount})`}
              </button>
              <button className="iv-nav-submit-btn" onClick={handleCompleteCoding}>
                <LucideIcons.CheckSquare size={13} /> Submit Solution
              </button>
            </div>
          )
        }
      />

      <main className="iv-content">
        {phase === PHASES.SETUP && renderSetup()}
        {phase === PHASES.CODING && renderCoding()}
        {phase === PHASES.FOLLOWUP && renderFollowup()}
        {phase === PHASES.RESULT && renderResult()}
      </main>
    </div>
  );
}

export default Interview;
