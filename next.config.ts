import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.178.32'],
  // outputFileTracingIncludes used to ship content/legal/** with the /terms and
  // /privacy functions, because those pages read the markdown off disk at request
  // time. They now render published versions from the Legal Documents CMS, so there
  // is nothing on disk for them to bundle.
};

export default nextConfig;
