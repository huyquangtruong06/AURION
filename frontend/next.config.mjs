/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    // Chỉ dùng rewrites trong development
    // Production sẽ dùng NEXT_PUBLIC_API_URL trực tiếp
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:8000/api/:path*',
        },
      ]
    }
    return []
  },
};

export default nextConfig;
