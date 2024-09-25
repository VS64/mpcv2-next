import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.monplancbd.fr",
        pathname: "/wp-content/uploads/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
