---
name: execute-automation
description: Execute automation testing for a test case using existing saved automation configuration. Use when user asks to run/execute automation.
tools:
  - executeTestCaseAutomation
---

# Execute Automation

## When to use this skill
Use when user asks to run automation testing / execute automated tests.

## How to execute
1. Ensure automation configuration exists for the test case.
2. Call `executeTestCaseAutomation` with the testCaseId and title.

## Notes
- If no config exists, ask user to generate automation config first.
