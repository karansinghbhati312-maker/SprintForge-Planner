import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { plansTable } from "./plans";

export const sprintsTable = pgTable("sprints", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull().references(() => plansTable.id, { onDelete: "cascade" }),
  number: integer("number").notNull(),
  label: text("label").notNull(),
  lengthWeeks: integer("length_weeks").notNull(),
  capacity: integer("capacity").notNull(),
  usedPoints: integer("used_points").notNull().default(0),
  remainingPoints: integer("remaining_points").notNull().default(0),
  taskIds: integer("task_ids").array().notNull().default([]),
  taskCount: integer("task_count").notNull().default(0),
});

export const insertSprintSchema = createInsertSchema(sprintsTable).omit({ id: true });
export type InsertSprint = z.infer<typeof insertSprintSchema>;
export type Sprint = typeof sprintsTable.$inferSelect;