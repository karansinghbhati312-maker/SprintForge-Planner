import { createInsertSchema } from "drizzle-zod";
import { integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const plansTable = pgTable("plans", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  status: text("status").notNull().default("processing"),
  description: text("description").notNull(),
  targetUsers: text("target_users").notNull(),
  businessGoal: text("business_goal").notNull(),
  mainProblem: text("main_problem").notNull(),
  mustHaveRequirements: text("must_have_requirements").notNull(),
  niceToHaveRequirements: text("nice_to_have_requirements").notNull(),
  constraints: text("constraints").notNull(),
  sprintLength: integer("sprint_length").notNull(),
  teamCapacity: integer("team_capacity").notNull(),
  availableSprints: integer("available_sprints").notNull(),
  prd: jsonb("prd"),
  decisionExplanation: text("decision_explanation").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPlanSchema = createInsertSchema(plansTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type Plan = typeof plansTable.$inferSelect;