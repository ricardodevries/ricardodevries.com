import { defineMiddleware } from "astro:middleware";
import { auth } from "@/auth";
import { detectBot, detectFeedReader } from "./lib/ai-crawlers";
import {
  isPageRequest,
  getClientIp,
  getGeoData,
  computeFingerprint,
  trackPageView,
  anonymizeOldFingerprints,
} from "./lib/analytics";

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url, isPrerendered } = context;

  context.locals.user = null;
  context.locals.session = null;

  if (!isPrerendered) {
    try {
      const authSession = await auth.api.getSession({
        headers: request.headers,
      });

      context.locals.user = authSession?.user ?? null;
      context.locals.session = authSession?.session ?? null;
    } catch (error) {
      console.error("Auth session error:", error);
    }
  }

  const response = await next();

  if (isPrerendered) {
    return response;
  }

  void anonymizeOldFingerprints();

  const userAgent = request.headers.get("user-agent");
  const referrer = request.headers.get("referer");
  const clientIp = getClientIp(request);

  if (!userAgent) {
    return response;
  }

  if (!isPageRequest(url)) {
    return response;
  }

  if (url.pathname.startsWith("/analytics")) {
    return response;
  }

  const is404 = response.status === 404;
  const botName = detectBot(userAgent);
  const feedReader = !botName ? detectFeedReader(userAgent) : null;
  const shouldTrack = botName || feedReader || is404;

  if (!shouldTrack) {
    return response;
  }

  if (!is404 && !response.ok) {
    return response;
  }

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
