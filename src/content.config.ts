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

const materials = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: "./src/content/materials" }),
  schema: z.object({
    title: z.string(),
    origin: z.string(),
    weight: z.string().optional(),
    certification: z.string().optional(),
    order: z.number().optional(),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    category: z.string(),
    date: z.string(),
    readTime: z.string(),
    image: z.string(),
    excerpt: z.string(),
    order: z.number().optional(),
  }),
});

export const collections = { ethos, materials, blog };
