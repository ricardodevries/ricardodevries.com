import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ base: "src/content/blog", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    metaDescription: z.string().optional(),
    heroImage: z.string().optional(),
    prompt: z.string().optional(),
    heroImageGenerator: z.enum(["unsplash", "midjourney"]).optional(),
    categories: z.array(z.string()).optional(),
    keywords: z.array(z.string()).optional(),
    status: z.enum(["draft", "published"]).optional(),
    imgCredits: z
      .object({
        username: z.string().optional(),
        url: z.string().optional(),
      })
      .optional(),
    pubDate: z
      .string()
      .or(z.date())
      .transform((val) => new Date(val)),
    updatedDate: z
      .string()
      .optional()
      .transform((str) => (str ? new Date(str) : undefined)),
  }),
});

export const collections = { blog };
