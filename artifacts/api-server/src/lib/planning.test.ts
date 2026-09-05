import assert from "node:assert/strict";
import test from "node:test";
import type { PlanInput, EngineeringTask } from "@workspace/api-zod";
import { allocateTasks, generatePlan, scoreFor } from "./planning.ts";

const input: PlanInput = {
  title: "Guided onboarding",
  description: "Help new admins reach a first value moment.",
  targetUsers: "Workspace administrators",
  businessGoal: "Reduce time to value and support volume",
  mainProblem: "New admins do not know which step matters first.",
  mustHaveRequirements: "Show progress\nInvite teammates\nConnect a data source",
  niceToHaveRequirements: "Send reminders",
  constraints: "Must ship before launch",
  sprintLength: 2,
  teamCapacity: 8,
  availableSprints: 2,
};

test("priority scoring uses the documented weighted formula and label thresholds", () => {
  const score = scoreFor("Connect a customer data source before launch", input);
  const expected = Math.round(
    score.businessValue * 0.35 +
      score.userImpact * 0.3 +
      score.urgency * 0.2 +
      score.riskReduction * 0.15,
  );
  assert.equal(score.score, expected);
  assert.ok(["Critical", "High", "Medium", "Low"].includes(score.label));
  assert.match(score.explanation, /35%/);
});

test("sprint allocation respects capacity and dependency ordering", () => {
  const plan = generatePlan(input);
  for (const sprint of plan.sprints) {
    assert.ok(sprint.usedPoints <= sprint.capacity);
    assert.equal(sprint.remainingPoints, sprint.capacity - sprint.usedPoints);
  }
  for (const task of plan.tasks) {
    if (task.assignedSprint === null) continue;
    for (const dependencyId of task.dependencyIds) {
      const dependency = plan.tasks.find((item) => item.id === dependencyId);
      assert.ok(dependency);
      if (dependency?.assignedSprint !== null) {
        assert.ok(task.assignedSprint >= dependency.assignedSprint);
      }
    }
  }
});

test("allocator marks work unallocated instead of exceeding capacity", () => {
  const priority = scoreFor("Core work", input);
  const tasks: EngineeringTask[] = [1, 2, 3].map((id) => ({
    id,
    title: `Task ${id}`,
    description: "Large bounded task",
    category: "frontend",
    priority,
    effortPoints: 8,
    effortReason: "Large scope",
    dependencyIds: [],
    dependencyLabels: [],
    assignedSprint: null,
    allocationStatus: "unallocated",
  }));
  const result = allocateTasks(tasks, 1, 8, 2);
  assert.equal(result.sprints[0].usedPoints, 8);
  assert.equal(result.tasks.filter((task) => task.allocationStatus === "allocated").length, 1);
  assert.equal(result.tasks.filter((task) => task.allocationStatus === "unallocated").length, 2);
});