import type { Plan } from "@workspace/api-client-react";

export function buildPrdText(plan: Plan) {
  const listSection = (title: string, items: string[]) => [`## ${title}`, ...items.map((item) => `- ${item}`)];
  return [
    `# ${plan.title}`,
    "",
    "## Executive summary",
    plan.prd.executiveSummary,
    "",
    "## Problem statement",
    plan.prd.problemStatement,
    "",
    ...listSection("Target users", plan.prd.targetUsers),
    "",
    ...listSection("Goals", plan.prd.goals),
    "",
    ...listSection("Non-goals", plan.prd.nonGoals),
    "",
    ...listSection("Functional requirements", plan.prd.functionalRequirements),
    "",
    ...listSection("Non-functional requirements", plan.prd.nonFunctionalRequirements),
    "",
    ...listSection("Assumptions", plan.prd.assumptions),
    "",
    ...listSection("Risks", plan.prd.risks),
    "",
    ...listSection("Success metrics", plan.prd.successMetrics),
    "",
    ...listSection("Acceptance criteria", plan.prd.acceptanceCriteria),
  ].join("\n");
}

export function buildMarkdown(plan: Plan) {
  return [
    buildPrdText(plan),
    "",
    "## User stories",
    ...plan.stories.map((story) => `### ${story.title}\n${story.statement}\n\nPriority: ${story.priority.label} (${story.priority.score}/100)\nEffort: ${story.effortPoints} points — ${story.effortReason}\n\nAcceptance criteria:\n${story.acceptanceCriteria.map((item) => `- ${item}`).join("\n")}`),
    "",
    "## Engineering tasks",
    ...plan.tasks.map((task) => `### ${task.title}\n- Category: ${task.category}\n- Priority: ${task.priority.label} (${task.priority.score}/100)\n- Effort: ${task.effortPoints} points — ${task.effortReason}\n- Sprint: ${task.assignedSprint ? `Sprint ${task.assignedSprint}` : "Unallocated"}\n- Dependencies: ${task.dependencyLabels.length ? task.dependencyLabels.join(", ") : "None"}\n\n${task.description}`),
    "",
    "## Sprint plan",
    ...plan.sprints.map((sprint) => `- ${sprint.label}: ${sprint.usedPoints}/${sprint.capacity} points`),
  ].join("\n");
}