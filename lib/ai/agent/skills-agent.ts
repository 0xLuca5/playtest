import path from 'node:path';

import type { UIMessage } from 'ai';

import { buildSkillsPrompt, discoverSkills, type SkillMetadata } from '@/lib/ai/skills';
import { getToolsForMode, type ToolConfig } from '@/lib/ai/tools/tool-config';

let cachedSkillsPromise: Promise<SkillMetadata[]> | null = null;

export async function getDiscoveredSkills(params?: {
  skillsDirs?: string[];
}): Promise<SkillMetadata[]> {
  if (!cachedSkillsPromise) {
    const defaultSkillsDir = path.join(process.cwd(), '.agents', 'skills');
    const dirs = params?.skillsDirs?.length ? params.skillsDirs : [defaultSkillsDir];
    cachedSkillsPromise = discoverSkills(dirs);
  }

  return cachedSkillsPromise;
}

export function buildSystemWithSkills(params: {
  baseSystem: string;
  skills: SkillMetadata[];
}): string {
  return `${params.baseSystem}\n\n${buildSkillsPrompt(params.skills)}`;
}

export async function prepareSkillsTools(params: {
  toolConfig: ToolConfig;
  skillsDirs?: string[];
}) {
  const skills = await getDiscoveredSkills({ skillsDirs: params.skillsDirs });
  const tools = getToolsForMode({ ...params.toolConfig, skills });

  return { skills, tools };
}

export async function runSkillsAgentStream(params: {
  baseSystem: string;
  uiMessages: UIMessage[];
  toolConfig: ToolConfig;
  skillsDirs?: string[];
  streamText: (options: {
    model: any;
    system: string;
    messages: any;
    stopWhen: any;
    experimental_activeTools: string[];
    experimental_transform?: any;
    tools: any;
    experimental_telemetry?: any;
  }) => any;
  model: any;
  convertToModelMessages: (messages: UIMessage[]) => any;
  stopWhen: any;
  experimental_transform?: any;
  experimental_telemetry?: any;
  dataStream: { merge: (stream: any) => void };
}) {
  const { tools, skills } = await prepareSkillsTools({
    toolConfig: params.toolConfig,
    skillsDirs: params.skillsDirs,
  });

  const result = params.streamText({
    model: params.model,
    system: buildSystemWithSkills({ baseSystem: params.baseSystem, skills }),
    messages: params.convertToModelMessages(params.uiMessages),
    stopWhen: params.stopWhen,
    experimental_activeTools: Object.keys(tools),
    experimental_transform: params.experimental_transform,
    tools,
    experimental_telemetry: params.experimental_telemetry,
  });

  result.consumeStream();

  params.dataStream.merge(
    result.toUIMessageStream({
      sendReasoning: true,
    }),
  );

  return { skills, tools };
}
