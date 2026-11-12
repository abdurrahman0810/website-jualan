const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
let supabaseHostname = '*.supabase.co'

if (supabaseUrl) {
  try {
    supabaseHostname = new URL(supabaseUrl).hostname
  } catch {
    // Keep the Supabase wildcard fallback while a local URL is being configured.
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: supabaseHostname },
    ],
  },
}

export default nextConfig
