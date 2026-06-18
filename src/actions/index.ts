import { ActionError, defineAction } from "astro:actions";
import { getCollection } from "astro:content";
import { and, Comments, db, eq, gte } from "astro:db";
import { z } from "astro/zod";
import {
  COMMENT_BODY_MAX_LENGTH,
  isCommentAdmin,
  normalizeCommentBody,
  toPublicComment,
  type CommentRow,
} from "@/lib/comments";

async function assertPublishedPost(postSlug: string): Promise<void> {
  const posts = await getCollection(
    "blog",
    ({ id, data }) =>
      id === postSlug && (!data.status || data.status === "published"),
  );

  if (posts.length === 0) {
    throw new ActionError({
      code: "NOT_FOUND",
      message: "Post not found.",
    });
  }
}

function assertCommentBody(body: string): string {
  const normalized = normalizeCommentBody(body);

  if (normalized.length < 3) {
    throw new ActionError({
      code: "BAD_REQUEST",
      message: "Comment must be at least 3 characters.",
    });
  }

  if (normalized.length > COMMENT_BODY_MAX_LENGTH) {
    throw new ActionError({
      code: "CONTENT_TOO_LARGE",
      message: `Comment must be ${COMMENT_BODY_MAX_LENGTH} characters or fewer.`,
    });
  }

  return normalized;
}

function assertAdmin(
  user: App.Locals["user"],
): NonNullable<App.Locals["user"]> {
  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "Sign in to continue.",
    });
  }

  if (!isCommentAdmin(user)) {
    throw new ActionError({
      code: "FORBIDDEN",
      message: "You do not have permission to moderate comments.",
    });
  }

  return user;
}

async function assertReplyParent(
  postSlug: string,
  parentId: string | undefined,
): Promise<string | null> {
  if (!parentId) {
    return null;
  }

  const parentRows = await db
    .select({
      id: Comments.id,
      postSlug: Comments.postSlug,
      parentId: Comments.parentId,
      status: Comments.status,
    })
    .from(Comments)
    .where(eq(Comments.id, parentId))
    .limit(1);

  const parent = parentRows[0];

  if (!parent || parent.postSlug !== postSlug) {
    throw new ActionError({
      code: "NOT_FOUND",
      message: "Comment not found.",
    });
  }

  if (parent.parentId || parent.status !== "approved") {
    throw new ActionError({
      code: "BAD_REQUEST",
      message: "Replies can only be added to approved comments.",
    });
  }

  return parent.id;
}

export const server = {
  addComment: defineAction({
    input: z.object({
      postSlug: z.string().min(1).max(160),
      parentId: z.string().min(1).max(128).optional(),
      body: z
        .string()
        .min(1)
        .max(COMMENT_BODY_MAX_LENGTH + 500),
      website: z.string().max(0).optional(),
    }),
    handler: async ({ postSlug, parentId, body, website }, context) => {
      if (website) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "Invalid comment.",
        });
      }

      const user = context.locals.user;

      if (!user) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: "Sign in to comment.",
        });
      }

      await assertPublishedPost(postSlug);
      const resolvedParentId = await assertReplyParent(postSlug, parentId);

      const oneMinuteAgo = new Date(Date.now() - 60_000);
      const recentComment = await db
        .select({ id: Comments.id })
        .from(Comments)
        .where(
          and(
            eq(Comments.authorUserId, user.id),
            gte(Comments.createdAt, oneMinuteAgo),
          ),
        )
        .limit(1);

      if (recentComment.length > 0) {
        throw new ActionError({
          code: "TOO_MANY_REQUESTS",
          message: "Please wait a moment before posting another comment.",
        });
      }

      const now = new Date();
      const inserted = await db
        .insert(Comments)
        .values({
          id: crypto.randomUUID(),
          postSlug,
          parentId: resolvedParentId,
          authorUserId: user.id,
          authorName: user.name,
          authorImage: user.image ?? null,
          body: assertCommentBody(body),
          status: "pending",
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return {
        comment: await toPublicComment(inserted[0] as CommentRow),
      };
    },
  }),

  approveComment: defineAction({
    input: z.object({
      id: z.string().min(1).max(128),
    }),
    handler: async ({ id }, context) => {
      const user = assertAdmin(context.locals.user);
      const now = new Date();

      const updated = await db
        .update(Comments)
        .set({
          status: "approved",
          moderatedByUserId: user.id,
          moderatedAt: now,
          updatedAt: now,
        })
        .where(and(eq(Comments.id, id), eq(Comments.status, "pending")))
        .returning();

      if (!updated[0]) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Comment not found or already moderated.",
        });
      }

      return {
        comment: await toPublicComment(updated[0] as CommentRow),
      };
    },
  }),

  rejectComment: defineAction({
    input: z.object({
      id: z.string().min(1).max(128),
    }),
    handler: async ({ id }, context) => {
      const user = assertAdmin(context.locals.user);
      const now = new Date();

      const updated = await db
        .update(Comments)
        .set({
          status: "rejected",
          moderatedByUserId: user.id,
          moderatedAt: now,
          updatedAt: now,
        })
        .where(and(eq(Comments.id, id), eq(Comments.status, "pending")))
        .returning();

      if (!updated[0]) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Comment not found or already moderated.",
        });
      }

      return {
        id,
      };
    },
  }),
};
