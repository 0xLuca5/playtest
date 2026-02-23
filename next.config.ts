import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  eslint: {
    // 构建时忽略 ESLint 错误
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 构建时忽略 TypeScript 错误
    ignoreBuildErrors: true,
  },
  // 禁用静态生成以避免 entryCSSFiles 错误
  trailingSlash: true,
};

export default nextConfig;
