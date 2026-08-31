// Quick script to check if chunks were created
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import DocumentChunk from './models/DocumentChunk.js';

dotenv.config();

async function checkChunks() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const count = await DocumentChunk.countDocuments();
    console.log(`📊 Total chunks in database: ${count}`);

    if (count > 0) {
      const sample = await DocumentChunk.findOne().select('text pageNumber embedding');
      console.log('\n📄 Sample chunk:');
      console.log('- Text preview:', sample.text.substring(0, 100) + '...');
      console.log('- Page number:', sample.pageNumber);
      console.log('- Embedding dimensions:', sample.embedding.length);
      console.log('\n✅ Chunks exist! The problem is likely the vector search index.');
    } else {
      console.log('\n❌ No chunks found! The PDF upload may have failed.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkChunks();
