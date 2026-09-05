import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { plansTable } from "./plans";

export const engineeringTasksTable = pgTable("engineering_tasks", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull().references(() => plansTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  priorityScore: integer("priority_score").notNull(),
  priorityLabel: text("priority_label").notNull(),
  businessValue: integer("business_value").notNull(),
  userImpact: integer("user_impact").notNull(),
  urgency: integer("urgency").notNull(),
  riskReduction: integer("risk_reduction").notNull(),
  priorityExplanation: text("priority_explanation").notNull(),
  effortPoints: integer("effort_points").notNull(),
  effortReason: text("effort_reason").notNull(),
  dependencyIds: integer("dependency_ids").array().notNull().default([]),
  dependencyLabels: text("dependency_labels").array().notNull().default([]),
  assignedSprint: integer("assigned_sprint"),
  allocationStatus: text("allocation_status").notNull().default("unallocated"),
});

export const insertEngineeringTaskSchema = createInsertSchema(engineeringTasksTable).omit({ id: true });
export type InsertEngineeringTask = z.infer<typeof insertEngineeringTaskSchema>;
export type EngineeringTask = typeof engineeringTasksTable.$inferSelect;