const { Pool } = require('pg');
require('dotenv').config();

async function setupDatabase() {
  const pool = new Pool({
    connectionString: process.env.ALLOYDB_CONNECTION_STRING,
  });

  try {
    console.log('Setting up database schema...');

    // Enable vector extension
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('✓ Vector extension enabled');

    // Create knowledge base table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        embedding vector(768),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    await pool.query(createTableQuery);
    console.log('✓ Knowledge base table created');

    // Create vector index
    const createIndexQuery = `
      CREATE INDEX IF NOT EXISTS knowledge_base_embedding_idx 
      ON knowledge_base USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    `;
    await pool.query(createIndexQuery);
    console.log('✓ Vector index created');

    // Create metadata indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS knowledge_base_metadata_idx 
      ON knowledge_base USING GIN (metadata);
    `);
    console.log('✓ Metadata index created');

    // Test connection
    const result = await pool.query('SELECT version();');
    console.log('✓ Database connection successful');
    console.log(`Database version: ${result.rows[0].version}`);

    await pool.end();
    console.log('\nDatabase setup complete!');

  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;