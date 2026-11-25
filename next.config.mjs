/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/plan", destination: "/bills-and-income", permanent: true },
      { source: "/roadmap", destination: "/bills-and-income", permanent: true },
      { source: "/roadmap/:path*", destination: "/bills-and-income/:path*", permanent: true },
      { source: "/timeline", destination: "/old", permanent: true },
      { source: "/timeline-2", destination: "/captains-chair", permanent: true },
      { source: "/timeline-2/:path*", destination: "/captains-chair/:path*", permanent: true },
      { source: "/logbook", destination: "/captains-chair", permanent: true },
      { source: "/logbook/:path*", destination: "/captains-chair/:path*", permanent: true },
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
