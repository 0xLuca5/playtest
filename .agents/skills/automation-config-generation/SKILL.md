---
name: automation-config-generation
description: Generate automation configuration for a test case (e.g. Midscene YAML or Karate feature) based on test case steps and context.
---

# Automation Config Generation

## When to use this skill
Use this skill when the user asks to:
- generate automation configuration
- generate Midscene YAML
- generate Karate feature file
- create automation config for a test case

## How to execute
1. Determine the target framework (default: midscene).
2. Use the existing route/tooling that generates and persists automation configuration.
3. Use the framework references under `references/` for detailed format constraints.

## Bundled references
- `references/midscene-detailed.<locale>.md`
- `references/karate-detailed.<locale>.md`
