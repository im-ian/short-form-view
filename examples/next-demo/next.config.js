// Static export + basePath are enabled only for the GitHub Pages build
// (GITHUB_PAGES=true), so local `next dev` and the Playwright `next start`
// harness keep working at the root path.
const isPages = process.env.GITHUB_PAGES === 'true'
const repo = 'short-form-view'

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['short-form-view'],
  reactStrictMode: true,
  ...(isPages
    ? {
        output: 'export',
        basePath: `/${repo}`,
        assetPrefix: `/${repo}/`,
        images: { unoptimized: true },
      }
    : {}),
}

module.exports = nextConfig
