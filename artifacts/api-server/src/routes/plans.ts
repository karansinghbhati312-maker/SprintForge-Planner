import { Router, type IRouter } from "express";
import { and, asc, count, desc, eq } from "drizzle-orm";
import {
  CreatePlanBody,
  CreatePlanResponse,
  GetAdminStatsResponse,
  GetPlanParams,
  GetPlanResponse,
  ListPlansResponse,
  UpdatePlanTitleBody,
  UpdatePlanTitleParams,
  UpdatePlanTitleResponse,
} from "@workspace/api-zod";
import {
  db,
  engineeringTasksTable,
  plansTable,
  processingRunsTable,
  sprintsTable,
  userStoriesTable,
} from "@workspace/db";
import { generatePlan, type GeneratedPlan } from "../lib/planning";

const router: IRouter = Router();

function priorityFromRow(row: {
  priorityScore: number;
  priorityLabel: string;
  businessValue: number;
  userImpact: number;
  urgency: number;
  riskReduction: number;
  priorityExplanation: string;
}) {
  return {
    score: row.priorityScore,
    label: row.priorityLabel,
    businessValue: row.businessValue,
    userImpact: row.userImpact,
    urgency: row.urgency,
    riskReduction: row.riskReduction,
    explanation: row.priorityExplanation,
  };
}

async function summaryFor(plan: typeof plansTable.$inferSelect) {
  const [{ value: storyCount }] = await db
    .select({ value: count() })
    .from(userStoriesTable)
    .where(eq(userStoriesTable.planId, plan.id));
  const [{ value: taskCount }] = await db
    .select({ value: count() })
    .from(engineeringTasksTable)
    .where(eq(engineeringTasksTable.planId, plan.id));
  const [{ value: sprintCount }] = await db
    .select({ value: count() })
    .from(sprintsTable)
    .where(eq(sprintsTable.planId, plan.id));

  return {
    id: plan.id,
    title: plan.title,
    status: plan.status,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    storyCount: Number(storyCount),
    taskCount: Number(taskCount),
    sprintCount: Number(sprintCount),
  };
}

async function detailFor(plan: typeof plansTable.$inferSelect) {
  const [stories, tasks, sprints] = await Promise.all([
    db.select().from(userStoriesTable).where(eq(userStoriesTable.planId, plan.id)).orderBy(asc(userStoriesTable.id)),
    db.select().from(engineeringTasksTable).where(eq(engineeringTasksTable.planId, plan.id)).orderBy(asc(engineeringTasksTable.id)),
    db.select().from(sprintsTable).where(eq(sprintsTable.planId, plan.id)).orderBy(asc(sprintsTable.number)),
  ]);

  const summary = await summaryFor(plan);
  const prd = plan.prd ?? {
    executiveSummary: "This plan could not be processed into a complete PRD.",
    problemStatement: plan.mainProblem,
    targetUsers: [plan.targetUsers],
    goals: [plan.businessGoal],
    nonGoals: [],
    functionalRequirements: [],
    nonFunctionalRequirements: [],
    assumptions: [],
    risks: ["Processing failed before generated risks were available."],
    successMetrics: [],
    acceptanceCriteria: [],
  };
  return {
    ...summary,
    input: {
      title: plan.title,
      description: plan.description,
      targetUsers: plan.targetUsers,
      businessGoal: plan.businessGoal,
      mainProblem: plan.mainProblem,
      mustHaveRequirements: plan.mustHaveRequirements,
      niceToHaveRequirements: plan.niceToHaveRequirements,
      constraints: plan.constraints,
      sprintLength: plan.sprintLength,
      teamCapacity: plan.teamCapacity,
      availableSprints: plan.availableSprints,
    },
    prd,
    stories: stories.map((story) => ({
      id: story.id,
      title: story.title,
      statement: story.statement,
      acceptanceCriteria: story.acceptanceCriteria,
      priority: priorityFromRow(story),
      effortPoints: story.effortPoints,
      effortReason: story.effortReason,
    })),
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      category: task.category,
      priority: priorityFromRow(task),
      effortPoints: task.effortPoints,
      effortReason: task.effortReason,
      dependencyIds: task.dependencyIds,
      dependencyLabels: task.dependencyLabels,
      assignedSprint: task.assignedSprint,
      allocationStatus: task.allocationStatus,
    })),
    sprints: sprints.map((sprint) => ({
      number: sprint.number,
      label: sprint.label,
      lengthWeeks: sprint.lengthWeeks,
      capacity: sprint.capacity,
      usedPoints: sprint.usedPoints,
      remainingPoints: sprint.remainingPoints,
      taskIds: sprint.taskIds,
      taskCount: sprint.taskCount,
    })),
    decisionExplanation: plan.decisionExplanation,
  };
}

