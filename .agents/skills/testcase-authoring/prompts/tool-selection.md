# Tool selection (Testcase Authoring)

## Create a new test case
Use `createTestCase` when the user explicitly wants a new test case saved in the system and displayed in the right panel.

## Update an existing test case
Use `updateTestCase` when the user requests any change to an existing test case, including:
- steps
- description
- priority
- preconditions
- expected results

## Document vs Test Case
If the user explicitly requests a **document** or an **example document** (e.g. "test case document", "example document", "documentation"), prefer `createDocument` even if "test case" is mentioned.
Only use `createTestCase` when the user clearly wants a test case entity stored in the database.
