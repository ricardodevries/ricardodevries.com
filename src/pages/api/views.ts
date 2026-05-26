import type { APIRoute } from "astro";
import { db, Views, Visitors, sql, eq } from "astro:db";
import { detectBot } from "../../lib/ai-crawlers";
import {
  computeFingerprint,
  getClientIp,
  getDateKey,
} from "../../lib/analytics";

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return new Response("Not found", { status: 404 });
  }

  const userAgent = request.headers.get("user-agent");
  const clientIp = getClientIp(request);
  const isBot = Boolean(detectBot(userAgent));
  const fingerprint = isBot ? null : computeFingerprint(clientIp, userAgent);
  const dateKey = getDateKey();

  let count = 1;

  try {
    let bumped = false;

    if (fingerprint) {
      const inserted = await db
        .insert(Visitors)
        .values({
          id: `${id}:${fingerprint}:${dateKey}`,
          postId: id,
          fingerprint,
          date: dateKey,
        })
        .onConflictDoNothing()
        .returning({ id: Visitors.id });

      if (inserted.length > 0) {
        const upserted = await db
          .insert(Views)
          .values({ id, count: 1 })
          .onConflictDoUpdate({
            target: Views.id,
            set: { count: sql`count + 1` },
          })
          .returning({ count: Views.count });
        count = upserted[0]?.count ?? 1;
        bumped = true;
      }
    }

    if (!bumped) {
      const existing = await db
        .select({ count: Views.count })
        .from(Views)
        .where(eq(Views.id, id));
      count = existing[0]?.count ?? 0;
    }
  } catch (error) {
    console.error("Views error:", error);
  }

  return new Response(
    JSON.stringify({
      id,
      count,
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
