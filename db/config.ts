import { defineDb, defineTable, column } from "astro:db";

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
  tables: { Views, Visitors, Analytics },
});
