import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "mammoth"],
  allowedDevOrigins: [
    "localhost:3000",
    "127.0.0.1:3000",
    "*.trycloudflare.com",
    "olympic-communicate-trained-youth.trycloudflare.com"
  ],
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
