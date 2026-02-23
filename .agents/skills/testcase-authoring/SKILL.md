---
name: testcase-authoring
description: Create and refine test cases, including name/description/preconditions/steps/expected results.
---

# Testcase Authoring

## When to use this skill
Use this skill when the user asks to:
- create a new test case
- refine/optimize an existing test case
- generate or update test steps
- improve preconditions, expected results, or coverage

## How to execute
1. If the user requests creating a test case in the system, call `createTestCase`.
2. If the user requests updating an existing test case (steps/description/priority/data generation, etc.), call `updateTestCase`.
3. Follow the prompt snippets in `prompts/` for workflow rules and tool usage requirements.

## Output expectations
- Steps should be specific, actionable, and verifiable.
- Include clear expected results for each step.
- Prefer using tools over writing long test case content directly in chat.
