import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.178.32'],
  // TEMPORARY, for diagnosing BUG-067. A minified React error #310 on /mentor/onboarding gives a
  // stack of the form "17~ulm17ctn6p.js:1:65130", which names nothing, and the bug only reproduces
  // on a deployed build. Source maps make the console stack name the file and line.
  // REMOVE once BUG-067 is identified: this enlarges the bundle and publishes the source.
  productionBrowserSourceMaps: true,
  // Ship the legal markdown files with the /terms and /privacy serverless functions.
  outputFileTracingIncludes: {
    '/terms': ['./content/legal/**'],
    '/privacy': ['./content/legal/**'],
  },
};

export default nextConfig;
