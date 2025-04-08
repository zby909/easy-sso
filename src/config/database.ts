/*
 * @Description:
 * @Author: zby
 * @Date: 2024-06-18 16:18:30
 * @LastEditors: zby
 * @Reference:
 */
// src/config/database.js
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;
