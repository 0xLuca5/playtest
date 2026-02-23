# Steps guidelines (Testcase Authoring)

## When to generate steps
- If a test case has no steps and the user requests steps, treat it as a steps generation request.

## Step quality bar
- Each step must include:
  - action
  - expected result
- Steps should be atomic and testable.
- Include validation/verification steps where appropriate.

## Updating steps
- When adding/removing/modifying steps, update the test case via `updateTestCase`.
- Preserve existing correct steps; only change what the user requested.
