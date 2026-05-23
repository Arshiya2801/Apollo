import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import CodeEditor from '../components/CodeEditor/CodeEditor';
import { streamReviewCode } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LogOut, Search } from 'lucide-react';
import '../App.css';

function Review() {
  const [code, setCode] = useState('// Type or paste code to be reviewed...\n');
  const [language, setLanguage] = useState('javascript');
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleReview = async () => {
    if (!code.trim()) return;

    setLoading(true);
    setReview('');

    await streamReviewCode({
      code,
      language,
      onChunk: (text) => setReview((prev) => prev + text),
      onError: () => setReview('Error: Could not generate code review.'),
    });

    setLoading(false);
  };

  return (
    <div className="container" style={{ background: 'linear-gradient(135deg, #0e122b, #1a1a2e)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: '#4b73ff' }}>Apollo <Search style={{color: '#4bccff', marginBottom: '-2px'}}/></h1>
          <p style={{ color: '#baccff' }}>Code Review Mode</p>
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
              background: 'none', border: 'none', color: '#4b73ff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}
          >
            <LogOut size={20} /> Logout
          </button>
        </div>
      </header>

      <div className="workspace" style={{ gap: '2rem' }}>
        <div className="editor-section" style={{ flex: 1 }}>
          <div className="editor-panel" style={{ border: '1px solid #4b73ff', boxShadow: '0 0 10px rgba(75, 115, 255, 0.2)' }}>
            <div className="controls" style={{ background: '#111325', borderBottom: '1px solid #4b73ff' }}>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{ border: '1px solid #4b73ff', background: '#10101a' }}
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
              <div className="controls-right">
                <button
                  onClick={handleReview}
                  disabled={loading || !code.trim()}
                  className="run-btn"
                  style={{ background: 'linear-gradient(45deg, #4b73ff, #00d2ff)', color: 'white', border: 'none' }}
                >
                  {loading ? 'Analyzing...' : '🔍 Review Code'}
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

        <div className="chat-panel" style={{ flex: 1, overflowY: 'auto', background: '#10101a', border: '1px solid #4b73ff', boxShadow: '0 0 20px rgba(75, 115, 255, 0.1)' }}>
          <h2 style={{ color: '#4bccff' }}>Code Review Analysis</h2>
          <div className="markdown-container" style={{ marginBottom: '1rem', color: '#e0e0e0' }}>
            {review ? (
              <ReactMarkdown>{review}</ReactMarkdown>
            ) : (
              <p className="placeholder" style={{ color: '#888' }}>
                Submit a code snippet to begin code review...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Review;
