const mysql = require('mysql2');
require('dotenv').config();

let pool;

if (process.env.MYSQL_URL) {
    pool = mysql.createPool(process.env.MYSQL_URL);
} else {
    pool = mysql.createPool({
        host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
        user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
        password: process.env.MYSQLPASSWORD || process.env.DB_PASS || '',
        database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'kelas_db',
        port: process.env.MYSQLPORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        // Railway MySQL sometimes requires this for connections from outside
        ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    });
}

module.exports = pool.promise();
