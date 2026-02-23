---
name: confluence-reader
description: Read and search Confluence pages to retrieve requirements and documentation.
tools:
  - getConfluencePage
  - searchConfluencePages
---

# Confluence Reader

## When to use this skill
Use this skill when you need to:
- read requirements or documentation from a Confluence page
- search Confluence for relevant pages by query
- extract key information from Confluence to support test case authoring, automation configuration, or troubleshooting

## How to execute
1. If you have a direct Confluence page URL or pageId+baseUrl, call `getConfluencePage`.
2. If you need to find a page by keywords, call `searchConfluencePages`.

## Notes
- External/share links (`/wiki/external/...`) require authentication and may not be supported. Ask for a direct page URL or credentials.
- Prefer structured extraction: first fetch the page, then summarize the parts relevant to the user’s request.
