// ============================================================
//  Asset resolver — maps a plain image filename (as stored in
//  content collections / config) to its optimized ImageMetadata
//  so components can feed it to Astro's <Image />.
//
//  Content stays decoupled from import paths: collections store
//  e.g. "hero-banner-watch.png" and components call resolveImage().
// ============================================================
import type { ImageMetadata } from 'astro';

// Eagerly import every image under src/assets/images as metadata.
const images = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/images/*.{jpg,jpeg,png,webp,avif,svg}',
  { eager: true },
);

// Index by bare filename for quick lookup.
const byName = new Map<string, ImageMetadata>();
for (const [path, mod] of Object.entries(images)) {
  const name = path.split('/').pop();
  if (name) byName.set(name, mod.default);
}

/**
 * Resolve a stored filename (e.g. "deal-watch.jpg") to its optimized
 * ImageMetadata. Throws in dev if the file is missing so typos surface
 * early instead of rendering a broken image.
 */
export function resolveImage(filename: string): ImageMetadata {
  const meta = byName.get(filename);
  if (!meta) {
    throw new Error(
      `[asset] Image "${filename}" not found in src/assets/images/. ` +
        `Available: ${[...byName.keys()].slice(0, 8).join(', ')}…`,
    );
  }
  return meta;
}

/** Non-throwing variant — returns undefined when the file is absent. */
export function tryResolveImage(filename?: string | null): ImageMetadata | undefined {
  if (!filename) return undefined;
  return byName.get(filename);
}
