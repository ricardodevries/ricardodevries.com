import type { User } from "better-auth";
import type { BuiltinLanguage } from "shiki";
import rehypeShiki from "@shikijs/rehype";
import rehypeSanitize, {
  defaultSchema,
  type Options as SanitizeSchema,
} from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { transformers, vorillazTheme } from "../../config/plugins";

export const COMMENT_BODY_MAX_LENGTH = 1500;

const commentCodeLanguages: BuiltinLanguage[] = [
  "bash",
  "css",
  "diff",
  "dockerfile",
  "go",
  "html",
  "javascript",
  "js",
  "json",
  "jsx",
  "markdown",
  "md",
  "python",
  "scss",
  "sh",
  "shell",
  "ts",
  "tsx",
  "typescript",
  "yaml",
  "yml",
];

const commentSanitizeSchema: SanitizeSchema = {
  ...defaultSchema,
  tagNames: defaultSchema.tagNames?.filter(
    (tagName) => tagName !== "img" && tagName !== "input",
  ),
};

const commentMarkdownProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkBreaks)
  .use(remarkRehype)
  .use(rehypeSanitize, commentSanitizeSchema)
  .use(rehypeShiki, {
    defaultLanguage: "markdown",
    fallbackLanguage: "markdown",
    langs: commentCodeLanguages,
    theme: vorillazTheme,
    transformers,
  })
  .use(rehypeStringify);

export interface CommentRow {
  id: string;
  postSlug: string;
  parentId: string | null;
  authorUserId: string;
  authorName: string;
  authorImage: string | null;
  body: string;
  status: string;
  moderatedByUserId: string | null;
  moderatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicComment {
  id: string;
  parentId: string | null;
  authorName: string;
  authorImage: string | null;
  bodyHtml: string;
  status: string;
  createdAt: string;
}

export function normalizeCommentBody(body: string): string {
  return body.replace(/\r\n?/g, "\n").trim();
}

function normalizeAuthorImage(image: string | null): string | null {
  if (!image) {
    return null;
  }

  try {
    const url = new URL(image);

    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    return null;
  }

  return null;
}

export function isCommentAdmin(user: Pick<User, "email"> | null): boolean {
  if (!user) {
    return false;
  }

  const adminEmails = (
    process.env.COMMENT_ADMIN_EMAILS ||
    import.meta.env.COMMENT_ADMIN_EMAILS ||
    ""
  )
    .split(",")
    .map((email: string) => email.trim().toLowerCase())
    .filter(Boolean);

  return adminEmails.includes(user.email.toLowerCase());
}

export async function renderCommentMarkdown(markdown: string): Promise<string> {
  const file = await commentMarkdownProcessor.process(markdown);

  return String(file);
}

export async function toPublicComment(
  comment: CommentRow,
): Promise<PublicComment> {
  return {
    id: comment.id,
    parentId: comment.parentId ?? null,
    authorName: comment.authorName,
    authorImage: normalizeAuthorImage(comment.authorImage),
    bodyHtml: await renderCommentMarkdown(comment.body),
    status: comment.status,
    createdAt: comment.createdAt.toISOString(),
  };
}
