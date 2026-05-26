import type { APIRoute } from "astro";
import { detectBot } from "../../lib/ai-crawlers";
import {
  sanitizePath,
  sanitizeReferrer,
  getClientIp,
  getGeoData,
  trackPageView,
  computeFingerprint,
} from "../../lib/analytics";

export const POST: APIRoute = async ({ request }) => {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    if (!body || typeof body !== "object") {
      return new Response(
        JSON.stringify({ error: "Request body must be an object" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    const { path: rawPath, referrer: rawReferrer } = body as Record<
      string,
      unknown
    >;

    const path = sanitizePath(rawPath as string);
    if (!path) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing path parameter" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    const userAgent = request.headers.get("user-agent");
    const botName = detectBot(userAgent);
    const clientIp = getClientIp(request);
    const geo = getGeoData(clientIp);
    const fingerprint = computeFingerprint(clientIp, userAgent);

    await trackPageView({
      path,
      referrer: sanitizeReferrer(rawReferrer as string) || null,
      botName,
      fingerprint,
      ...geo,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
};
