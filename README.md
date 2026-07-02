# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

---

## Deployment

This template is fully **platform-agnostic** and can be deployed to Cloudflare, Vercel, Netlify, or a self-hosted Node.js VPS.

### Option 1: VPS (Node.js) / Docker
To deploy on a VPS (like DigitalOcean, Hetzner, AWS, etc.) using Node.js:

1. **Clone the repository** to your server.
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure environment variables**: Create a `.env` file in the root directory and ensure you set:
   ```env
   ASTRO_ADAPTER=node
   SHOPIFY_SHOP_DOMAIN=your-shop.myshopify.com
   SHOPIFY_STOREFRONT_PRIVATE_TOKEN=shpat_...
   ```
4. **Build the application**:
   ```bash
   npm run build:node
   ```
5. **Start the standalone Node server**:
   - For basic testing:
     ```bash
     npm run start:node
     ```
   - **Using PM2** (Recommended for production process management):
     ```bash
     npm install -g pm2
     pm2 start dist/server/entry.mjs --name "velvet-storefront"
     pm2 save
     pm2 startup
     ```
6. **Reverse Proxy (Nginx)**: Configure your Nginx block to reverse-proxy port `4321` (or the port set in `PORT` env var) to your domain:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       location / {
           proxy_pass http://localhost:4321;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

### Option 2: Cloudflare Workers
Connect the repo to a Cloudflare Worker (Workers & Pages → Import a repository) and set the **Build** configuration exactly as below:
- **Build command**: `npm run build`
- **Deploy command**: `npx wrangler deploy`

---

### Option 3: Vercel & Netlify
Deploy directly through your hosting provider's dashboard by connecting your git repository. The runtime environment is auto-detected, so you do not need to configure the `ASTRO_ADAPTER` variable. Just add the Shopify credentials to your dashboard's environment variables.
