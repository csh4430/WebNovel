/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*", // /api/로 시작하는 모든 요청을
        destination: "http://localhost:3001/api/:path*", // 백엔드로 전달
      },
    ];
  },
};

export default nextConfig;