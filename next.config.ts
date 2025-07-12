import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 移除 output: 'standalone' 来避免符号链接问题
  // output: 'standalone', // 注释掉这行

  // 修复 turbo 配置
  turbopack: {
    // 如果需要的话可以添加 turbopack 配置
  },

  // 移除无效的 telemetry 配置
  // telemetry: false, // 注释掉这行

  // 在生产环境中禁用 source maps
  ...(process.env.NODE_ENV === 'production' && {
    productionBrowserSourceMaps: false,
  }),

  // 添加 Windows 兼容性设置
  webpack: (config, { isServer }) => {
    // 在 Windows 上避免符号链接问题
    if (process.platform === 'win32') {
      config.resolve.symlinks = false;
    }
    return config;
  },
};

export default nextConfig;