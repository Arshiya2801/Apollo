import { pipeline } from '@xenova/transformers';

/**
 * Embedding Service using Transformers.js
 * Model: all-MiniLM-L6-v2 (384 dimensions)
 * 
 * This runs embeddings locally without any API costs.
 * First run will download the model (~80MB), then cached.
 */

let embedder = null;

/**
 * Initialize the embedding model (lazy loading)
 * Downloads model on first call, then caches it
 */
async function initEmbedder() {
  if (!embedder) {
    console.log('[Embeddings] Initializing all-MiniLM-L6-v2 model...');
    try {
      embedder = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2'
      );
      console.log('[Embeddings] Model loaded successfully');
    } catch (error) {
      console.error('[Embeddings] Failed to load model:', error);
      throw new Error('Failed to initialize embedding model');
    }
  }
  return embedder;
}

/**
 * Generate embeddings for an array of texts
 * @param {string[]} texts - Array of text strings to embed
 * @returns {Promise<number[][]>} Array of embedding vectors (384-dim each)
 */
export async function embedTexts(texts) {
  if (!Array.isArray(texts) || texts.length === 0) {
    throw new Error('embedTexts requires a non-empty array of strings');
  }

  const model = await initEmbedder();
  const embeddings = [];

  for (const text of texts) {
    if (!text || typeof text !== 'string') {
      console.warn('[Embeddings] Skipping invalid text:', text);
      continue;
    }

    try {
      // Generate embedding with mean pooling and normalization
      const output = await model(text, { 
        pooling: 'mean', 
        normalize: true 
      });
      
      // Convert tensor to array
      const embedding = Array.from(output.data);
      
      // Verify dimensions
      if (embedding.length !== 384) {
        throw new Error(`Expected 384 dimensions, got ${embedding.length}`);
      }
      
      embeddings.push(embedding);
    } catch (error) {
      console.error('[Embeddings] Error embedding text:', error.message);
      throw error;
    }
  }

  console.log(`[Embeddings] Generated ${embeddings.length} embeddings`);
  return embeddings;
}

/**
 * Generate embedding for a single text
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} Embedding vector (384-dim)
 */
export async function embedText(text) {
  const [embedding] = await embedTexts([text]);
  return embedding;
}

/**
 * Calculate cosine similarity between two embeddings
 * @param {number[]} a - First embedding vector
 * @param {number[]} b - Second embedding vector
 * @returns {number} Cosine similarity (0 to 1)
 */
export function cosineSimilarity(a, b) {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export default {
  embedTexts,
  embedText,
  cosineSimilarity
};
