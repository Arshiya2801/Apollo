import multer from 'multer';
import pdfParse from 'pdf-parse';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Groq from 'groq-sdk';
import Document from '../models/Document.js';
import DocumentChunk from '../models/DocumentChunk.js';
import { embedTexts } from '../services/embeddingService.js';
import { semanticSearch, multiDocumentSearch, deleteDocumentChunks } from '../services/vectorService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Groq client
const groqApiKey = process.env.GROQ_API_KEY;

if (!groqApiKey) {
  console.error('⚠️  GROQ_API_KEY is not set in environment variables!');
  console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('GROQ')));
}

const groq = new Groq({
  apiKey: groqApiKey || 'dummy-key-for-startup'
});

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'doc-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

/**
 * Check if a chunk is likely garbage (TOC, page numbers, dots, etc.)
 */
function isGarbageChunk(text) {
  const trimmed = text.trim();
  
  // Too short to be meaningful
  if (trimmed.length < 50) return true;
  
  // Count meaningful characters (letters, numbers)
  const meaningfulChars = trimmed.replace(/[^a-zA-Z0-9]/g, '').length;
  const totalChars = trimmed.length;
  
  // If less than 40% of chars are alphanumeric, it's likely garbage (dots, dashes)
  if (meaningfulChars / totalChars < 0.4) return true;
  
  // Count word characters (must have real words)
  const words = trimmed.match(/[a-zA-Z]{3,}/g) || [];
  if (words.length < 5) return true;
  
  // If it's mostly dots (TOC style)
  const dots = (trimmed.match(/\./g) || []).length;
  if (dots > totalChars * 0.2) return true;
  
  return false;
}

/**
 * Chunk text into overlapping segments (smarter chunking)
 */
function chunkText(text, chunkSize = 800, overlap = 150) {
  const chunks = [];
  let chunkIndex = 0;
  
  // Clean up text - normalize whitespace but preserve paragraph breaks
  text = text.replace(/[ \t]+/g, ' ')  // Multiple spaces/tabs to single space
             .replace(/\n{3,}/g, '\n\n')  // Max 2 newlines
             .trim();
  
  // Split by paragraphs first (better semantic chunking)
  const paragraphs = text.split(/\n\n+/);
  
  let currentChunk = '';
  let chunkStart = 0;
  
  for (const para of paragraphs) {
    // If adding this paragraph would exceed chunk size, save current chunk
    if (currentChunk.length + para.length > chunkSize && currentChunk.length > 0) {
      const cleanedChunk = currentChunk.trim();
      
      // Only add if it's meaningful content
      if (!isGarbageChunk(cleanedChunk)) {
        const estimatedPage = Math.floor(chunkStart / 3000) + 1;
        chunks.push({
          text: cleanedChunk,
          page: estimatedPage,
          index: chunkIndex++
        });
      }
      
      // Start new chunk with overlap from previous
      const overlapText = currentChunk.slice(-overlap);
      chunkStart += currentChunk.length - overlap;
      currentChunk = overlapText + ' ' + para;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }
  
  // Add final chunk
  if (currentChunk.trim().length > 0) {
    const cleanedChunk = currentChunk.trim();
    if (!isGarbageChunk(cleanedChunk)) {
      const estimatedPage = Math.floor(chunkStart / 3000) + 1;
      chunks.push({
        text: cleanedChunk,
        page: estimatedPage,
        index: chunkIndex++
      });
    }
  }
  
  console.log(`[RAG] Created ${chunks.length} clean chunks from text (filtered garbage)`);
  return chunks;
}

/**
 * Upload and process PDF
 * POST /api/rag/upload
 */
export const uploadPDF = [
  upload.single('pdf'),
  async (req, res) => {
    let doc = null;
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
      }

      const userId = req.user?.id || req.body.userId; // Support both auth middleware and manual userId
      
      if (!userId) {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(401).json({ error: 'User authentication required' });
      }

      console.log(`[RAG] Processing PDF: ${req.file.originalname} for user ${userId}`);

      // 1. Create document record
      doc = await Document.create({
        userId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        status: 'processing'
      });

      // 2. Parse PDF
      const dataBuffer = fs.readFileSync(req.file.path);
      const pdfData = await pdfParse(dataBuffer);

      console.log(`[RAG] Extracted ${pdfData.numpages} pages, ${pdfData.text.length} characters`);

      // 3. Update page count
      doc.pageCount = pdfData.numpages;
      await doc.save();

      // 4. Chunk text
      const chunks = chunkText(pdfData.text, 500, 100);

      if (chunks.length === 0) {
        doc.status = 'failed';
        doc.errorMessage = 'No text extracted from PDF';
        await doc.save();
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'PDF contains no extractable text' });
      }

      // 5. Generate embeddings
      console.log(`[RAG] Generating embeddings for ${chunks.length} chunks...`);
      const embeddings = await embedTexts(chunks.map(c => c.text));

      // 6. Store chunks with embeddings
      const chunkDocs = chunks.map((chunk, i) => ({
        documentId: doc._id,
        userId,
        text: chunk.text,
        embedding: embeddings[i],
        pageNumber: chunk.page,
        chunkIndex: chunk.index
      }));

      await DocumentChunk.insertMany(chunkDocs);

      // 7. Update document status
      doc.status = 'ready';
      doc.vectorCount = chunks.length;
      doc.processedAt = new Date();
      await doc.save();

      // 8. Clean up temp PDF file
      fs.unlinkSync(req.file.path);

      console.log(`[RAG] Successfully processed document ${doc._id}`);

      res.json({
        success: true,
        document: {
          id: doc._id,
          originalName: doc.originalName,
          pageCount: doc.pageCount,
          vectorCount: doc.vectorCount,
          status: doc.status,
          uploadedAt: doc.uploadedAt
        }
      });

    } catch (error) {
      console.error('[RAG] Upload error:', error);

      // Update document status if it was created
      if (doc) {
        doc.status = 'failed';
        doc.errorMessage = error.message;
        await doc.save();
      }

      // Clean up file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        error: 'Failed to process PDF',
        details: error.message
      });
    }
  }
];

