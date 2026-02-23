import { promises as fs } from 'node:fs';
import path from 'node:path';

export type SkillMetadata = {
  name: string;
  description: string;
  path: string;
  tools?: string[];
};

function parseToolsFromFrontmatter(frontmatter: string): string[] {
  const tools: string[] = [];

  const inlineMatch = frontmatter.match(/^tools:\s*(.+)\s*$/m);
  if (inlineMatch?.[1]) {
    const raw = inlineMatch[1].trim();
    const parts = raw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts;
  }

  const lines = frontmatter.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim() === 'tools:' || l.startsWith('tools:'));
  if (start === -1) return [];

  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith(' ') && !line.startsWith('\t') && !line.startsWith('-')) {
      break;
    }

    const item = line.match(/^\s*-\s*(.+?)\s*$/);
    if (item?.[1]) {
      tools.push(item[1].trim());
    }
  }

  return tools;
}

function parseFrontmatter(content: string): {
  name: string;
  description: string;
  tools: string[];
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match?.[1]) {
    throw new Error('No frontmatter found');
  }

  const frontmatter = match[1];
  const nameMatch = frontmatter.match(/^name:\s*(.+)\s*$/m);
  const descriptionMatch = frontmatter.match(/^description:\s*(.+)\s*$/m);

  const name = nameMatch?.[1]?.trim();
  const description = descriptionMatch?.[1]?.trim();

  if (!name || !description) {
    throw new Error('Invalid frontmatter');
  }

  const tools = parseToolsFromFrontmatter(frontmatter);

  return { name, description, tools };
}

export async function discoverSkills(directories: string[]): Promise<SkillMetadata[]> {
  const skills: SkillMetadata[] = [];
  const seenNames = new Set<string>();

  for (const dir of directories) {
    let entries: Array<{ name: string; isDirectory(): boolean }>;

    try {
      entries = (await fs.readdir(dir, { withFileTypes: true })) as any;
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillDir = path.join(dir, entry.name);
      const skillFile = path.join(skillDir, 'SKILL.md');

      try {
        const content = await fs.readFile(skillFile, 'utf-8');
        const frontmatter = parseFrontmatter(content);

        if (seenNames.has(frontmatter.name)) continue;
        seenNames.add(frontmatter.name);

        skills.push({
          name: frontmatter.name,
          description: frontmatter.description,
          path: skillDir,
          tools: frontmatter.tools,
        });
      } catch {
        continue;
      }
    }
  }

  return skills;
}
