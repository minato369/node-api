// db.js
import mysql from 'mysql2';
import dotenv from "dotenv";
// const database = mysql.createConnection({
// 	connectionLimit: process.env.DB_CONNECTION_LIMIT,
// 	host: 'localhost',
// 	user: 'root',
// 	password: 'mysql',
// 	database: 'node-api',
// });
dotenv.config();
const database = mysql.createConnection({
	connectionLimit: process.env.DB_CONNECTION_LIMIT,
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
	namedPlaceholders: true
});

export default database;
