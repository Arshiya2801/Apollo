import express from 'express';
import {
  uploadPDF,
  queryRAG,
  getUserDocuments,
  getDocument,
  deleteDocument
} from '../controllers/ragController.js';

const router = express.Router();

/**
 * RAG Routes
 * Base path: /api/rag
 * 
 * NOTE: These routes currently support both:
 * 1. JWT middleware (req.user.id) - for authenticated routes
 * 2. Manual userId in request body/query - for MVP testing
 * 
 * In production, you should add JWT middleware to all routes.
 */

// Upload and process PDF
// POST /api/rag/upload
// Body: multipart/form-data with 'pdf' field
// Optional: userId in form data (if not using auth middleware)
router.post('/upload', uploadPDF);

// Query documents with RAG
// POST /api/rag/query
// Body: { question: string, documentId?: string, multiDoc?: boolean, userId?: string }
// Returns: SSE stream with answer and sources
router.post('/query', queryRAG);

// Get all documents for user
// GET /api/rag/documents
// Query: userId (if not using auth middleware)
// Returns: Array of user's documents
router.get('/documents', getUserDocuments);

// Get single document details
// GET /api/rag/documents/:id
// Query: userId (if not using auth middleware)
// Returns: Document details
router.get('/documents/:id', getDocument);

// Delete document and its chunks
// DELETE /api/rag/documents/:id
// Body: { userId?: string } (if not using auth middleware)
// Returns: Success message
router.delete('/documents/:id', deleteDocument);

export default router;
