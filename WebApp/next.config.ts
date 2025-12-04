import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pino', 'thread-stream'],
  turbopack: {},
  webpack: (config) => {
    config.externals.push('pino-pretty', 'encoding');
    return config;
  },
};

export default nextConfig;
