// @ts-check
import { defineConfig, envField } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    platformProxy: { enabled: true },
    imageService: 'passthrough',
  }),
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
