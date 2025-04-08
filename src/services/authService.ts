/*
 * @Description:
 * @Author: zby
 * @Date: 2024-06-18 13:34:43
 * @LastEditors: zby
 * @Reference:
 */
// src/services/authService.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database.ts';

const saltRounds = 10;
const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret';

const register = async user => {
  const { email, password, name } = user;

  // 检查用户是否已存在
  const [rows] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
  if (rows.length > 0) {
    throw new Error('User already exists');
  }

  // 加密密码
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // 插入新用户记录
  const [result] = await pool.execute('INSERT INTO users (email, password, name) VALUES (?, ?, ?)', [email, hashedPassword, name]);

  return result.insertId;
};

const login = async (email, password) => {
  // 查找用户
  const [rows] = await pool.execute('SELECT id, password FROM users WHERE email = ?', [email]);
  if (rows.length === 0) {
    throw new Error('Invalid credentials');
  }

  const user = rows[0];

  // 验证密码
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw new Error('Invalid credentials');
  }

  // 生成 JWT 令牌
  const token = jwt.sign({ id: user.id, email }, jwtSecret, { expiresIn: '1h' });

  return token;
};

// CREATE TABLE users (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   email VARCHAR(255) NOT NULL UNIQUE,
//   password VARCHAR(255) NOT NULL,
//   name VARCHAR(255) NOT NULL,
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );

export default {
  register,
  login,
};
