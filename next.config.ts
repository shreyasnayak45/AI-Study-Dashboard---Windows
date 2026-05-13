import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  output: "standalone",

  // Only import the specific icon/component exports that are actually used,
  // instead of loading the entire package. Reduces JS bundle size and
  // dramatically speeds up HMR in development.
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "recharts"],
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
