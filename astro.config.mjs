// @ts-check
import { defineConfig, envField, fontProviders, sessionDrivers } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import node from '@astrojs/node';
import vercel from '@astrojs/vercel';
import netlify from '@astrojs/netlify';
import sitemap from '@astrojs/sitemap';

function getAdapter() {
  const target = process.env.ASTRO_ADAPTER;
  if (target === "node") {
    return node({ mode: "standalone" });
  }
  if (target === "vercel" || process.env.VERCEL === "1" || process.env.VERCEL === "true") {
    return vercel();
  }
  if (target === "netlify" || process.env.NETLIFY === "true") {
    return netlify();
  }
  if (target === "cloudflare" || process.env.CF_PAGES === "1") {
    return cloudflare({ platformProxy: { enabled: true }, imageService: "passthrough" });
  }
  // Default fallback
  return cloudflare({ platformProxy: { enabled: true }, imageService: "passthrough" });
}

// https://astro.build/config
export default defineConfig({
  // Set this to your production domain — drives canonical URLs + sitemap.
  site: 'https://maisonarden.com',
  output: 'server',
  adapter: getAdapter(),
  integrations: [
    sitemap({
      // Keep private/functional routes out of the sitemap.
      filter: (page) =>
        !/\/(account|cart|search)(\/|$|\?)/.test(page) && !page.includes('/api/'),
    }),
  ],
  // Self-hosted fonts (no render-blocking Google Fonts request, GDPR-friendly).
  // Family names match the CSS in variables.css, so no style changes needed.
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--font-inter',
      weights: [300, 400, 500, 600, 700],
      styles: ['normal'],
    },
    {
      provider: fontProviders.google(),
      name: 'Cormorant Garamond',
      cssVariable: '--font-cormorant',
      weights: [400, 500, 600],
      styles: ['normal', 'italic'],
    },
  ],
  session: {
    driver: sessionDrivers.lruCache(),
  },
  env: {
    schema: {
      SHOPIFY_SHOP_DOMAIN: envField.string({ context: 'server', access: 'secret' }),
      SHOPIFY_STOREFRONT_PRIVATE_TOKEN: envField.string({ context: 'server', access: 'secret' }),
      SHOPIFY_API_VERSION: envField.string({ context: 'server', access: 'secret', optional: true }),
      CUSTOMER_ACCOUNT_API_CLIENT_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
      SHOPIFY_SHOP_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
      CUSTOMER_ACCOUNT_API_VERSION: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Judge.me private API token (Settings > Integrations > View API tokens).
      // Only needed to READ reviews server-side; submitting a review uses
      // Judge.me's public create-review endpoint (no token). Optional so the
      // site still renders (reviews list empty) if not yet configured.
      JUDGEME_API_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  image: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.shopify.com' },
    ],
  },
});
