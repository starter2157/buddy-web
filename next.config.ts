import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // No remote images are used; all artwork is inline SVG.
  images: { remotePatterns: [] },
};

export default nextConfig;
