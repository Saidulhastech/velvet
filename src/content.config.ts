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
    author: z.string().default('Hélène Arden'),
    authorRole: z.string().default('Founder & Creative Director'),
    authorBio: z.string().default('Hélène founded Maison Arden in Paris in 2014 with a single cashmere coat and a belief that fewer, finer things are worth keeping. She writes on craft, materials and dressing with intention.'),
    authorImage: z.string().default('Product Image 17.png'),
  }),
});

export const collections = { ethos, materials, blog };
