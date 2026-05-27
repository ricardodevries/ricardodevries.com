import type { APIRoute } from "astro";
import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

export const GET: APIRoute = async (context) => {
  const posts = await getCollection("blog");
  const site = context.site ?? new URL("https://ricardodevries.com");

  return rss({
    title: site.hostname,
    description: "A blog about web development and design",
    site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      link: `/blog/${post.id}`,
      pubDate: post.data.pubDate,
    })),
  });
};
