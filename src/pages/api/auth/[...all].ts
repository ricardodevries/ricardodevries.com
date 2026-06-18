import type { APIRoute } from "astro";
import { auth } from "@/auth";

export const prerender = false;

export const ALL: APIRoute = async ({ request }) => {
  return auth.handler(request);
};
