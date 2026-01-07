const nextConfig = {
  output: 'export',
  // Required for GitHub Pages to load assets correctly
  basePath: process.env.NODE_ENV === 'production' ? '/MetricHUB' : '',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
