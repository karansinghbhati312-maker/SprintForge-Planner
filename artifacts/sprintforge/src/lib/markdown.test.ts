import assert from "node:assert/strict";
import test from "node:test";
import type { Plan } from "@workspace/api-client-react";
import { buildMarkdown } from "./markdown.ts";

test("Markdown export contains the complete planning outline", () => {
  const plan = {
    title: "Export check",
    prd: {
      executiveSummary: "Summary",
      problemStatement: "Problem",
      targetUsers: ["Users"],
      goals: ["Goal"],
      nonGoals: ["Non-goal"],
      functionalRequirements: ["Requirement"],
      nonFunctionalRequirements: ["Performance"],
      assumptions: ["Assumption"],
      risks: ["Risk"],
      successMetrics: ["Metric"],
      acceptanceCriteria: ["Criterion"],
    },
    stories: [{
      title: "Story",
      statement: "As a user...",
      acceptanceCriteria: ["It works"],
      priority: { label: "High", score: 80 },
      effortPoints: 3,
      effortReason: "Moderate scope",
    }],
    tasks: [{
      title: "Task",
      description: "Implement the task",
      category: "frontend",
      priority: { label: "High", score: 80 },
      assignedSprint: 1,
      effortPoints: 5,
      effortReason: "Moderate scope",
      dependencyLabels: [],
    }],
    sprints: [{ label: "Sprint 1", usedPoints: 5, capacity: 8 }],
  } as unknown as Plan;
  const markdown = buildMarkdown(plan);
  for (const section of ["# Export check", "## Executive summary", "## Problem statement", "## Target users", "## Goals", "## Non-goals", "## Functional requirements", "## Non-functional requirements", "## Assumptions", "## Risks", "## Success metrics", "## Acceptance criteria", "## User stories", "## Engineering tasks", "## Sprint plan"]) {
    assert.match(markdown, new RegExp(section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});