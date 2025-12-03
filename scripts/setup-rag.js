const ragService = require('../services/ragService');

async function setupRAG() {
  console.log('Setting up RAG system...');
  
  try {
    await ragService.initialize();
    console.log('✓ RAG service initialized');
    
    const testEmbedding = await ragService.generateEmbedding('Test fitness query');
    console.log('✓ Embedding generation working');
    
    console.log('RAG system setup complete!');
    console.log('\nNext steps:');
    console.log('1. Configure Google Cloud credentials');
    console.log('2. Set up AlloyDB connection string');
    console.log('3. Ingest fitness documents');
    
  } catch (error) {
    console.error('RAG setup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  setupRAG();
}

module.exports = setupRAG;