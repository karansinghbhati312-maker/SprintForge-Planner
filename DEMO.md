# SprintForge academic demonstration script

Estimated duration: 3–5 minutes.

## 1. Introduce the problem — 30 seconds

“SprintForge helps product and engineering teams turn an incomplete feature idea into an explainable delivery plan. The challenge is not only generating tasks; it is making priorities, effort, dependencies, and capacity trade-offs visible.”

## 2. Show the overview — 30 seconds

Open the SprintForge overview.

Point out:

- The live plan, story, and task counts.
- The engine status card.
- The recent saved plan.
- The planning cadence summary.

Explain that these values come from the API and persisted database records rather than hard-coded dashboard copy.

## 3. Create a plan — 60–90 seconds

Open **New feature plan** and enter:

- **Feature title:** Guided workspace onboarding
- **Description:** Help new workspace administrators reach their first value moment.
- **Target users:** Workspace administrators at growing B2B teams
- **Business goal:** Reduce time-to-value and onboarding support volume
- **Main problem:** New administrators do not know which setup step matters first.
- **Must-have requirements:** Invite teammates, show setup progress, connect a data source
- **Nice-to-have requirements:** Send a reminder when setup stalls
- **Constraints:** Must ship before the next launch
- **Sprint length:** 2 weeks
- **Team capacity:** 24 points
- **Available sprints:** 3

Briefly show that required fields use browser and server validation. Then select **Generate plan**.

## 4. Explain the generated result — 60–90 seconds

On the generated plan page, move through the tabs:

1. **PRD** — show the executive summary, problem, requirements, risks, and success metrics.
2. **User stories** — show acceptance criteria, priority labels, weighted scores, and effort points.
3. **Engineering tasks** — show categories, dependency labels, effort reasons, and sprint assignments.
4. **Sprint plan** — show used points versus capacity and any unallocated work.
5. **Risks & metrics** — show the generated planning signals and explanations.

Explain that the generator is rule-based, so repeating the same input produces the same output without an OpenAI API key.

## 5. Verify persistence and administration — 45–60 seconds

Open **Saved plans** and point out the generated plan. Refresh the page and open the same plan again to demonstrate PostgreSQL persistence.

Use the plan menu to:

- Rename the plan.
- Copy the PRD or export the full plan as Markdown.
- Delete the plan after the demonstration if cleanup is desired.

Open **Monitoring** and show:

- Total plans, stories, and tasks.
- Completed and failed processing runs.
- Priority distribution.
- Sprint capacity usage.
- Recent activity linked to plan titles.

Close by emphasizing that admin statistics are calculated from stored workflow records.

## 6. Closing statement — 20 seconds

“SprintForge provides a transparent bridge from product intent to executable delivery work. Its current rule-based design prioritizes reproducibility and explanation. AI assistance could be added later, but the core academic workflow is complete without an external model or API key.”