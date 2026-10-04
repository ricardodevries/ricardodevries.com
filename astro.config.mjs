import { defineConfig, fontProviders } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import svelte, { vitePreprocess } from "@astrojs/svelte";
import node from "@astrojs/node";
import { rehypePlugins, remarkPlugins } from "./config/plugins";
import mermaid from "astro-mermaid";
import { unified } from "@astrojs/markdown-remark";

// https://astro.build/config
export default defineConfig({
  site: "https://ricardodevries.com",
  trailingSlash: "never",
  security: {
    allowedDomains: [
      {
        hostname: "ricardodevries.com",
        protocol: "https",
      },
    ],
  },
  prefetch: true,
  compressHTML: true,
  markdown: {
    syntaxHighlight: false,
    processor: unified({
      smartypants: true,
      rehypePlugins,
      remarkPlugins,
    }),
  },
  integrations: [
    mdx(),
    svelte({ preprocess: vitePreprocess() }),
    sitemap(),
    mermaid({
      enableLog: false,
      mermaidConfig: {
        fontFamily: "var(--font-ibm-plex-sans), sans-serif",
        themeVariables: { fontSize: "18px" },
        flowchart: {
          curve: "rounded",
          nodeSpacing: 32,
          rankSpacing: 48,
          padding: 20,
        },
        // Mermaid scopes these rules to each SVG, so they override its theme.
        themeCSS: `
          .node rect, .node circle, .node ellipse, .node polygon, .node path {
            fill: var(--diagram-node);
            stroke: var(--diagram-border);
            stroke-width: 1px;
            filter: drop-shadow(0 3px 5px var(--diagram-shadow));
          }
          .node rect { rx: 10px; ry: 10px; }
          .node .label, .nodeLabel, .edgeLabel { color: var(--diagram-text); }
          .label text, text { fill: var(--diagram-text); }
          .cluster rect {
            fill: var(--diagram-group);
            stroke: var(--diagram-border);
            stroke-width: 1px;
            rx: 14px;
            ry: 14px;
          }
          .cluster-label span, .cluster-label text {
            color: var(--diagram-accent-text);
            fill: var(--diagram-accent-text);
            font-weight: 500;
          }
          .flowchart-link { stroke: var(--diagram-line); stroke-width: 1.5px; }
          .marker { fill: var(--diagram-line); stroke: var(--diagram-line); }
          .edgeLabel, .edgeLabel p, .labelBkg { background: var(--diagram-bg); }
          .edgeLabel { font-size: 13px; }
          .edgeLabel rect { fill: var(--diagram-bg); }
          .accent rect, .accent polygon, .accent circle {
            fill: var(--diagram-accent);
            stroke: var(--diagram-accent-border);
          }
          .accent .label, .accent .nodeLabel { color: var(--diagram-accent-text); }
          .muted rect { fill: var(--diagram-group); }
          .muted .label, .muted .nodeLabel { color: var(--diagram-muted-text); }
        `,
      },
    }),
  ],
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
