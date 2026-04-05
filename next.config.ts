import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Google Drive画像を表示するため
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "drive.google.com",
      },
    ],
  },
  // ffmpeg.wasmのためのヘッダー設定（動画ページのみ）
  async headers() {
    return [
      {
        source: "/video",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;
