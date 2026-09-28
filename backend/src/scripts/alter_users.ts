import pool from '../config/database.js';

async function run() {
  try {
    await pool.query('ALTER TABLE users ADD COLUMN resetToken VARCHAR(255) NULL');
    console.log('Added resetToken column to users table');
  } catch (err: any) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column resetToken already exists.');
    } else {
      console.error(err);
    }
  } finally {
    process.exit(0);
  }
}

run();
