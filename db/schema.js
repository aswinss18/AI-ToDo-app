import { time } from "console";
import { integer, pgTable, text,timestamp } from "drizzle-orm/pg-core";


export const todosTable = pgTable("todos", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  todo: text().notNull(),
  createdAt:timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});
