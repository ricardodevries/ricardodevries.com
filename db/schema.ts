import { customType, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ISO strings retain SQLite's date functions and sort chronologically.
const date = customType<{ data: Date; driverData: string }>({
  dataType: () => "text",
  toDriver: (value) => value.toISOString(),
  fromDriver: (value) => new Date(value),
});

export const AuthUser = sqliteTable("AuthUser", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: integer({ mode: "boolean" }).notNull().default(false),
  image: text(),
  createdAt: date().notNull(),
  updatedAt: date().notNull(),
});

export const AuthSession = sqliteTable("AuthSession", {
  id: text().primaryKey(),
  userId: text().notNull(),
  token: text().notNull().unique(),
  expiresAt: date().notNull(),
  ipAddress: text(),
  userAgent: text(),
  createdAt: date().notNull(),
  updatedAt: date().notNull(),
}, (table) => [index("AuthSession_userId_idx").on(table.userId)]);

export const AuthAccount = sqliteTable("AuthAccount", {
  id: text().primaryKey(),
  userId: text().notNull(),
  accountId: text().notNull(),
  providerId: text().notNull(),
  accessToken: text(),
  refreshToken: text(),
  idToken: text(),
  accessTokenExpiresAt: date(),
  refreshTokenExpiresAt: date(),
  scope: text(),
  password: text(),
  createdAt: date().notNull(),
  updatedAt: date().notNull(),
}, (table) => [
  index("AuthAccount_userId_idx").on(table.userId),
  index("AuthAccount_providerId_accountId_idx").on(table.providerId, table.accountId),
]);

export const AuthVerification = sqliteTable("AuthVerification", {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: date().notNull(),
  createdAt: date().notNull(),
  updatedAt: date().notNull(),
}, (table) => [index("AuthVerification_identifier_idx").on(table.identifier)]);

export const Comments = sqliteTable("Comments", {
  id: text().primaryKey(),
  postSlug: text().notNull(),
  parentId: text(),
  authorUserId: text().notNull(),
  authorName: text().notNull(),
  authorImage: text(),
  body: text().notNull(),
  status: text().notNull().default("pending"),
  moderatedByUserId: text(),
  moderatedAt: date(),
  createdAt: date().notNull(),
  updatedAt: date().notNull(),
}, (table) => [
  index("Comments_postSlug_status_createdAt_idx").on(table.postSlug, table.status, table.createdAt),
  index("Comments_postSlug_parentId_createdAt_idx").on(table.postSlug, table.parentId, table.createdAt),
  index("Comments_authorUserId_createdAt_idx").on(table.authorUserId, table.createdAt),
]);

export const Views = sqliteTable("Views", {
  id: text().primaryKey(),
  count: integer().notNull().default(1),
});

export const Visitors = sqliteTable("Visitors", {
  id: text().primaryKey(),
  postId: text().notNull(),
  fingerprint: text(),
  date: text().notNull(),
});

export const Analytics = sqliteTable("Analytics", {
  id: text().primaryKey(),
  date: date().notNull(),
  path: text().notNull(),
  referrer: text(),
  botName: text(),
  flag: text(),
  country: text(),
  city: text(),
  fingerprint: text(),
});
