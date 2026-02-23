# Document kind guidance

When you use `createDocument`, choose the most appropriate kind based on the user's requested output:

- `text`: articles, instructions, example documents, reports, continuous prose
- `sheet`: structured tables such as datasets, comparisons, CSV-like outputs (only when user explicitly wants table format)
- `code`: scripts, source code, configuration files

Selection principle: decide by **content characteristics**, not by keyword matching.
