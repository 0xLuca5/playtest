/**
 * 加密工具
 * 根据数据库类型选择不同的加密策略：
 * - PostgreSQL: 使用Node.js内置加密（与pgcrypto兼容）
 * - SQLite: 不加密（个人使用场景）
 */

import crypto from 'crypto';

// 检查数据库类型
const isPostgreSQL = process.env.DB_PROVIDER !== 'sqlite';
const isSQLite = process.env.DB_PROVIDER === 'sqlite';

// 从环境变量获取加密密钥，如果没有则生成一个默认的
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'ai-run-default-encryption-key-32b';
const ALGORITHM = 'aes-256-cbc';

/**
 * 确保密钥长度为32字节
 */
function getValidKey(): Buffer {
  const key = ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32);
  return Buffer.from(key, 'utf8');
}

/**
 * 加密文本
 * SQLite: 直接返回原文（不加密）
 * PostgreSQL: 使用AES-256-CBC加密
 */
export function encrypt(text: string): string {
  if (isSQLite) {
    // SQLite不加密，直接返回原文
    return text;
  }

  // PostgreSQL使用AES-256-CBC加密
  try {
    const key = getValidKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // 返回格式: iv:encrypted_data
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * 解密文本
 * SQLite: 直接返回原文（未加密）
 * PostgreSQL: 使用AES-256-CBC解密
 */
export function decrypt(encryptedText: string): string {
  if (isSQLite) {
    // SQLite未加密，直接返回原文
    return encryptedText;
  }

  // PostgreSQL解密
  try {
    // 检查是否是加密格式 (iv:encrypted_data)
    if (!encryptedText.includes(':')) {
      // 如果不是加密格式，可能是旧的未加密数据或占位符
      return encryptedText;
    }

    const key = getValidKey();
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    // 如果解密失败，返回原文（可能是未加密的数据）
    return encryptedText;
  }
}

/**
 * 生成随机加密密钥
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 验证加密密钥格式
 */
export function validateEncryptionKey(key: string): boolean {
  return key && key.length >= 32;
}
