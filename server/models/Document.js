import mongoose from 'mongoose';

const DocumentSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  
  // File information
  filename: { type: String, required: true }, // Stored filename (e.g., "doc_123456.pdf")
  originalName: { type: String, required: true }, // Original upload name
  fileSize: { type: Number }, // Size in bytes
  pageCount: { type: Number },
  
  // Vector DB metadata
  vectorCount: { type: Number, default: 0 }, // Number of chunks created
  
  // Processing status
  status: { 
    type: String, 
    enum: ['processing', 'ready', 'failed'],
    default: 'processing',
    index: true
  },
  
  errorMessage: { type: String }, // Error details if failed
  
  // Optional metadata for display/search
  tags: [String],
  description: String,
  
  // Timestamps
  uploadedAt: { type: Date, default: Date.now },
  processedAt: { type: Date }
}, {
  timestamps: true
});

// Index for efficient user queries
DocumentSchema.index({ userId: 1, status: 1 });
DocumentSchema.index({ userId: 1, uploadedAt: -1 });

const Document = mongoose.model('Document', DocumentSchema);

export default Document;
