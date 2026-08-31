import { API_BASE } from './api.js';

/**
 * Upload a PDF file
 * @param {File} file - PDF file to upload
 * @param {string} userId - User ID
 * @param {function} onProgress - Progress callback (optional)
 * @returns {Promise<object>} Upload result with document details
 */
export async function uploadPDF(file, userId, onProgress) {
  const formData = new FormData();
  formData.append('pdf', file);
  formData.append('userId', userId);

  try {
    const response = await fetch(`${API_BASE}/api/rag/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    return await response.json();
  } catch (error) {
    console.error('[RAG API] Upload error:', error);
    throw error;
  }
}

/**
 * Query documents with RAG (SSE streaming)
 * @param {object} params - Query parameters
 * @param {string} params.question - User question
 * @param {string} params.userId - User ID
 * @param {string} params.documentId - Optional specific document ID
 * @param {boolean} params.multiDoc - Whether to search across all documents
 * @param {function} params.onChunk - Callback for each text chunk
 * @param {function} params.onSources - Callback for source citations
 * @param {function} params.onDone - Callback when streaming completes
 * @param {function} params.onError - Callback for errors
 */
export async function queryDocuments({ question, userId, documentId, multiDoc = false, onChunk, onSources, onDone, onError }) {
  try {
    const response = await fetch(`${API_BASE}/api/rag/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        question, 
        userId,
        documentId: documentId || null,
        multiDoc 
      })
    });

    if (!response.ok) {
      throw new Error('Query failed');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;

      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();

            if (dataStr === '[DONE]') {
              done = true;
              break;
            }

            if (dataStr) {
              try {
                const dataObj = JSON.parse(dataStr);
                
                // Handle different message types
                if (dataObj.type === 'sources') {
                  onSources?.(dataObj.sources);
                } else if (dataObj.text) {
                  onChunk?.(dataObj.text);
                } else if (dataObj.error) {
                  onError?.(new Error(dataObj.error));
                }
              } catch (parseError) {
                console.error('[RAG API] Error parsing stream chunk:', parseError);
              }
            }
          }
        }
      }
    }

    onDone?.();
  } catch (error) {
    console.error('[RAG API] Query error:', error);
    onError?.(error);
  }
}

/**
 * Get all documents for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of documents
 */
export async function getUserDocuments(userId) {
  try {
    const response = await fetch(`${API_BASE}/api/rag/documents?userId=${userId}`, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch documents');
    }

    const data = await response.json();
    return data.documents || [];
  } catch (error) {
    console.error('[RAG API] Get documents error:', error);
    throw error;
  }
}

/**
 * Get single document details
 * @param {string} documentId - Document ID
 * @param {string} userId - User ID
 * @returns {Promise<object>} Document details
 */
export async function getDocument(documentId, userId) {
  try {
    const response = await fetch(`${API_BASE}/api/rag/documents/${documentId}?userId=${userId}`, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch document');
    }

    const data = await response.json();
    return data.document;
  } catch (error) {
    console.error('[RAG API] Get document error:', error);
    throw error;
  }
}

/**
 * Delete a document
 * @param {string} documentId - Document ID
 * @param {string} userId - User ID
 * @returns {Promise<object>} Delete result
 */
export async function deleteDocument(documentId, userId) {
  try {
    const response = await fetch(`${API_BASE}/api/rag/documents/${documentId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Delete failed');
    }

    return await response.json();
  } catch (error) {
    console.error('[RAG API] Delete error:', error);
    throw error;
  }
}

export default {
  uploadPDF,
  queryDocuments,
  getUserDocuments,
  getDocument,
  deleteDocument
};
