/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // konva ships a Node entry that imports the optional `canvas` package.
    // We never run Konva server-side (the canvas component is dynamic +
    // ssr:false), so tell webpack to leave `canvas` as an external rather
    // than trying to bundle it.
    config.externals = config.externals || [];
    config.externals.push({ canvas: "commonjs canvas" });
    return config;
  },
};

export default nextConfig;
