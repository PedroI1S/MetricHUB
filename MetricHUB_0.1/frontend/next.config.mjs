const repo = 'MetricHUB'
const isProd = process.env.NODE_ENV === 'production'
 
const nextConfig = {
  output: 'export',
  // Site servido em https://<user>.github.io/MetricHUB/ (subpasta).
  // basePath/assetPrefix garantem que CSS e JS sejam buscados em /MetricHUB/_next/...
  basePath: isProd ? `/${repo}` : '',
  assetPrefix: isProd ? `/${repo}/` : '',
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
}
 
export default nextConfig
