import { defineCollection } from 'astro:content';
import { z } from 'astro:schema';
import { glob } from 'astro/loaders';

const ethos = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: "./src/content/ethos" }),
  schema: z.object({
    index: z.string(),
    title: z.string(),
    tag: z.string(),
    order: z.number().optional(),
  }),
});

export const collections = { ethos };
