import type { SkillMetadata } from './skill-discovery';

export function buildSkillsPrompt(skills: SkillMetadata[]): string {
  const skillsList = skills.map((s) => `- ${s.name}: ${s.description}`).join('\n');

  return `## Skills\n\nUse the \`loadSkill\` tool to load a skill when the user's request would benefit from specialized instructions.\n\nAvailable skills:\n${skillsList}`;
}
