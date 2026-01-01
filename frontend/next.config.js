/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'ui-avatars.com'],
  },
  reactStrictMode: true,
  env:  {
    NEXT_PUBLIC_API_URL: process.env. NEXT_PUBLIC_API_URL,
  },
}

module.exports = nextConfig