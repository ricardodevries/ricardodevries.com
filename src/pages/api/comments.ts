import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { and, asc, Comments, db, eq, or } from "@/lib/db";
import { getConfiguredAuthProviders } from "@/lib/auth-providers";
import { isCommentAdmin, toPublicComment, type CommentRow } from "@/lib/comments";

export const GET: APIRoute = async ({ locals, url }) => {
  const postSlug = url.searchParams.get("postSlug");

  if (!postSlug || postSlug.length > 160) {
    return new Response(JSON.stringify({ error: "Invalid postSlug" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const posts = await getCollection(
    "blog",
    ({ id, data }) =>
      id === postSlug && (!data.status || data.status === "published"),
  );

  if (posts.length === 0) {
    return new Response(JSON.stringify({ error: "Post not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  let visibility = eq(Comments.status, "approved");

  const canModerate = isCommentAdmin(locals.user);

  if (canModerate) {
    visibility = or(
      eq(Comments.status, "approved"),
      eq(Comments.status, "pending"),
    ) ?? visibility;
  } else if (locals.user) {
    visibility = or(
      eq(Comments.status, "approved"),
      and(
        eq(Comments.status, "pending"),
        eq(Comments.authorUserId, locals.user.id),
      ),
    ) ?? visibility;
  }

  const comments = await db
    .select()
    .from(Comments)
    .where(and(eq(Comments.postSlug, postSlug), visibility))
    .orderBy(asc(Comments.createdAt))
    .limit(100);
  const publicComments = await Promise.all(
    comments.map((comment) => toPublicComment(comment as CommentRow)),
  );

  return new Response(
    JSON.stringify({
      comments: publicComments,
      canModerate,
      authProviders: getConfiguredAuthProviders(),
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store, max-age=0",
      },
    },
  );
};
