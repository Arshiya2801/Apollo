import mongoose from 'mongoose';

const DocumentChunkSchema = new mongoose.Schema({
  documentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Document', 
    required: true,
    index: true 
  },
  
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  
  // Text content
  text: { 
    type: String, 
    required: true 
  },
  
  // Vector embedding (384 dimensions for all-MiniLM-L6-v2)
  embedding: { 
    type: [Number], 
    required: true,
    validate: {
      validator: function(v) {
        return v.length === 384;
      },
      message: 'Embedding must be exactly 384 dimensions for all-MiniLM-L6-v2'
    }
  },
  
  // Chunk metadata
  pageNumber: { type: Number }, // Estimated page number
  chunkIndex: { type: Number, required: true }, // Position in document
  
  // Timestamps
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: false // Only need createdAt, not updatedAt
});

// Composite indexes for efficient queries
DocumentChunkSchema.index({ documentId: 1, chunkIndex: 1 });
DocumentChunkSchema.index({ userId: 1, documentId: 1 });

// IMPORTANT: Vector search index must be created in MongoDB Atlas UI
// Index name: "vector_index"
// Field: "embedding"
// Type: "vector"
// Dimensions: 384
// Similarity: "cosine"

const DocumentChunk = mongoose.model('DocumentChunk', DocumentChunkSchema);

export default DocumentChunk;
