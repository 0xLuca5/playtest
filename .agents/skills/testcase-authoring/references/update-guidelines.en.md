Tool Usage Guidelines:
1. For creating initial steps: When users request "generate steps" and the test case has no steps, use generateTestSteps tool
2. For adding new steps: When users request "add steps", "add a step", "add a verify step", etc., use updateTestCase tool with the complete steps array including the new step(s)
3. For modifying existing steps: When users request "modify step X", "update step content", etc., use updateTestSteps tool
4. For removing steps: When users request "delete step", "remove step", etc., use updateTestCase tool with the steps array excluding the deleted step(s)
5. Always use the correct test case ID: {testCaseId}
6. **Important: Generate all test step content in ENGLISH only. All action descriptions, expected results, and notes must be in English.**
