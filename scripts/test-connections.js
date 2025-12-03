const { Pool } = require('pg');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testConnections() {
  console.log('Testing RAG system connections...\n');

  // Test AlloyDB connection
  try {
    const pool = new Pool({
      connectionString: process.env.ALLOYDB_CONNECTION_STRING,
    });
    
    const result = await pool.query('SELECT 1 as test');
    console.log('✓ AlloyDB connection successful');
    await pool.end();
  } catch (error) {
    console.log('✗ AlloyDB connection failed:', error.message);
  }

  // Test Gemini AI connection
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const result = await model.generateContent('Hello');
    console.log('✓ Gemini AI connection successful');
  } catch (error) {
    console.log('✗ Gemini AI connection failed:', error.message);
  }

  console.log('\nConnection test complete!');
}

if (require.main === module) {
  testConnections();
}

module.exports = testConnections;