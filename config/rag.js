module.exports = {
  // Vector database configuration
  vectorDimensions: 768,
  chunkSize: 1000,
  chunkOverlap: 200,
  
  // Search configuration
  defaultSearchLimit: 5,
  similarityThreshold: 0.7,
  
  // Supported file types
  supportedFileTypes: ['.pdf', '.docx', '.html', '.txt', '.md'],
  
  // Google Cloud configuration
  vertexAI: {
    model: 'textembedding-gecko@003',
    location: process.env.VERTEX_AI_LOCATION || 'us-central1',
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
  },
  
  // AlloyDB configuration
  alloyDB: {
    connectionString: process.env.ALLOYDB_CONNECTION_STRING,
    tableName: 'knowledge_base',
    indexType: 'ivfflat'
  }
};