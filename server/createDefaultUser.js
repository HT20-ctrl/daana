import pg from 'pg';
import crypto from 'crypto';

const { Pool } = pg;

// Create a default user in the database to be used when authentication is not available
async function createDefaultUser() {
  console.log("Checking for default user...");
  
  // Connect to the database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    // Check if a user with role 'admin' already exists
    const checkResult = await pool.query(`
      SELECT * FROM users WHERE role = 'admin' LIMIT 1
    `);
    
    if (checkResult.rows.length > 0) {
      console.log(`Default user already exists with ID: ${checkResult.rows[0].id}`);
      return checkResult.rows[0];
    }
    
    // Create a default user
    const userId = crypto.randomUUID();
    const insertResult = await pool.query(`
      INSERT INTO users (id, email, first_name, last_name, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      userId,
      'demo@example.com',
      'Demo',
      'User',
      'admin',
      new Date(),
      new Date()
    ]);
    
    console.log(`Created default user with ID: ${insertResult.rows[0].id}`);
    
    return insertResult.rows[0];
  } catch (error) {
    console.error("Error creating default user:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run immediately
createDefaultUser()
  .then(user => {
    console.log("Default user setup complete.");
    process.exit(0);
  })
  .catch(error => {
    console.error("Default user setup failed:", error);
    process.exit(1);
  });