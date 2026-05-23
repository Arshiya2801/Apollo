import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import CodeEditor from '../components/CodeEditor/CodeEditor';
import { streamRoastCode } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LogOut, Flame } from 'lucide-react';
import '../App.css';

function Roast() {
  const [code, setCode] = useState('// Type or paste code to be roasted...\n');
  const [language, setLanguage] = useState('javascript');
  const [roast, setRoast] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleRoast = async () => {
    if (!code.trim()) return;

    setLoading(true);
    setRoast('');

    await streamRoastCode({
      code,
      language,
      onChunk: (text) => setRoast((prev) => prev + text),
      onError: () => setRoast('Error: Could not generate roast.'),
    });

    setLoading(false);
  };

  return (
    <div className="container" style={{ background: 'linear-gradient(135deg, #2b1010, #1a1a2e)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: '#ff4b4b' }}>Apollo <Flame style={{color: 'orange', marginBottom: '-2px'}}/></h1>
          <p style={{ color: '#ffbaba' }}>Roast My Code Mode</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => navigate('/workspace')} 
            style={{ 
              background: '#333', color: '#fff', border: '1px solid #555', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer' 
            }}
          >
            ← Back to IDE
          </button>
          <span>Welcome, {user?.username}</span>
          <button 
            onClick={logout} 
            title="Logout"
            style={{ 
              background: 'none', border: 'none', color: '#ff4b4b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}
          >
            <LogOut size={20} /> Logout
          </button>
        </div>
      </header>

      <div className="workspace" style={{ gap: '2rem' }}>
        <div className="editor-section" style={{ flex: 1 }}>
          <div className="editor-panel" style={{ border: '1px solid #ff4b4b', boxShadow: '0 0 10px rgba(255, 75, 75, 0.2)' }}>
            <div className="controls" style={{ background: '#251515', borderBottom: '1px solid #ff4b4b' }}>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{ border: '1px solid #ff4b4b', background: '#1a1010' }}
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
              <div className="controls-right">
                <button
                  onClick={handleRoast}
                  disabled={loading || !code.trim()}
                  className="run-btn"
                  style={{ background: 'linear-gradient(45deg, #ff4b4b, #ff8f00)', color: 'white', border: 'none' }}
                >
                  {loading ? 'Roasting...' : '🔥 Roast My Code'}
                </button>
              </div>
            </div>

            <div className="editor-wrapper" style={{ flex: 1 }}>
              <CodeEditor
                language={language}
                value={code}
                onChange={setCode}
              />
            </div>
          </div>
        </div>

        <div className="chat-panel" style={{ flex: 1, overflowY: 'auto', background: '#1a1010', border: '1px solid #ff4b4b', boxShadow: '0 0 20px rgba(255, 75, 75, 0.1)' }}>
          <h2 style={{ color: '#ff4b4b' }}>Damage Report</h2>
          <div className="markdown-container" style={{ marginBottom: '1rem', color: '#e0e0e0' }}>
            {roast ? (
              <ReactMarkdown>{roast}</ReactMarkdown>
            ) : (
              <p className="placeholder" style={{ color: '#888' }}>
                Submit your worst code to proceed...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Roast;
