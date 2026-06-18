import { defineDb, defineTable, column } from "astro:db";

const AuthUser = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    name: column.text(),
    email: column.text({ unique: true }),
    emailVerified: column.boolean({
      default: false,
    }),
    image: column.text({ optional: true }),
    createdAt: column.date(),
    updatedAt: column.date(),
  },
});

const AuthSession = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),
    token: column.text({ unique: true }),
    expiresAt: column.date(),
    ipAddress: column.text({ optional: true }),
    userAgent: column.text({ optional: true }),
    createdAt: column.date(),
    updatedAt: column.date(),
  },
  indexes: [{ on: "userId" }],
});

const AuthAccount = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),
    accountId: column.text(),
    providerId: column.text(),
    accessToken: column.text({ optional: true }),
    refreshToken: column.text({ optional: true }),
    idToken: column.text({ optional: true }),
    accessTokenExpiresAt: column.date({ optional: true }),
    refreshTokenExpiresAt: column.date({ optional: true }),
    scope: column.text({ optional: true }),
    createdAt: column.date(),
    updatedAt: column.date(),
  },
  indexes: [{ on: "userId" }, { on: ["providerId", "accountId"] }],
});

const AuthVerification = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    identifier: column.text(),
    value: column.text(),
    expiresAt: column.date(),
    createdAt: column.date(),
    updatedAt: column.date(),
  },
  indexes: [{ on: "identifier" }],
});

const Comments = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    postSlug: column.text(),
    parentId: column.text({ optional: true }),
    authorUserId: column.text(),
    authorName: column.text(),
    authorImage: column.text({ optional: true }),
    body: column.text(),
    status: column.text({
      default: "pending",
    }),
    moderatedByUserId: column.text({ optional: true }),
    moderatedAt: column.date({ optional: true }),
    createdAt: column.date(),
    updatedAt: column.date(),
  },
  indexes: [
    { on: ["postSlug", "status", "createdAt"] },
    { on: ["postSlug", "parentId", "createdAt"] },
    { on: ["authorUserId", "createdAt"] },
  ],
});

const Views = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    count: column.number({
      default: 1,
    }),
  },
});

const Visitors = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    postId: column.text(),
    fingerprint: column.text({ optional: true }),
    date: column.text(),
  },
});

const Analytics = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    date: column.date(),
    path: column.text(),
    referrer: column.text({ optional: true }),
    botName: column.text({ optional: true }),
    flag: column.text({ optional: true }),
    country: column.text({ optional: true }),
    city: column.text({ optional: true }),
    fingerprint: column.text({ optional: true }),
  },
});

export default defineDb({
  tables: {
    AuthUser,
    AuthSession,
    AuthAccount,
    AuthVerification,
    Comments,
    Views,
    Visitors,
    Analytics,
  },
});
