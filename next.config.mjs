/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/plan", destination: "/roadmap", permanent: true },
      { source: "/timeline", destination: "/old", permanent: true },
      { source: "/timeline-2", destination: "/logbook", permanent: true },
      { source: "/timeline-2/:path*", destination: "/logbook/:path*", permanent: true },
    ]
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
