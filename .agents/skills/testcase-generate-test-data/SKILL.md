---
name: testcase-generate-test-data
description: Generate and save test datasets for the current test case. Use when user requests test data or datasets.
tools:
  - updateTestCase
---

# Testcase Generate Test Data

## When to use this skill
Use when the user asks to generate test data / datasets for a test case.

## How to execute
Call `updateTestCase` with:
- `operation: "generate_test_data"`
- `columns`: array of column definitions
- `sampleData`: array of 2-5 sample rows

## Critical
- `columns` and `sampleData` MUST be provided in the SAME tool call.
