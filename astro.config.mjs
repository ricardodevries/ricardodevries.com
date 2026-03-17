import { defineConfig, fontProviders } from "astro/config";
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
  fonts: [
    {
      name: "IBM Plex Sans",
      cssVariable: "--font-ibm-plex-sans",
      provider: fontProviders.local(),
      options: {
        variants: [
          {
            src: [
              "./src/assets/fonts/IBMPlexSans-Regular.woff2",
              "./src/assets/fonts/IBMPlexSans-Regular.ttf",
            ],
            weight: "400",
            style: "normal",
          },
          {
            src: ["./src/assets/fonts/IBMPlexSans-Italic.woff2"],
            weight: "400",
            style: "italic",
          },
          {
            src: ["./src/assets/fonts/IBMPlexSans-Medium.woff2"],
            weight: "500",
            style: "normal",
          },
          {
            src: ["./src/assets/fonts/IBMPlexSans-MediumItalic.woff2"],
            weight: "500",
            style: "italic",
          },
          {
            src: [
              "./src/assets/fonts/IBMPlexSans-SemiBold.woff2",
              "./src/assets/fonts/IBMPlexSans-SemiBold.ttf",
            ],
            weight: "600",
            style: "normal",
          },
          {
            src: ["./src/assets/fonts/IBMPlexSans-SemiBoldItalic.woff2"],
            weight: "600",
            style: "italic",
          },
        ],
      },
    },
    {
      name: "Mono Lisa",
      cssVariable: "--font-mono-lisa",
      provider: fontProviders.local(),
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/MonoLisaVariableNormal.woff2"],
          },
          {
            src: ["./src/assets/fonts/MonoLisaVariableItalic.woff2"],
          },
        ],
      },
    },
  ],
});
