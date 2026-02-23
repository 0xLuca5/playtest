# Workflow guidance (Testcase Authoring)

## Phase 1: Create
- When the user asks to create a test case that should be saved and shown in the right panel, call `createTestCase`.
- Ensure the created test case includes:
  - name
  - description
  - preconditions
  - detailed steps
  - expected results

After creation, ask the user what they want to do next.

## Phase 2: Enhance (optional, can be parallel)
- Steps refinement: if user asks to generate/add/update steps, use `updateTestCase`.
- Test data generation: if user asks to generate datasets, use `updateTestCase` with operation `generate_test_data`.
- Automation config generation and execution are out of scope for this skill; load the relevant automation skill if needed.
