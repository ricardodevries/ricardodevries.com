import { defineDb, defineTable, column } from "astro:db";

const Views = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    count: column.number({
      default: 1,
    }),
  },
});

export default defineDb({
  tables: { Views },
});
