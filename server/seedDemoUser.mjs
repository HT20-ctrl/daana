import pg from 'pg';
const { Pool } = pg;

// Configure database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function seedDemoUser() {
  console.log("Seeding demo user...");

  const client = await pool.connect();
  try {
    // Check if demo user exists
    const checkResult = await client.query(`
      SELECT id FROM users WHERE id = '1'
    `);
    
    if (checkResult.rows.length === 0) {
      // Insert demo user
      await client.query(`
        INSERT INTO users (id, email, first_name, last_name, profile_image_url, role, created_at, updated_at)
        VALUES ('1', 'demo@example.com', 'Demo', 'User', 'https://ui-avatars.com/api/?name=Demo+User', 'admin', NOW(), NOW())
      `);
      console.log("Demo user created successfully");
    } else {
      console.log("Demo user already exists");
    }
    
  } catch (error) {
    console.error("Error seeding demo user:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the seeding function
seedDemoUser()
  .then(() => {
    console.log("Seeding completed successfully");
    process.exit(0);
  })
  .catch(err => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });