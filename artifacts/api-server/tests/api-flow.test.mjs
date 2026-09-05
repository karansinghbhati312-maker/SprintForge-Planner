import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:80/api";
const title = `[Regression] ${Date.now()}`;
const payload = {
  title,
  description: "Create a dependable setup checklist for new workspace admins.",
  targetUsers: "Workspace administrators",
  businessGoal: "Reduce setup time",
  mainProblem: "Admins miss the steps needed to reach first value.",
  mustHaveRequirements: "Show setup progress\nInvite teammates\nConnect a data source",
  niceToHaveRequirements: "Send a reminder",
  constraints: "Keep the first release focused",
  sprintLength: 2,
  teamCapacity: 24,
  availableSprints: 3,
};

async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options?.headers ?? {}) },
  });
  const text = await response.text();
  return { response, body: text ? JSON.parse(text) : null };
}

test("create, persist, retrieve, rename, inspect stats, and delete a plan", async () => {
  const invalid = await request("/plans", { method: "POST", body: JSON.stringify({ title: "Missing required fields" }) });
  assert.equal(invalid.response.status, 400);
  assert.match(invalid.body.error, /required|expected|invalid/i);

  const created = await request("/plans", { method: "POST", body: JSON.stringify(payload) });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.status, "completed");
  assert.ok(created.body.prd.executiveSummary);
  assert.ok(created.body.stories.length > 0);
  assert.ok(created.body.tasks.length > 0);
  assert.ok(created.body.sprints.length > 0);
  assert.ok(created.body.decisionExplanation.length > 0);

  const id = created.body.id;
  const listed = await request("/plans");
  assert.equal(listed.response.status, 200);
  assert.ok(listed.body.some((plan) => plan.id === id && plan.taskCount > 0));

  const retrieved = await request(`/plans/${id}`);
  assert.equal(retrieved.response.status, 200);
  assert.equal(retrieved.body.id, id);
  assert.equal(retrieved.body.input.title, title);

  const renamed = await request(`/plans/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ title: `${title} renamed` }),
  });
  assert.equal(renamed.response.status, 200);
  assert.equal(renamed.body.title, `${title} renamed`);

  const stats = await request("/admin/stats");
  assert.equal(stats.response.status, 200);
  assert.ok(stats.body.totalPlans >= 1);
  assert.ok(stats.body.totalTasks >= created.body.tasks.length);
  assert.ok(stats.body.completedRuns >= 1);

  const deleted = await request(`/plans/${id}`, { method: "DELETE" });
  assert.equal(deleted.response.status, 204);
  const missing = await request(`/plans/${id}`);
  assert.equal(missing.response.status, 404);
});