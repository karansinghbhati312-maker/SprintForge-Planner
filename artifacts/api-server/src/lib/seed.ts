import { count } from "drizzle-orm";
import { db, engineeringTasksTable, plansTable, processingRunsTable, sprintsTable, userStoriesTable } from "@workspace/db";
import { generatePlan } from "./planning";
import { logger } from "./logger";

export async function seedSamplePlan(): Promise<void> {
  const [{ value }] = await db.select({ value: count() }).from(plansTable);
  if (Number(value) > 0) return;

  const input = {
    title: "[Sample] Self-serve workspace onboarding",
    description: "A guided setup experience that helps new workspace admins invite their team, connect a data source, and reach a first value moment without a support handoff.",
    targetUsers: "Workspace admins at growing B2B teams who are setting up a new account",
    businessGoal: "Reduce time-to-value and lower onboarding-related support volume",
    mainProblem: "New admins do not know which setup steps matter first, and many abandon before inviting teammates or connecting their first data source.",
    mustHaveRequirements: "Show a progress checklist for setup\nInvite teammates from the onboarding flow\nConnect one supported data source\nTrack completion of the first value moment",
    niceToHaveRequirements: "Allow admins to skip and return to optional steps\nSend a reminder when setup is stalled",
    constraints: "Must reuse the existing workspace permission model and ship before the next quarterly launch",
    sprintLength: 2,
    teamCapacity: 24,
    availableSprints: 3,
  };
  const generated = generatePlan(input);
  const [plan] = await db.insert(plansTable).values({
    ...input,
    status: "completed",
    prd: generated.prd,
    decisionExplanation: generated.decisionExplanation,
  }).returning();
  await db.insert(processingRunsTable).values({
    planId: plan.id,
    action: "sample_plan_seeded",
    status: "completed",
    completedAt: new Date(),
  });
  await db.insert(userStoriesTable).values(generated.stories.map((story) => ({
    planId: plan.id,
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
  })));

  const idMap = new Map<number, number>();
  for (const task of generated.tasks) {
    const [row] = await db.insert(engineeringTasksTable).values({
      planId: plan.id,
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
      dependencyIds: task.dependencyIds.map((id) => idMap.get(id)).filter((id): id is number => id !== undefined),
      dependencyLabels: task.dependencyLabels,
      assignedSprint: task.assignedSprint,
      allocationStatus: task.allocationStatus,
    }).returning();
    idMap.set(task.id, row.id);
  }
  await db.insert(sprintsTable).values(generated.sprints.map((sprint) => ({
    planId: plan.id,
    number: sprint.number,
    label: sprint.label,
    lengthWeeks: sprint.lengthWeeks,
    capacity: sprint.capacity,
    usedPoints: sprint.usedPoints,
    remainingPoints: sprint.remainingPoints,
    taskIds: sprint.taskIds.map((id) => idMap.get(id)).filter((id): id is number => id !== undefined),
    taskCount: sprint.taskCount,
  })));
  logger.info({ planId: plan.id }, "Seeded sample SprintForge plan");
}