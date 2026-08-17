import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This project sits inside a general coursework folder that has its own
  // unrelated package-lock.json (a separate Vite project one level up) --
  // Turbopack's root auto-detection walks up looking for a lockfile and
  // picks that one by mistake. Pin it explicitly instead.
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
