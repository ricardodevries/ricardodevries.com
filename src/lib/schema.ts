import {
  customType,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * Stores JavaScript `Date` values as ISO-8601 text and reads them back as
 * `Date` objects. This mirrors the serialization `@astrojs/db` used for
 * `column.date()`, so existing rows remain byte-compatible after the migration
 * from astro:db to a direct Drizzle + libSQL setup.
 */
const hasTimezoneSuffix = (value: string): boolean =>
  /(Z|[+-]\d{2}:\d{2})$/i.test(value);

const isoDate = customType<{ data: Date; driverData: string }>({
  dataType() {
    return "text";
  },
  toDriver(value) {
    return value.toISOString();
  },
  fromDriver(value) {
    return new Date(hasTimezoneSuffix(value) ? value : `${value}Z`);
  },
});

export const AuthUser = sqliteTable("AuthUser", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: isoDate("createdAt").notNull(),
  updatedAt: isoDate("updatedAt").notNull(),
});

export const AuthSession = sqliteTable(
  "AuthSession",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    token: text("token").notNull().unique(),
    expiresAt: isoDate("expiresAt").notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    createdAt: isoDate("createdAt").notNull(),
    updatedAt: isoDate("updatedAt").notNull(),
  },
  (table) => [index("AuthSession_userId_idx").on(table.userId)],
);

export const AuthAccount = sqliteTable(
  "AuthAccount",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    issuer: text("issuer"),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: isoDate("accessTokenExpiresAt"),
    refreshTokenExpiresAt: isoDate("refreshTokenExpiresAt"),
    scope: text("scope"),
    createdAt: isoDate("createdAt").notNull(),
    updatedAt: isoDate("updatedAt").notNull(),
  },
  (table) => [
    index("AuthAccount_userId_idx").on(table.userId),
    // better-auth 1.7 looks accounts up by issuer + accountId with equality on
    // both columns and treats the pair as the account's unique key. The column
    // order is interchangeable for that lookup, so keep (accountId, issuer) to
    // match the existing production index and avoid rebuilding a unique index.
    uniqueIndex("AuthAccount_accountId_issuer_idx").on(
      table.accountId,
      table.issuer,
    ),
  ],
);

export const AuthVerification = sqliteTable(
  "AuthVerification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: isoDate("expiresAt").notNull(),
    createdAt: isoDate("createdAt").notNull(),
    updatedAt: isoDate("updatedAt").notNull(),
  },
  (table) => [
    index("AuthVerification_identifier_idx").on(table.identifier),
  ],
);

export const Comments = sqliteTable(
  "Comments",
  {
    id: text("id").primaryKey(),
    postSlug: text("postSlug").notNull(),
    parentId: text("parentId"),
    authorUserId: text("authorUserId").notNull(),
    authorName: text("authorName").notNull(),
    authorImage: text("authorImage"),
    body: text("body").notNull(),
    status: text("status").notNull().default("pending"),
    moderatedByUserId: text("moderatedByUserId"),
    moderatedAt: isoDate("moderatedAt"),
    createdAt: isoDate("createdAt").notNull(),
    updatedAt: isoDate("updatedAt").notNull(),
  },
  (table) => [
    // The public comment list filters by postSlug + status and orders by
    // createdAt (see src/pages/api/comments.ts), so lead with the equality
    // columns and keep createdAt last to satisfy the ORDER BY.
    index("Comments_postSlug_status_createdAt_idx").on(
      table.postSlug,
      table.status,
      table.createdAt,
    ),
    // The per-user rate limit filters by authorUserId + createdAt range
    // (see src/actions/index.ts).
    index("Comments_authorUserId_createdAt_idx").on(
      table.authorUserId,
      table.createdAt,
    ),
  ],
);

export const Views = sqliteTable("Views", {
  id: text("id").primaryKey(),
  count: integer("count").notNull().default(1),
});

export const Visitors = sqliteTable("Visitors", {
  id: text("id").primaryKey(),
  postId: text("postId").notNull(),
  fingerprint: text("fingerprint"),
  date: text("date").notNull(),
});

export const Analytics = sqliteTable("Analytics", {
  id: text("id").primaryKey(),
  date: isoDate("date").notNull(),
  path: text("path").notNull(),
  referrer: text("referrer"),
  botName: text("botName"),
  flag: text("flag"),
  country: text("country"),
  city: text("city"),
  fingerprint: text("fingerprint"),
});
