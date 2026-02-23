# Tool usage rules (Testcase Authoring)

## Use tools, don't paste full artifacts in chat
When the user is asking to create or update a test case that should be stored in the system, you must use tools.

## Create vs Update
- Use `createTestCase` when the user explicitly wants a new test case saved.
- Use `updateTestCase` when the user wants to modify an existing test case (steps, description, priority, etc.).

## Critical: test data generation
When using `updateTestCase` to generate test data (operation `generate_test_data`), you MUST provide, in the SAME call:
- `operation: "generate_test_data"`
- `columns`: an array of column definitions
- `sampleData`: an array of sample rows
Never call with only `operation`.
