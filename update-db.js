const db = require('./lib/db'); // Adjust path based on execution location

async function run() {
  try {
    const connection = await db.getConnection();
    
    try {
      await connection.execute(`ALTER TABLE order_items ADD COLUMN reuploaded_artwork_json JSON DEFAULT NULL`);
      console.log('Added reuploaded_artwork_json');
    } catch (e) {
      console.log('reuploaded_artwork_json might already exist:', e.message);
    }
    
    try {
      await connection.execute(`ALTER TABLE order_items ADD COLUMN replacement_artwork_json JSON DEFAULT NULL`);
      console.log('Added replacement_artwork_json');
    } catch (e) {
      console.log('replacement_artwork_json might already exist:', e.message);
    }

    connection.release();
    console.log('Database update complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error connecting to DB:', error);
    process.exit(1);
  }
}

run();
