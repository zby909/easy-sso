import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

/**
 * 加载环境变量。
 * 首先加载根目录下的 .env 文件，然后根据 NODE_ENV 环境变量加载特定环境的 .env 文件（例如 .env.development），
 * 后者会覆盖前者的同名变量。
 */
const loadEnv = () => {
  // 加载 .env 文件
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });

  // 加载特定环境的 .env 文件
  const NODE_ENV = process.env.NODE_ENV?.trim();
  if (NODE_ENV) {
    const envPath = path.resolve(process.cwd(), `.env.${NODE_ENV}`);
    console.log('尝试加载环境文件:', envPath);
    const envExists = fs.existsSync(envPath);
    console.log('环境文件是否存在:', envExists);
    if (envExists) {
      dotenv.config({ path: envPath, override: true });
      console.log('成功加载环境文件:', envPath);
    }
  }
};

loadEnv();
