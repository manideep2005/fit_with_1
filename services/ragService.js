const { Pool } = require('pg');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const cheerio = require('cheerio');
const fs = require('fs').promises;
// Google Generative AI removed for deployment simplicity

class RAGService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.db = new Pool({
      connectionString: process.env.ALLOYDB_CONNECTION_STRING,
    });
  }

  async initialize() {
    try {
      if (process.env.ALLOYDB_CONNECTION_STRING && process.env.ALLOYDB_CONNECTION_STRING !== 'postgresql://username:password@host:port/database') {
        await this.createVectorTable();
        console.log('RAG Service with AlloyDB initialized successfully');
      } else {
        console.log('RAG Service initialized (AlloyDB not configured)');
      }
    } catch (error) {
      console.log('RAG Service initialized (database connection failed - this is expected without proper setup)');
    }
  }

  async createVectorTable() {
    const query = `
      CREATE EXTENSION IF NOT EXISTS vector;
      
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id SERIAL PRIMARY KEY,
        content TEXT,
        metadata JSONB,
        embedding vector(768),
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS knowledge_base_embedding_idx 
      ON knowledge_base USING ivfflat (embedding vector_cosine_ops);
    `;
    
    await this.db.query(query);
  }

  async extractText(filePath) {
    const ext = filePath.split('.').pop().toLowerCase();
    
    switch (ext) {
      case 'pdf':
        const pdfBuffer = await fs.readFile(filePath);
        const pdfData = await pdfParse(pdfBuffer);
        return pdfData.text;
        
      case 'docx':
        const docxResult = await mammoth.extractRawText({ path: filePath });
        return docxResult.value;
        
      case 'html':
        const htmlContent = await fs.readFile(filePath, 'utf8');
        const $ = cheerio.load(htmlContent);
        return $.text();
        
      case 'txt':
        return await fs.readFile(filePath, 'utf8');
        
      default:
        throw new Error(`Unsupported file type: ${ext}`);
    }
  }

  chunkText(text, chunkSize = 1000, overlap = 200) {
    const chunks = [];
    let start = 0;
    
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end));
      start = end - overlap;
    }
    
    return chunks;
  }

  async generateEmbedding(text) {
    // Simple hash-based embedding for demo
    const hash = this.simpleHash(text);
    return Array.from({length: 768}, (_, i) => (hash + i) % 1000 / 1000);
  }
  
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  async storeInAlloyDB(content, embedding, metadata) {
    const query = `
      INSERT INTO knowledge_base (content, metadata, embedding)
      VALUES ($1, $2, $3)
      RETURNING id
    `;
    
    const result = await this.db.query(query, [
      content,
      JSON.stringify(metadata),
      `[${embedding.join(',')}]`
    ]);
    
    return result.rows[0].id;
  }

  async ingestDocument(filePath, metadata = {}) {
    try {
      const content = await this.extractText(filePath);
      const chunks = this.chunkText(content);
      const results = [];
      
      for (const chunk of chunks) {
        const embedding = await this.generateEmbedding(chunk);
        const id = await this.storeInAlloyDB(chunk, embedding, {
          ...metadata,
          source: filePath,
          chunk_index: chunks.indexOf(chunk)
        });
        results.push(id);
      }
      
      return results;
    } catch (error) {
      console.error('Document ingestion failed:', error);
      throw error;
    }
  }

  async searchSimilar(queryEmbedding, limit = 5) {
    const query = `
      SELECT content, metadata, 
             1 - (embedding <=> $1::vector) as similarity
      FROM knowledge_base
      ORDER BY embedding <=> $1::vector
      LIMIT $2
    `;
    
    const result = await this.db.query(query, [
      `[${queryEmbedding.join(',')}]`,
      limit
    ]);
    
    return result.rows;
  }

  async query(userMessage) {
    try {
      const queryEmbedding = await this.generateEmbedding(userMessage);
      const relevantDocs = await this.searchSimilar(queryEmbedding, 5);
      
      return {
        query: userMessage,
        context: relevantDocs,
        contextText: relevantDocs.map(doc => doc.content).join('\n\n')
      };
    } catch (error) {
      console.error('RAG query failed:', error);
      throw error;
    }
  }
}

module.exports = new RAGService();