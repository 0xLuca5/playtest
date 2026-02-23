/**
 * 游客身份管理工具
 */

import { generateUUID } from '@/lib/utils';

/**
 * 生成稳定的游客ID
 * 优先使用localStorage中的ID，如果不存在则生成新的随机ID
 */
export function generateStableGuestId(): string {
  if (typeof window === 'undefined') {
    // 服务端环境，生成随机ID
    return `guest-${generateUUID()}`;
  }

  // 检查localStorage中是否已有游客ID
  const existingGuestId = localStorage.getItem('ai-run-guest-id');
  if (existingGuestId) {
    return existingGuestId;
  }

  // 生成新的随机游客ID（加入时间戳确保唯一性）
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 15);
  const guestId = `guest-${timestamp}-${randomPart}`;

  // 存储到localStorage
  localStorage.setItem('ai-run-guest-id', guestId);

  return guestId;
}



/**
 * 获取当前游客ID
 */
export function getCurrentGuestId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('ai-run-guest-id');
}

/**
 * 清除游客ID（用于重置游客身份）
 */
export function clearGuestId(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('ai-run-guest-id');
  }
}

/**
 * 检查是否为游客用户
 */
export function isGuestUser(userId: string): boolean {
  return userId.startsWith('guest-');
}