async function persistGeneratedPlan(planId: number, generated: GeneratedPlan) {
  const storyRows = await db
    .insert(userStoriesTable)
    .values(
      generated.stories.map((story) => ({
        planId,
        title: story.title,
        statement: story.statement,
        acceptanceCriteria: story.acceptanceCriteria,
        priorityScore: story.priority.score,
        priorityLabel: story.priority.label,
        businessValue: story.priority.businessValue,
        userImpact: story.priority.userImpact,
        urgency: story.priority.urgency,
        riskReduction: story.priority.riskReduction,
        priorityExplanation: story.priority.explanation,
        effortPoints: story.effortPoints,
        effortReason: story.effortReason,
      })),
    )
    .returning();

  const taskIdsByLocalId = new Map<number, number>();
  const taskRows = [];
  for (const task of generated.tasks) {
    const [row] = await db
      .insert(engineeringTasksTable)
      .values({
        planId,
        title: task.title,
        description: task.description,
        category: task.category,
        priorityScore: task.priority.score,
        priorityLabel: task.priority.label,
        businessValue: task.priority.businessValue,
        userImpact: task.priority.userImpact,
        urgency: task.priority.urgency,
        riskReduction: task.priority.riskReduction,
        priorityExplanation: task.priority.explanation,
        effortPoints: task.effortPoints,
        effortReason: task.effortReason,
        dependencyIds: task.dependencyIds.map((localId) => taskIdsByLocalId.get(localId)).filter((id): id is number => id !== undefined),
        dependencyLabels: task.dependencyLabels,
        assignedSprint: task.assignedSprint,
        allocationStatus: task.allocationStatus,
      })
      .returning();
    taskIdsByLocalId.set(task.id, row.id);
    taskRows.push(row);
  }

  await db.insert(sprintsTable).values(
    generated.sprints.map((sprint) => ({
      planId,
      number: sprint.number,
      label: sprint.label,
      lengthWeeks: sprint.lengthWeeks,
      capacity: sprint.capacity,
      usedPoints: sprint.usedPoints,
      remainingPoints: sprint.remainingPoints,
      taskIds: sprint.taskIds.map((localId) => taskIdsByLocalId.get(localId)).filter((id): id is number => id !== undefined),
      taskCount: sprint.taskCount,
    })),
  );

  return { storyRows, taskRows };
}

router.get("/plans", async (req, res): Promise<void> => {
  const plans = await db.select().from(plansTable).orderBy(desc(plansTable.createdAt));
  const summaries = await Promise.all(plans.map(summaryFor));
  res.json(ListPlansResponse.parse(summaries));
});

router.post("/plans", async (req, res): Promise<void> => {
  const parsed = CreatePlanBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid plan input");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [plan] = await db
    .insert(plansTable)
    .values({
      ...parsed.data,
      status: "processing",
    })
    .returning();
  const [run] = await db
    .insert(processingRunsTable)
    .values({ planId: plan.id, action: "create_plan", status: "processing" })
    .returning();

  try {
    const generated = generatePlan(parsed.data);
    await persistGeneratedPlan(plan.id, generated);
    const [completedPlan] = await db
      .update(plansTable)
      .set({
        status: "completed",
        prd: generated.prd,
        decisionExplanation: generated.decisionExplanation,
        updatedAt: new Date(),
      })
      .where(eq(plansTable.id, plan.id))
      .returning();
    await db
      .update(processingRunsTable)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(processingRunsTable.id, run.id));

    const result = await detailFor(completedPlan);
    res.status(201).json(CreatePlanResponse.parse(result));
  } catch (error) {
    req.log.error({ err: error, planId: plan.id }, "Plan processing failed");
    await db.update(plansTable).set({ status: "failed", updatedAt: new Date() }).where(eq(plansTable.id, plan.id));
    await db.update(processingRunsTable).set({ status: "failed", errorMessage: "Plan processing failed", completedAt: new Date() }).where(eq(processingRunsTable.id, run.id));
    res.status(500).json({ error: "Plan processing failed. Please try again." });
  }
});

