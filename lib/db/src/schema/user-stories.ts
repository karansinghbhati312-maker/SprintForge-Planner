import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { plansTable } from "./plans";

export const userStoriesTable = pgTable("user_stories", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull().references(() => plansTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  statement: text("statement").notNull(),
  acceptanceCriteria: text("acceptance_criteria").array().notNull(),
  priorityScore: integer("priority_score").notNull(),
  priorityLabel: text("priority_label").notNull(),
  businessValue: integer("business_value").notNull(),
  userImpact: integer("user_impact").notNull(),
  urgency: integer("urgency").notNull(),
  riskReduction: integer("risk_reduction").notNull(),
  priorityExplanation: text("priority_explanation").notNull(),
  effortPoints: integer("effort_points").notNull(),
  effortReason: text("effort_reason").notNull(),
});

export const insertUserStorySchema = createInsertSchema(userStoriesTable).omit({ id: true });
export type InsertUserStory = z.infer<typeof insertUserStorySchema>;
export type UserStory = typeof userStoriesTable.$inferSelect;