import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import svelte from "@astrojs/svelte";
import node from "@astrojs/node";
import { rehypePlugins, remarkPlugins } from "./config/plugins";
import db from "@astrojs/db";

// https://astro.build/config
export default defineConfig({
  site: "https://vorillaz.com",
  prefetch: true,
  markdown: {
    smartypants: true,
    syntaxHighlight: false,
    rehypePlugins,
    remarkPlugins,
  },
  integrations: [mdx(), svelte({ preprocess: [] }), sitemap(), db()],
  vite: {
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
  },
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
});
