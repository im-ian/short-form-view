// Static export + basePath are enabled only for the GitHub Pages build
// (GITHUB_PAGES=true), so local `next dev` and the Playwright `next start`
// harness keep working at the root path.
const isPages = process.env.GITHUB_PAGES === 'true'
const base = isPages ? '/short-form-view' : ''

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['short-form-view'],
  reactStrictMode: true,
  // Exposed to the client so asset URLs (videos) resolve under the Pages basePath.
  env: { NEXT_PUBLIC_BASE_PATH: base },
  ...(isPages
    ? {
        output: 'export',
        basePath: base,
        assetPrefix: `${base}/`,
        images: { unoptimized: true },
      }
    : {}),
}

module.exports = nextConfig