/**
 * Query documents with RAG
 * POST /api/rag/query
 */
export async function queryRAG(req, res) {
  const { question, documentId, multiDoc = false } = req.body;
  const userId = req.user?.id || req.body.userId;

  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  if (!userId) {
    return res.status(401).json({ error: 'User authentication required' });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    console.log(`[RAG] Query: "${question}" for user ${userId}`);

    // 1. Embed question
    const [questionEmbedding] = await embedTexts([question]);

    // 2. Search for relevant chunks
    let chunks;
    if (multiDoc && !documentId) {
      // Multi-document search across all user's documents
      const userDocs = await Document.find({ userId, status: 'ready' }).select('_id');
      const docIds = userDocs.map(d => d._id.toString());
      
      if (docIds.length === 0) {
        res.write(`data: ${JSON.stringify({ text: "You haven't uploaded any documents yet. Please upload a PDF to get started." })}\n\n`);
        res.write('data: [DONE]\n\n');
        return res.end();
      }
      
      chunks = await multiDocumentSearch(questionEmbedding, userId, docIds, 5);
    } else {
      // Single document search
      chunks = await semanticSearch(questionEmbedding, userId, documentId, 5);
    }

    if (chunks.length === 0) {
      res.write(`data: ${JSON.stringify({ text: "I couldn't find relevant information in your documents to answer that question." })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    console.log(`[RAG] Found ${chunks.length} relevant chunks`);

    // 3. Build context from chunks
    const context = chunks
      .map((c, i) => `[Source ${i + 1}] (Page ${c.pageNumber}${c.documentName ? `, ${c.documentName}` : ''})\n${c.text}`)
      .join('\n\n---\n\n');

    // 4. Build prompt for the AI
    const prompt = `You are Apollo, an AI assistant helping users understand their documentation.

CONTEXT FROM DOCUMENTS:
${context}

USER QUESTION: ${question}

INSTRUCTIONS:
- Answer the question using the context above as your primary source
- Format your response beautifully using Markdown:
  - Use **bold** for key terms and important points
  - Use bullet points (- ) for lists
  - Use numbered lists (1. 2. 3.) for steps or sequences
  - Use ### headings to organize longer answers
  - Keep paragraphs short (2-3 sentences max)
- Be direct and concise - get to the point quickly
- Do NOT include source citations like [Source 1] in your response
- If you truly cannot answer from the context, say so briefly

ANSWER:`;

    // 5. Stream response from Groq (Llama models deprecated June 2026, using GPT-OSS)
    const stream = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'openai/gpt-oss-20b', // Current Groq model (Llama deprecated)
      stream: true,
      temperature: 0.3, // Lower temperature for factual responses
      max_tokens: 1024
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    // 6. Send source citations
    res.write(`data: ${JSON.stringify({
      type: 'sources',
      sources: chunks.map((c, i) => ({
        id: i + 1,
        page: c.pageNumber,
        score: c.score,
        preview: c.text.slice(0, 150) + (c.text.length > 150 ? '...' : ''),
        documentName: c.documentName || 'Unknown'
      }))
    })}\n\n`);

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('[RAG] Query error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
}

/**
 * Get all documents for a user
 * GET /api/rag/documents
 */
export async function getUserDocuments(req, res) {
  try {
    const userId = req.user?.id || req.query.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const documents = await Document.find({ userId })
      .select('-__v')
      .sort({ uploadedAt: -1 });

    res.json({
      success: true,
      documents: documents.map(doc => ({
        id: doc._id,
        originalName: doc.originalName,
        fileSize: doc.fileSize,
        pageCount: doc.pageCount,
        vectorCount: doc.vectorCount,
        status: doc.status,
        uploadedAt: doc.uploadedAt,
        processedAt: doc.processedAt,
        errorMessage: doc.errorMessage
      }))
    });

  } catch (error) {
    console.error('[RAG] Get documents error:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get single document details
 * GET /api/rag/documents/:id
 */
export async function getDocument(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.query.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const document = await Document.findOne({ _id: id, userId });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      success: true,
      document: {
        id: document._id,
        originalName: document.originalName,
        fileSize: document.fileSize,
        pageCount: document.pageCount,
        vectorCount: document.vectorCount,
        status: document.status,
        uploadedAt: document.uploadedAt,
        processedAt: document.processedAt,
        errorMessage: document.errorMessage
      }
    });

  } catch (error) {
    console.error('[RAG] Get document error:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Delete a document and its chunks
 * DELETE /api/rag/documents/:id
 */
export async function deleteDocument(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.body.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const document = await Document.findOne({ _id: id, userId });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete all associated chunks
    const deletedCount = await deleteDocumentChunks(id, userId);

    // Delete the document record
    await Document.deleteOne({ _id: id });

    console.log(`[RAG] Deleted document ${id} and ${deletedCount} chunks`);

    res.json({
      success: true,
      message: 'Document deleted successfully',
      deletedChunks: deletedCount
    });

  } catch (error) {
    console.error('[RAG] Delete document error:', error);
    res.status(500).json({ error: error.message });
  }
}

export default {
  uploadPDF,
  queryRAG,
  getUserDocuments,
  getDocument,
  deleteDocument
};
