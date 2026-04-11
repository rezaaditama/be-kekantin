import mysql from 'mysql2/promise';

if (!process.env.DB_HOST) {
    console.warn("Peringatan: DB_HOST tidak terbaca di db.ts!");
}

// Connection to database
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'canteen_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
})

export default db;