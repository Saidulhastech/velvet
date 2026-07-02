// @ts-check
import { defineConfig, envField, sessionDrivers } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import node from '@astrojs/node';
import vercel from '@astrojs/vercel';
import netlify from '@astrojs/netlify';

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
  output: 'server',
  adapter: getAdapter(),
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
    },
  },
  image: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.shopify.com' },
    ],
  },
});
