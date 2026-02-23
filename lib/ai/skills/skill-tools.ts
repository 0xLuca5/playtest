import path from 'node:path';
import { promises as fs } from 'node:fs';
import { tool } from 'ai';
import { z } from 'zod';
import type { SkillMetadata } from './skill-discovery';

function stripFrontmatter(content: string): string {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return match ? content.slice(match[0].length).trim() : content.trim();
}

export function createLoadSkillTool(params: { skills: SkillMetadata[] }) {
  return tool({
    description: 'Load a skill to get specialized instructions',
    inputSchema: z.object({
      name: z.string().describe('The skill name to load'),
    }),
    execute: async ({ name }) => {
      const skill = params.skills.find(
        (s) => s.name.toLowerCase() === name.toLowerCase(),
      );

      if (!skill) {
        return { error: `Skill '${name}' not found` };
      }

      const skillFile = path.join(skill.path, 'SKILL.md');
      const content = await fs.readFile(skillFile, 'utf-8');
      const body = stripFrontmatter(content);

      let activeTools: string[] = [];
      try {
        const toolsJsonPath = path.join(skill.path, 'tools.json');
        const toolsJsonRaw = await fs.readFile(toolsJsonPath, 'utf-8');
        const parsed = JSON.parse(toolsJsonRaw) as { activeTools?: unknown };
        if (Array.isArray(parsed.activeTools)) {
          activeTools = parsed.activeTools.filter((t): t is string => typeof t === 'string');
        }
      } catch {
        activeTools = skill.tools ?? [];
      }

      const prompts: Record<string, string> = {};
      try {
        const promptsDir = path.join(skill.path, 'prompts');
        const entries = await fs.readdir(promptsDir, { withFileTypes: true });
        const mdFiles = entries
          .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md'))
          .map((e) => e.name)
          .sort((a, b) => a.localeCompare(b));

        for (const filename of mdFiles) {
          const promptPath = path.join(promptsDir, filename);
          prompts[filename] = await fs.readFile(promptPath, 'utf-8');
        }
      } catch {
        // no prompts directory
      }

      return {
        skillDirectory: skill.path,
        content: body,
        activeTools,
        prompts,
      };
    },
  });
}

export function createReadFileTool(params: { allowedBaseDirs: string[] }) {
  return tool({
    description: 'Read a file from the filesystem',
    inputSchema: z.object({
      path: z.string(),
    }),
    execute: async ({ path: filePath }) => {
      const normalized = path.normalize(filePath);
      const isAllowed = params.allowedBaseDirs.some((baseDir) => {
        const relative = path.relative(baseDir, normalized);
        return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
      });

      if (!isAllowed) {
        return { error: 'Access denied' };
      }

      const content = await fs.readFile(normalized, 'utf-8');
      return { content };
    },
  });
}
