import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { plansTable } from "./plans";

export const processingRunsTable = pgTable("processing_runs", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").references(() => plansTable.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  status: text("status").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertProcessingRunSchema = createInsertSchema(processingRunsTable).omit({ id: true, createdAt: true });
export type InsertProcessingRun = z.infer<typeof insertProcessingRunSchema>;
export type ProcessingRun = typeof processingRunsTable.$inferSelect;