import type { APIRoute } from "astro";
import { db, Views, sql, eq } from "astro:db";

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const params = new URLSearchParams(url.search);

  const id = params.get("id");

  if (!id) {
    return new Response("Not found", { status: 404 });
  }

  let item;
  try {
    await db
      .select({
        count: Views.count,
      })
      .from(Views)
      .where(eq(Views.id, id));

    item = await db
      .insert(Views)
      .values({
        id: id,
        count: 1,
      })
      .onConflictDoUpdate({
        target: Views.id,
        set: {
          count: sql`count + 1`,
        },
      })
      .returning({
        id: Views.id,
        count: Views.count,
      })
      .then((res) => res[0]);
  } catch (error) {
    item = { id, count: 1 };
  }

  return new Response(
    JSON.stringify({
      ...item,
      time: Date.now(),
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store, max-age=0",
      },
    }
  );
};
