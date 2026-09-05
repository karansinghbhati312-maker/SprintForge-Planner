import type { PlanInput, PriorityScore, Prd, UserStory, EngineeringTask, Sprint } from "@workspace/api-zod";

const FIBONACCI = [1, 2, 3, 5, 8, 13] as const;
type PriorityLabel = "Critical" | "High" | "Medium" | "Low";
type EffortPoints = (typeof FIBONACCI)[number];

export type GeneratedPlan = {
  input: PlanInput;
  prd: Prd;
  stories: Array<UserStory>;
  tasks: Array<EngineeringTask>;
  sprints: Array<Sprint>;
  decisionExplanation: string[];
};

function splitRequirements(value: string): string[] {
  const parts = value
    .split(/\r?\n|•|(?<=\.)\s+(?=[A-Z])/)
    .map((part) => part.replace(/^[\s\-*]+/, "").trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [value.trim()];
}

export function scoreFor(text: string, input: PlanInput): PriorityScore {
  const lower = text.toLowerCase();
  const businessValue = Math.min(100, 52 + (input.businessGoal.length > 100 ? 18 : 8) + (lower.includes("revenue") || lower.includes("conversion") ? 20 : 0));
  const userImpact = Math.min(100, 48 + (input.targetUsers.length > 80 ? 16 : 8) + (lower.includes("user") || lower.includes("customer") ? 18 : 0));
  const urgency = Math.min(100, 42 + (input.constraints.length > 80 ? 14 : 4) + (lower.includes("launch") || lower.includes("deadline") ? 30 : 0));
  const riskReduction = Math.min(100, 40 + (lower.includes("security") || lower.includes("migration") || lower.includes("data") ? 28 : 8) + (text.length > 100 ? 12 : 0));
  const score = Math.round(businessValue * 0.35 + userImpact * 0.3 + urgency * 0.2 + riskReduction * 0.15);
  const label: PriorityLabel = score >= 80 ? "Critical" : score >= 60 ? "High" : score >= 40 ? "Medium" : "Low";
  return {
    score,
    label,
    businessValue,
    userImpact,
    urgency,
    riskReduction,
    explanation: `Score ${score}/100: business value ${businessValue} × 35%, user impact ${userImpact} × 30%, urgency ${urgency} × 20%, and risk reduction ${riskReduction} × 15%.`,
  };
}

function effortFor(text: string, kind: "story" | "task"): { points: EffortPoints; reason: string } {
  const lower = text.toLowerCase();
  let complexity = text.length > 120 ? 2 : text.length > 65 ? 1 : 0;
  if (/(integrat|migration|permission|security|real-time|realtime|analytics)/.test(lower)) complexity += 2;
  if (/(api|database|schema|workflow|export|dependency)/.test(lower)) complexity += 1;
  const points: EffortPoints = FIBONACCI[Math.min(FIBONACCI.length - 1, complexity + (kind === "task" ? 0 : 1))];
  return {
    points,
    reason: `${points} points based on ${complexity > 2 ? "cross-system complexity and risk" : complexity > 0 ? "requirement length and implementation complexity" : "a focused, bounded scope"}.`,
  };
}

function makePriority(text: string, input: PlanInput): PriorityScore {
  return scoreFor(text, input);
}

function categoryFor(text: string): EngineeringTask["category"] {
  const lower = text.toLowerCase();
  if (/(schema|database|data model|storage|migration)/.test(lower)) return "database";
  if (/(api|server|backend|endpoint|processing|integration)/.test(lower)) return "backend";
  if (/(test|coverage|qa|acceptance)/.test(lower)) return "testing";
  if (/(deploy|release|production|monitoring)/.test(lower)) return "deployment";
  return "frontend";
}

export function allocateTasks(
  tasks: EngineeringTask[],
  availableSprints: number,
  teamCapacity: number,
  sprintLength: number,
): { tasks: EngineeringTask[]; sprints: Sprint[] } {
  const allocatedTasks: EngineeringTask[] = tasks.map((task): EngineeringTask => ({
    ...task,
    dependencyIds: [...task.dependencyIds],
    dependencyLabels: [...task.dependencyLabels],
    assignedSprint: null,
    allocationStatus: "unallocated" as const,
  }));
  const sprints: Sprint[] = Array.from({ length: availableSprints }, (_, index) => ({
    number: index + 1,
    label: `Sprint ${index + 1}`,
    lengthWeeks: sprintLength,
    capacity: teamCapacity,
    usedPoints: 0,
    remainingPoints: teamCapacity,
    taskIds: [],
    taskCount: 0,
  }));

  const orderedTasks = [...allocatedTasks].sort((a, b) => b.priority.score - a.priority.score || a.id - b.id);
  const placed = new Set<number>();
  for (const task of orderedTasks) {
    const earliestSprint = Math.max(
      0,
      ...task.dependencyIds.map((dependencyId) => {
        const dependency = allocatedTasks.find((item) => item.id === dependencyId);
        return dependency?.assignedSprint ? dependency.assignedSprint - 1 : 0;
      }),
    );
    const target = sprints.slice(earliestSprint).find((sprint) => sprint.remainingPoints >= task.effortPoints);
    if (target) {
      task.assignedSprint = target.number;
      task.allocationStatus = "allocated";
      target.taskIds.push(task.id);
      target.usedPoints += task.effortPoints;
      target.remainingPoints -= task.effortPoints;
      target.taskCount += 1;
      placed.add(task.id);
    }
  }

  return { tasks: allocatedTasks, sprints };
}

export function generatePlan(input: PlanInput): GeneratedPlan {
  const mustHaves = splitRequirements(input.mustHaveRequirements);
  const niceToHaves = splitRequirements(input.niceToHaveRequirements);
  const requirements = [...mustHaves, ...niceToHaves].filter(Boolean);
  const coreRequirements = requirements.slice(0, 6);

  const prd: Prd = {
    executiveSummary: `${input.title} helps ${input.targetUsers} solve ${input.mainProblem}. This plan turns the idea into an explainable, capacity-aware delivery path focused on ${input.businessGoal}.`,
    problemStatement: input.mainProblem,
    targetUsers: splitRequirements(input.targetUsers),
    goals: [
      input.businessGoal,
      `Deliver a usable first increment within ${input.availableSprints} available sprint${input.availableSprints === 1 ? "" : "s"}.`,
      "Make trade-offs visible through priority, effort, dependency, and capacity explanations.",
    ],
    nonGoals: [
      "Replacing product discovery or stakeholder validation.",
      "Committing to work that exceeds the configured team capacity.",
      ...(input.niceToHaveRequirements ? ["Treating nice-to-have requirements as launch blockers."] : []),
    ],
    functionalRequirements: coreRequirements.map((item) => `The product shall ${item.replace(/[.!?]$/, "").toLowerCase()}.`),
    nonFunctionalRequirements: [
      "The planning workflow should return useful output without an external AI key.",
      "Generated decisions should remain deterministic and explainable.",
      input.constraints ? `The plan must respect these constraints: ${input.constraints}` : "The plan should preserve a responsive experience on desktop and mobile.",
    ],
    assumptions: [
      `The delivery team has ${input.teamCapacity} story points per ${input.sprintLength}-week sprint.`,
      "Requirements can be refined after the first planning pass.",
      "Priority is a planning signal, not a substitute for stakeholder judgment.",
    ],
    risks: [
      input.constraints ? `Constraint risk: ${input.constraints}` : "Scope risk: requirements may grow during implementation.",
      "Estimates are directional until the team validates the technical approach.",
      "Dependencies can shift when implementation details are discovered.",
    ],
    successMetrics: [
      "A product manager can move from idea to an actionable plan in one session.",
      "At least 80% of generated tasks are allocated without exceeding sprint capacity.",
      "Every priority and estimate includes a human-readable reason.",
    ],
    acceptanceCriteria: [
      "Required context is captured before generation begins.",
      "The generated plan includes PRD, stories, engineering tasks, and sprint allocations.",
      "Unallocated work is clearly marked when capacity is insufficient.",
    ],
  };

  const storyInputs = [
    { title: "Capture the feature brief", requirement: input.description, goal: "align the team on the problem and outcome" },
    { title: "Turn requirements into a PRD", requirement: mustHaves[0] ?? input.businessGoal, goal: "give stakeholders a shared product reference" },
    { title: "Prioritize and estimate delivery", requirement: coreRequirements[1] ?? input.businessGoal, goal: "make trade-offs visible before work starts" },
    { title: "Plan delivery across sprints", requirement: niceToHaves[0] ?? "Review the generated plan and export it", goal: "turn the plan into an executable sequence" },
  ];

  const stories: UserStory[] = storyInputs.map((story, index) => {
    const priority = makePriority(`${story.requirement} ${input.businessGoal}`, input);
    const effort = effortFor(story.requirement, "story");
    return {
      id: index + 1,
      title: story.title,
      statement: `As a product manager, I want to ${story.requirement.toLowerCase().replace(/[.!?]$/, "")}, so that I can ${story.goal}.`,
      acceptanceCriteria: [
        `The workflow reflects the provided ${index === 0 ? "feature context" : "requirement"}.`,
        "The result includes a clear next step for the delivery team.",
        index === 3 ? "The work is assigned only when dependencies and capacity allow it." : "The decision includes a plain-language explanation.",
      ],
      priority,
      effortPoints: effort.points,
      effortReason: effort.reason,
    };
  });

  const taskBlueprints = [
    { title: "Define the planning data model", description: "Store plan inputs, generated artifacts, sprint allocations, and processing status.", category: "database" as const, story: stories[1] },
    { title: "Build the plan generation API", description: "Validate the brief and return deterministic PRD, story, task, and sprint output.", category: "backend" as const, story: stories[1] },
    { title: "Create the new plan workflow", description: "Give product managers a structured form with validation and clear processing feedback.", category: "frontend" as const, story: stories[0] },
    { title: "Present the generated plan", description: "Make PRD, stories, tasks, sprint capacity, risks, and decision explanations easy to scan.", category: "frontend" as const, story: stories[2] },
    { title: "Add saved plan management", description: "Support opening, renaming, deleting, copying, and exporting generated plans.", category: "frontend" as const, story: stories[3] },
    { title: "Cover the planning rules", description: "Verify weighted priority scoring, Fibonacci effort, dependency ordering, and capacity limits.", category: "testing" as const, story: stories[2] },
    { title: "Prepare the release path", description: "Document the run command and ensure the app has useful empty, loading, success, and error states.", category: "deployment" as const, story: stories[3] },
  ];

  const categoryOrder = ["database", "backend", "frontend", "testing", "deployment"];
  const taskAccumulator: EngineeringTask[] = [];
  const tasks: EngineeringTask[] = taskBlueprints.map((blueprint, index) => {
    const priority = makePriority(`${blueprint.title} ${blueprint.description}`, input);
    const effort = effortFor(blueprint.description, "task");
    const previousCategories = categoryOrder.slice(0, categoryOrder.indexOf(blueprint.category));
    const dependencyIds = taskAccumulator
      .filter((task) => previousCategories.includes(task.category))
      .slice(-1)
      .map((task) => task.id);
    const dependencyLabels = dependencyIds.map((dependencyId) => taskAccumulator.find((task) => task.id === dependencyId)?.title ?? "Prior work");
    const task: EngineeringTask = {
      id: index + 1,
      title: blueprint.title,
      description: blueprint.description,
      category: blueprint.category,
      priority,
      effortPoints: effort.points,
      effortReason: effort.reason,
      dependencyIds,
      dependencyLabels,
      assignedSprint: null,
      allocationStatus: "unallocated",
    };
    taskAccumulator.push(task);
    return task;
  });

  const allocation = allocateTasks(tasks, input.availableSprints, input.teamCapacity, input.sprintLength);
  const allocatedTasks = allocation.tasks;
  const sprints = allocation.sprints;
  const placed = new Set(allocatedTasks.filter((task) => task.allocationStatus === "allocated").map((task) => task.id));

  const decisionExplanation = [
    "Priority combines business value (35%), user impact (30%), urgency (20%), and risk reduction (15%).",
    "Effort uses Fibonacci points and increases with requirement length, cross-system keywords, and integration risk.",
    "Dependencies follow database → backend → frontend → testing → deployment, and a task cannot land before its prerequisites.",
    `${placed.size} of ${tasks.length} engineering tasks fit within the configured ${input.availableSprints} sprint${input.availableSprints === 1 ? "" : "s"} and ${input.teamCapacity}-point capacity.`,
  ];

  return { input, prd, stories, tasks: allocatedTasks, sprints, decisionExplanation };
}