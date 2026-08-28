import { db, Analytics, Visitors, sql, and, lt } from "@/lib/db";
import geoip from "geoip-lite";
import { createHash } from "node:crypto";
import { isIP } from "node:net";

const MAX_PATH_LENGTH = 2048;
const MAX_REFERRER_LENGTH = 2048;

const FINGERPRINT_SECRET = process.env.FINGERPRINT_SECRET;

export function getDateKey(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

export function computeFingerprint(
  ip: string | null,
  userAgent: string | null,
  date: Date = new Date(),
): string | null {
  if (!ip && !userAgent) {
    return null;
  }

  if (!FINGERPRINT_SECRET) {
    return null;
  }

  const salt = `${FINGERPRINT_SECRET}:${getDateKey(date)}`;

  return createHash("sha256")
    .update(`${salt}|${ip ?? ""}|${userAgent ?? ""}`)
    .digest("hex");
}

export function normalizePath(input: string): string {
  const separator = input.search(/[?#]/);
  const pathname = separator === -1 ? input : input.slice(0, separator);
  const suffix = separator === -1 ? "" : input.slice(separator);
  const trimmed = pathname.replace(/\/+$/, "");

  return (trimmed === "" ? "/" : trimmed) + suffix;
}

export function sanitizePath(input: string | null | undefined): string | null {
  if (typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();

  if (trimmed.length === 0 || trimmed.length > MAX_PATH_LENGTH) {
    return null;
  }

  if (!/^[\w\-./~%?&=#]+$/.test(trimmed)) {
    return null;
  }

  return normalizePath(trimmed);
}

export function sanitizeReferrer(input: string | null | undefined): string {
  if (typeof input !== "string") {
    return "";
  }

  const trimmed = input.trim();

  if (trimmed.length === 0 || trimmed.length > MAX_REFERRER_LENGTH) {
    return "";
  }

  if (trimmed && !/^https?:\/\/.+/i.test(trimmed)) {
    return "";
  }

  return trimmed;
}

export function isPageRequest(url: URL): boolean {
  if (url.pathname.startsWith("/api/")) {
    return false;
  }

  if (/\.\w{2,4}$/.test(url.pathname)) {
    return false;
  }

  return true;
}

function normalizeIp(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  let ip = value.trim();

  if (!ip || ip.toLowerCase() === "unknown") {
    return null;
  }

  if (ip.startsWith('"') && ip.endsWith('"')) {
    ip = ip.slice(1, -1);
  }

  const bracketedIpv6 = ip.match(/^\[([^\]]+)\](?::\d+)?$/);

  if (bracketedIpv6) {
    ip = bracketedIpv6[1];
  }

  const ipv4WithPort = ip.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);

  if (ipv4WithPort) {
    ip = ipv4WithPort[1];
  }

  return isIP(ip) ? ip : null;
}

function getFirstIp(value: string | null): string | null {
  if (!value) {
    return null;
  }

  for (const part of value.split(",")) {
    const ip = normalizeIp(part);

    if (ip) {
      return ip;
    }
  }

  return null;
}

function getForwardedIp(value: string | null): string | null {
  if (!value) {
    return null;
  }

  for (const entry of value.split(",")) {
    const match = entry.match(/(?:^|;)\s*for=([^;]+)/i);
    const ip = normalizeIp(match?.[1]);

    if (ip) {
      return ip;
    }
  }

  return null;
}

export function getClientIp(request: Request): string | null {
  return (
    getFirstIp(request.headers.get("cf-connecting-ip")) ||
    getFirstIp(request.headers.get("true-client-ip")) ||
    getFirstIp(request.headers.get("x-forwarded-for")) ||
    getForwardedIp(request.headers.get("forwarded")) ||
    getFirstIp(request.headers.get("x-real-ip")) ||
    getFirstIp(request.headers.get("x-client-ip"))
  );
}

function countryCodeToFlag(code: string): string | null {
  if (!code || code.length !== 2) {
    return null;
  }

  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split("")
      .map((c) => 127397 + c.charCodeAt(0)),
  );
}

export function getGeoData(ip: string | null): {
  flag: string | null;
  country: string | null;
  city: string | null;
} {
  if (!ip) {
    return { flag: null, country: null, city: null };
  }

  try {
    const geo = geoip.lookup(ip);

    if (!geo) {
      return { flag: null, country: null, city: null };
    }

    const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
    const countryName = regionNames.of(geo.country) || geo.country;
    const flag = countryCodeToFlag(geo.country);

    return {
      flag,
      country: countryName,
      city: geo.city || null,
    };
  } catch {
    return { flag: null, country: null, city: null };
  }
}

interface TrackPageViewParams {
  path: string;
  referrer: string | null;
  botName: string | null;
  flag: string | null;
  country: string | null;
  city: string | null;
  fingerprint: string | null;
}

export async function trackPageView(
  params: TrackPageViewParams,
): Promise<void> {
  const path = sanitizePath(params.path);

  if (!path) {
    throw new Error("Invalid path");
  }

  const referrer = sanitizeReferrer(params.referrer);

  await db.insert(Analytics).values({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: new Date(),
    path,
    referrer: referrer || null,
    botName: params.botName,
    flag: params.flag,
    country: params.country,
    city: params.city,
    fingerprint: params.fingerprint,
  });
}

const ANONYMIZE_AFTER_DAYS = 7;
let lastAnonymizeRun = 0;
const ANONYMIZE_INTERVAL = 3600000;

export async function anonymizeOldFingerprints(): Promise<void> {
  const now = Date.now();

  if (now - lastAnonymizeRun < ANONYMIZE_INTERVAL) {
    return;
  }

  lastAnonymizeRun = now;

  const cutoff = new Date(now - ANONYMIZE_AFTER_DAYS * 86400000);
  const cutoffDateKey = getDateKey(cutoff);

  try {
    await db
      .update(Analytics)
      .set({ fingerprint: null })
      .where(
        and(
          lt(Analytics.date, cutoff),
          sql`${Analytics.fingerprint} is not null`,
        ),
      );

    await db
      .update(Visitors)
      .set({ fingerprint: null })
      .where(
        and(
          sql`${Visitors.date} < ${cutoffDateKey}`,
          sql`${Visitors.fingerprint} is not null`,
        ),
      );
  } catch (error) {
    console.error("Anonymization error:", error);
  }
}
