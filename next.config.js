const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use this app as tracing root when a lockfile exists above this directory (avoids wrong workspace root).
  outputFileTracingRoot: path.join(__dirname),
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/**',
      },
    ],
  },
  webpack(config) {
    // Allow SVG imports
    
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    return config;
  },
};

module.exports = nextConfig;
