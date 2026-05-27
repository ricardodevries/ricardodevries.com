import type { APIRoute } from "astro";
import { ogImage } from "@/lib/og";

export const GET: APIRoute = async ({ request, site }) => {
  // Get the title and description from the query params
  const url = new URL(request.url);
  const params = new URLSearchParams(url.search);

  const data = {
    title: params.get("title") ?? "",
  };

  const { title } = data;

  return new Response(
    new Uint8Array(
      await ogImage({
        title: title as string,
        origin: url.origin,
        siteName: site?.hostname ?? url.hostname,
      })
    ),
    {
      headers: { "Content-Type": "image/png" },
    }
  );
};
