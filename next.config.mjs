/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["postgres", "bcryptjs"],
  },
};

export default config;
