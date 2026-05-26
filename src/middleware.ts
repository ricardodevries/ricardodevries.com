import { defineMiddleware } from "astro:middleware";
import { detectBot, detectFeedReader } from "./lib/ai-crawlers";
import {
  isPageRequest,
  getClientIp,
  getGeoData,
  trackPageView,
  computeFingerprint,
  anonymizeOldFingerprints,
} from "./lib/analytics";

export const onRequest = defineMiddleware(async ({ request, url }, next) => {
  anonymizeOldFingerprints();

  const userAgent = request.headers.get("user-agent");
  const referrer = request.headers.get("referer");
  const clientIp = getClientIp(request);
  const response = await next();

  if (!userAgent) return response;
  if (!isPageRequest(url)) return response;
  if (url.pathname.startsWith("/analytics")) return response;

  const is404 = response.status === 404;
  const botName = detectBot(userAgent);
  const feedReader = !botName ? detectFeedReader(userAgent) : null;
  const shouldTrack = botName || feedReader || is404;

  if (!shouldTrack) return response;
  if (!is404 && !response.ok) return response;

  try {
    const geo = getGeoData(clientIp);
    const fingerprint = computeFingerprint(clientIp, userAgent);
    const label = botName ?? feedReader;
    const path = is404 ? `404:${url.pathname}` : url.pathname;

    await trackPageView({
      path,
      referrer,
      botName: label,
      fingerprint,
      ...geo,
    });
  } catch (error) {
    console.error("Tracking error:", error);
  }

  return response;
});
