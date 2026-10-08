/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    "@resvg/resvg-js",
    // Native module — the local catalog's SQLite store.
    "better-sqlite3",
    // Add other native modules you use in server routes here:
    // "sharp",
  ],
};

module.exports = nextConfig;