router.get("/plans/:id", async (req, res): Promise<void> => {
  const params = GetPlanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, params.data.id));
  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }
  res.json(GetPlanResponse.parse(await detailFor(plan)));
});

router.patch("/plans/:id", async (req, res): Promise<void> => {
  const params = UpdatePlanTitleParams.safeParse(req.params);
  const body = UpdatePlanTitleBody.safeParse(req.body);
  if (!params.success || !body.success) {
    const error = !params.success ? params.error.message : !body.success ? body.error.message : "Invalid request";
    res.status(400).json({ error });
    return;
  }
  const [plan] = await db
    .update(plansTable)
    .set({ title: body.data.title, updatedAt: new Date() })
    .where(eq(plansTable.id, params.data.id))
    .returning();
  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }
  res.json(UpdatePlanTitleResponse.parse(await summaryFor(plan)));
});

router.delete("/plans/:id", async (req, res): Promise<void> => {
  const params = GetPlanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [plan] = await db.delete(plansTable).where(eq(plansTable.id, params.data.id)).returning();
  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/admin/stats", async (_req, res): Promise<void> => {
  const [plans, stories, tasks, completedRuns, failedRuns, taskRows, sprintRows, activity] = await Promise.all([
    db.select({ value: count() }).from(plansTable),
    db.select({ value: count() }).from(userStoriesTable),
    db.select({ value: count() }).from(engineeringTasksTable),
    db.select({ value: count() }).from(processingRunsTable).where(eq(processingRunsTable.status, "completed")),
    db.select({ value: count() }).from(processingRunsTable).where(eq(processingRunsTable.status, "failed")),
    db.select({ label: engineeringTasksTable.priorityLabel }).from(engineeringTasksTable),
    db.select().from(sprintsTable).orderBy(asc(sprintsTable.planId), asc(sprintsTable.number)),
    db.select({
      id: processingRunsTable.id,
      action: processingRunsTable.action,
      status: processingRunsTable.status,
      createdAt: processingRunsTable.createdAt,
      planTitle: plansTable.title,
    }).from(processingRunsTable).leftJoin(plansTable, eq(processingRunsTable.planId, plansTable.id)).orderBy(desc(processingRunsTable.createdAt)).limit(8),
  ]);

  const priorityCounts = new Map<string, number>();
  for (const row of taskRows) priorityCounts.set(row.label, (priorityCounts.get(row.label) ?? 0) + 1);
  const totalPlans = Number(plans[0]?.value ?? 0);
  const totalTasks = Number(tasks[0]?.value ?? 0);
  const result = {
    totalPlans,
    totalStories: Number(stories[0]?.value ?? 0),
    totalTasks,
    completedRuns: Number(completedRuns[0]?.value ?? 0),
    failedRuns: Number(failedRuns[0]?.value ?? 0),
    averageTasksPerPlan: totalPlans ? Number((totalTasks / totalPlans).toFixed(1)) : 0,
    priorityDistribution: Array.from(priorityCounts.entries()).map(([label, value]) => ({ label, count: value })),
    sprintAllocation: sprintRows.map((sprint) => ({
      sprint: sprint.label,
      usedPoints: sprint.usedPoints,
      capacity: sprint.capacity,
      taskCount: sprint.taskCount,
    })),
    recentActivity: activity.map((item) => ({
      id: item.id,
      action: item.action,
      planTitle: item.planTitle ?? "Deleted plan",
      status: item.status,
      createdAt: item.createdAt,
    })),
  };
  res.json(GetAdminStatsResponse.parse(result));
});

export default router;