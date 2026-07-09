import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.178.32'],
  // Ship the legal markdown files with the /terms and /privacy serverless functions.
  outputFileTracingIncludes: {
    '/terms': ['./content/legal/**'],
    '/privacy': ['./content/legal/**'],
  },
};

export default nextConfig;
