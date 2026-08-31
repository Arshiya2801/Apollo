import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import * as LucideIcons from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { uploadPDF, queryDocuments, getUserDocuments, deleteDocument } from '../services/ragApi';
import '../App.css';

function DocumentQA() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [multiDocMode, setMultiDocMode] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  // Load documents on mount
  useEffect(() => {
    if (user?.id) {
      loadDocuments();
    }
  }, [user]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load user's documents
  const loadDocuments = async () => {
    try {
      const docs = await getUserDocuments(user.id);
      setDocuments(docs);
    } catch (error) {
      toast.error('Failed to load documents');
      console.error(error);
    }
  };

  // Handle file upload
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are supported');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    const uploadToast = toast.loading('Uploading and processing PDF...');

    try {
      const result = await uploadPDF(file, user.id);
      toast.success('PDF processed successfully!', { id: uploadToast });
      await loadDocuments();
      
      // Auto-select the newly uploaded document
      setSelectedDoc(result.document);
    } catch (error) {
      toast.error(error.message || 'Upload failed', { id: uploadToast });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle document selection
  const handleDocSelect = (doc) => {
    setSelectedDoc(doc);
    setMultiDocMode(false);
    setMessages([]);
  };

  // Handle document deletion
  const handleDeleteDoc = async (docId, e) => {
    e.stopPropagation();
    
    if (!window.confirm('Delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDocument(docId, user.id);
      toast.success('Document deleted');
      await loadDocuments();
      
      if (selectedDoc?.id === docId) {
        setSelectedDoc(null);
        setMessages([]);
      }
    } catch (error) {
      toast.error('Failed to delete document');
      console.error(error);
    }
  };

  // Handle query submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    if (!multiDocMode && !selectedDoc) {
      toast.error('Please select a document first');
      return;
    }

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Create assistant message placeholder
    const assistantMessage = { role: 'assistant', content: '', sources: [] };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      await queryDocuments({
        question: input,
        userId: user.id,
        documentId: selectedDoc?.id,
        multiDoc: multiDocMode,
        onChunk: (text) => {
          setMessages(prev => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            // Create new object instead of mutating (fixes React Strict Mode double-invocation)
            updated[updated.length - 1] = { 
              ...lastMsg, 
              content: (lastMsg.content || '') + text 
            };
            return updated;
          });
        },
        onSources: (sources) => {
          setMessages(prev => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            updated[updated.length - 1] = { 
              ...lastMsg, 
              sources: sources 
            };
            return updated;
          });
        },
        onDone: () => {
          setLoading(false);
        },
        onError: (error) => {
          toast.error('Query failed: ' + error.message);
          setLoading(false);
        }
      });
    } catch (error) {
      toast.error('Failed to query documents');
      setLoading(false);
    }
  };

  // Resizable sidebar
  const handleMouseDown = (e) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = sidebarWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragging.current) return;
      const delta = e.clientX - startX.current;
      setSidebarWidth(Math.max(200, Math.min(500, startWidth.current + delta)));
    };

    const handleMouseUp = () => {
      if (dragging.current) {
        dragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0d0d12', color: '#fff' }}>
      
      {/* SIDEBAR */}
      <div style={{ width: `${sidebarWidth}px`, borderRight: '1px solid #2d2d3a', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid #2d2d3a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <button 
              onClick={() => navigate('/workspace')}
              style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px' }}
            >
              <LucideIcons.ArrowLeft size={20} />
            </button>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Documents</h2>
          </div>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              width: '100%',
              padding: '10px',
              background: uploading ? '#444' : '#7ee787',
              color: uploading ? '#888' : '#000',
              border: 'none',
              borderRadius: '6px',
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {uploading ? (
              <>
                <LucideIcons.Loader2 size={16} className="spin" />
                Processing...
              </>
            ) : (
              <>
                <LucideIcons.Upload size={16} />
                Upload PDF
              </>
            )}
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

        {/* Multi-doc toggle */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #2d2d3a' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
            <input
              type="checkbox"
              checked={multiDocMode}
              onChange={(e) => {
                setMultiDocMode(e.target.checked);
                if (e.target.checked) {
                  setSelectedDoc(null);
                  setMessages([]);
                }
              }}
            />
            <span>Search all documents</span>
          </label>
        </div>

        {/* Document list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {documents.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#666', padding: '40px 20px', fontSize: '14px' }}>
              <LucideIcons.FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
              <p>No documents yet</p>
              <p style={{ fontSize: '12px' }}>Upload a PDF to get started</p>
            </div>
          ) : (
            documents.map(doc => (
              <div
                key={doc.id}
                onClick={() => handleDocSelect(doc)}
                style={{
                  padding: '12px',
                  background: selectedDoc?.id === doc.id ? '#2d2d3a' : 'transparent',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginBottom: '8px',
                  border: selectedDoc?.id === doc.id ? '1px solid #7ee787' : '1px solid transparent',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                  <LucideIcons.FileText size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.originalName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#888', display: 'flex', gap: '12px' }}>
                      <span>{doc.pageCount} pages</span>
                      <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                    </div>
                    <div style={{ fontSize: '11px', marginTop: '4px' }}>
                      {doc.status === 'processing' && <span style={{ color: '#f0883e' }}>⏳ Processing...</span>}
                      {doc.status === 'ready' && <span style={{ color: '#7ee787' }}>✓ Ready</span>}
                      {doc.status === 'failed' && <span style={{ color: '#f85149' }}>✗ Failed</span>}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteDoc(doc.id, e)}
                    style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '4px' }}
                  >
                    <LucideIcons.Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RESIZE HANDLE */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          width: '4px',
          cursor: 'col-resize',
          background: '#2d2d3a',
          transition: 'background 0.2s'
        }}
      />

      {/* CHAT AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid #2d2d3a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Document Q&A</h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#888' }}>
              {multiDocMode ? 'Searching across all documents' : selectedDoc ? `Chatting with: ${selectedDoc.originalName}` : 'Select a document to begin'}
            </p>
          </div>
          <LucideIcons.BookOpen size={24} color="#7ee787" />
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#666', padding: '60px 20px' }}>
              <LucideIcons.MessageSquare size={64} style={{ margin: '0 auto 20px', opacity: 0.2 }} />
              <h3 style={{ marginBottom: '12px' }}>Ask anything about your documents</h3>
              <p style={{ fontSize: '14px', maxWidth: '500px', margin: '0 auto' }}>
                I'll search through your PDFs and provide answers with source citations.
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: msg.role === 'user' ? '#7ee787' : '#9B40E0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {msg.role === 'user' ? (
                      <LucideIcons.User size={18} color="#000" />
                    ) : (
                      <LucideIcons.Bot size={18} color="#fff" />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#888' }}>
                      {msg.role === 'user' ? 'You' : 'Apollo'}
                    </div>
                    <div className="message-content" style={{ fontSize: '14px', lineHeight: '1.6' }}>
                      {msg.role === 'assistant' ? (
                        <div className="markdown-response">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content || '...'}</ReactMarkdown>
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                    

                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '20px', borderTop: '1px solid #2d2d3a' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={multiDocMode || selectedDoc ? "Ask a question..." : "Select a document first..."}
              disabled={loading || (!multiDocMode && !selectedDoc)}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: '#1e1e24',
                border: '1px solid #2d2d3a',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim() || (!multiDocMode && !selectedDoc)}
              style={{
                padding: '12px 24px',
                background: (loading || !input.trim() || (!multiDocMode && !selectedDoc)) ? '#444' : '#7ee787',
                color: (loading || !input.trim() || (!multiDocMode && !selectedDoc)) ? '#888' : '#000',
                border: 'none',
                borderRadius: '8px',
                cursor: (loading || !input.trim() || (!multiDocMode && !selectedDoc)) ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                <>
                  <LucideIcons.Loader2 size={16} className="spin" />
                  Thinking...
                </>
              ) : (
                <>
                  <LucideIcons.Send size={16} />
                  Ask
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default DocumentQA;
