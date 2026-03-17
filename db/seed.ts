import { db, Views } from "astro:db";

export default async function () {
  await db.insert(Views).values([
    {
      id: "sanity",
      count: 100,
    },
  ]);
}
