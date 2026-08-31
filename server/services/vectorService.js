import DocumentChunk from '../models/DocumentChunk.js';
import mongoose from 'mongoose';

/**
 * Vector Search Service using MongoDB Atlas Vector Search
 * 
 * SETUP REQUIRED:
 * 1. Go to MongoDB Atlas UI
 * 2. Navigate to your cluster → Search → Create Search Index
 * 3. Choose "JSON Editor"
 * 4. Use this configuration:
 * 
 * {
 *   "fields": [
 *     {
 *       "type": "vector",
 *       "path": "embedding",
 *       "numDimensions": 384,
 *       "similarity": "cosine"
 *     }
 *   ]
 * }
 * 
 * 5. Name the index: "vector_index"
 * 6. Select collection: "documentchunks"
 */

/**
 * Perform semantic search using MongoDB Atlas Vector Search
 * 
 * @param {number[]} queryEmbedding - 384-dim embedding vector
 * @param {string} userId - User ID to filter results
 * @param {string|null} documentId - Optional: filter by specific document
 * @param {number} topK - Number of results to return (default: 5)
 * @returns {Promise<Array>} Array of matching chunks with scores
 */
export async function semanticSearch(queryEmbedding, userId, documentId = null, topK = 5) {
  if (!queryEmbedding || queryEmbedding.length !== 384) {
    throw new Error('Query embedding must be 384 dimensions');
  }

  if (!userId) {
    throw new Error('userId is required for search');
  }

  try {
    // Build aggregation pipeline
    const pipeline = [
      // Stage 1: Vector search
      {
        $vectorSearch: {
          index: "vector_index", // Index name from Atlas
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: Math.max(100, topK * 20), // Search more candidates for better results
          limit: topK
        }
      },
      
      // Stage 2: Filter by user (security)
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          ...(documentId && { documentId: new mongoose.Types.ObjectId(documentId) })
        }
      },
      
      // Stage 3: Add search score and project fields
      {
        $project: {
          text: 1,
          pageNumber: 1,
          chunkIndex: 1,
          documentId: 1,
          score: { $meta: "vectorSearchScore" }
        }
      },
      
      // Stage 4: Populate document details
      {
        $lookup: {
          from: 'documents',
          localField: 'documentId',
          foreignField: '_id',
          as: 'document'
        }
      },
      
      // Stage 5: Unwind document array
      {
        $unwind: {
          path: '$document',
          preserveNullAndEmptyArrays: true
        }
      },
      
      // Stage 6: Final projection
      {
        $project: {
          text: 1,
          pageNumber: 1,
          chunkIndex: 1,
          documentId: 1,
          score: 1,
          documentName: '$document.originalName'
        }
      }
    ];

    console.log(`[VectorSearch] Searching for top ${topK} chunks for user ${userId}`);
    
    const results = await DocumentChunk.aggregate(pipeline);
    
    console.log(`[VectorSearch] Found ${results.length} results`);
    
    return results;

  } catch (error) {
    // Check if error is due to missing vector index
    if (error.message.includes('vector_index') || error.message.includes('$vectorSearch')) {
      console.error('[VectorSearch] Vector index not found. Please create it in MongoDB Atlas.');
      throw new Error('Vector search index not configured. Please set up "vector_index" in MongoDB Atlas.');
    }
    
    console.error('[VectorSearch] Search failed:', error);
    throw error;
  }
}

/**
 * Search across multiple documents for a user
 * 
 * @param {number[]} queryEmbedding - 384-dim embedding vector
 * @param {string} userId - User ID
 * @param {string[]} documentIds - Array of document IDs to search
 * @param {number} topK - Number of results per document
 * @returns {Promise<Array>} Array of matching chunks from all documents
 */
export async function multiDocumentSearch(queryEmbedding, userId, documentIds, topK = 5) {
  if (!documentIds || documentIds.length === 0) {
    throw new Error('At least one documentId is required');
  }

  try {
    const pipeline = [
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: Math.max(200, topK * documentIds.length * 10),
          limit: topK * documentIds.length
        }
      },
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          documentId: { 
            $in: documentIds.map(id => new mongoose.Types.ObjectId(id)) 
          }
        }
      },
      {
        $project: {
          text: 1,
          pageNumber: 1,
          chunkIndex: 1,
          documentId: 1,
          score: { $meta: "vectorSearchScore" }
        }
      },
      {
        $lookup: {
          from: 'documents',
          localField: 'documentId',
          foreignField: '_id',
          as: 'document'
        }
      },
      {
        $unwind: '$document'
      },
      {
        $project: {
          text: 1,
          pageNumber: 1,
          score: 1,
          documentId: 1,
          documentName: '$document.originalName'
        }
      },
      {
        $sort: { score: -1 }
      },
      {
        $limit: topK
      }
    ];

    console.log(`[VectorSearch] Multi-doc search across ${documentIds.length} documents`);
    
    const results = await DocumentChunk.aggregate(pipeline);
    
    console.log(`[VectorSearch] Found ${results.length} results across documents`);
    
    return results;

  } catch (error) {
    console.error('[VectorSearch] Multi-document search failed:', error);
    throw error;
  }
}

/**
 * Get all chunks for a specific document (for debugging/viewing)
 * 
 * @param {string} documentId - Document ID
 * @param {string} userId - User ID (for security)
 * @returns {Promise<Array>} All chunks for the document
 */
export async function getDocumentChunks(documentId, userId) {
  try {
    const chunks = await DocumentChunk.find({
      documentId: new mongoose.Types.ObjectId(documentId),
      userId: new mongoose.Types.ObjectId(userId)
    })
    .select('text pageNumber chunkIndex')
    .sort({ chunkIndex: 1 });

    return chunks;

  } catch (error) {
    console.error('[VectorSearch] Failed to get document chunks:', error);
    throw error;
  }
}

/**
 * Delete all chunks for a document
 * 
 * @param {string} documentId - Document ID
 * @param {string} userId - User ID (for security)
 * @returns {Promise<number>} Number of chunks deleted
 */
export async function deleteDocumentChunks(documentId, userId) {
  try {
    const result = await DocumentChunk.deleteMany({
      documentId: new mongoose.Types.ObjectId(documentId),
      userId: new mongoose.Types.ObjectId(userId)
    });

    console.log(`[VectorSearch] Deleted ${result.deletedCount} chunks for document ${documentId}`);
    
    return result.deletedCount;

  } catch (error) {
    console.error('[VectorSearch] Failed to delete chunks:', error);
    throw error;
  }
}

export default {
  semanticSearch,
  multiDocumentSearch,
  getDocumentChunks,
  deleteDocumentChunks
};
