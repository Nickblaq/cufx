/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    "@resvg/resvg-js",
    // Add other native modules you use in server routes here:
    // "sharp",
  ],
};

module.exports = nextConfig;
