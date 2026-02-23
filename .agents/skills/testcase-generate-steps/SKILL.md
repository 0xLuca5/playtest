---
name: testcase-generate-steps
description: Generate or improve detailed test steps for the current test case. Use when user asks to generate/add/update test steps.
tools:
  - updateTestCase
---

# Testcase Generate Steps

## When to use this skill
Use this skill when the user asks to:
- generate test steps
- add steps / add more steps
- modify or refine existing steps

## How to execute
1. Identify the target test case id.
2. Call `updateTestCase` with `operation: "generate_steps"` when generating steps from scratch.
3. Call `updateTestCase` with `operation: "update_steps"` and provide a full `steps` array when updating.

## Important rules
- Steps must be specific and actionable.
- Do not ask the user to re-provide basic test case info if it already exists in context.
