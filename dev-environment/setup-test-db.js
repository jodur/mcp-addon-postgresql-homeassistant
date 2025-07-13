#!/usr/bin/env node

/**
 * Database setup script for development testing
 */

const { Client } = require('pg');
require('dotenv').config();

async function setupTestDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in .env file');
    process.exit(1);
  }

  console.log('🗄️ Setting up test database schema...\n');

  const client = new Client({ connectionString: databaseUrl });
  
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Create test tables
    console.log('📋 Creating test tables...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created users table');

    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        stock INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created products table');

    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'pending',
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);
    console.log('✅ Created orders table');

    // Insert sample data
    console.log('📊 Inserting sample data...');
    
    await client.query(`
      INSERT INTO users (username, email) VALUES
        ('admin', 'admin@example.com'),
        ('testuser', 'test@example.com'),
        ('developer', 'dev@example.com')
      ON CONFLICT (username) DO NOTHING
    `);
    console.log('✅ Inserted sample users');

    await client.query(`
      INSERT INTO products (name, description, price, stock) VALUES
        ('Test Widget A', 'A test widget for development', 19.99, 100),
        ('Test Widget B', 'Another test widget', 29.99, 50),
        ('Test Widget C', 'Premium test widget', 49.99, 25)
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Inserted sample products');

    // Create indexes
    console.log('🔍 Creating indexes...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)');
    console.log('✅ Created indexes');

    console.log('\n🎉 Test database setup complete!');
    console.log('\n📊 Sample data available:');
    console.log('   - 3 test users (admin, testuser, developer)');
    console.log('   - 3 test products');
    console.log('   - Sample orders (if any)');
    console.log('\n🧪 Test queries you can try:');
    console.log('   SELECT * FROM users;');
    console.log('   SELECT * FROM products;');
    console.log('   SELECT COUNT(*) FROM orders;');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupTestDatabase();
