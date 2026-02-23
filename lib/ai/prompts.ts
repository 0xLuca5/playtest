import type { ArtifactKind } from '@/components/chat/artifact';
import type { Geo } from '@vercel/functions';
import { MidsceneReportType, MIDSCENE_REPORT } from '@/artifacts/types';
import type { SkillMetadata } from './skills';
import { buildSkillsPrompt } from './skills';
import fs from 'node:fs';
import path from 'node:path';

export function readPromptFromMarkdownSync(params: {
  skill: string;
  fileBase: string;
  locale?: string;
  fallback: string;
}): string {
  const normalizedLocale =
    params.locale === 'zh' || params.locale === 'ja' ? params.locale : 'en';
  const suffix = params.locale ? `.${normalizedLocale}` : '';
  const filePath = path.join(
    process.cwd(),
    '.agents',
    'skills',
    params.skill,
    'prompts',
    `${params.fileBase}${suffix}.md`,
  );

  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return params.fallback;
  }
}

export const artifactsPrompt = readPromptFromMarkdownSync({
  skill: 'general-assistant',
  fileBase: 'artifacts-prompt',
  locale: 'en',
  fallback: '[prompts] Missing markdown prompt: general-assistant artifacts-prompt',
});

export const regularPrompt =
  'You are a friendly assistant! Keep your responses concise and helpful.';

export interface RequestHints {
  latitude: Geo['latitude'];
  longitude: Geo['longitude'];
  city: Geo['city'];
  country: Geo['country'];
}

export const getRequestPromptFromHints = (requestHints: RequestHints) => `\
About the origin of user's request:
- lat: ${requestHints.latitude}
- lon: ${requestHints.longitude}
- city: ${requestHints.city}
- country: ${requestHints.country}
`;

export const systemPrompt = ({
  selectedChatModel,
  requestHints,
  locale = 'zh',
}: {
  selectedChatModel: string;
  requestHints: RequestHints;
  locale?: string;
}) => {
  const normalizedLocale = locale === 'zh' || locale === 'ja' ? locale : 'en';
  const filePath = path.join(
    process.cwd(),
    '.agents',
    'skills',
    'general-assistant',
    'prompts',
    `system-prompt.${normalizedLocale}.md`,
  );

  let template: string;
  try {
    template = fs.readFileSync(filePath, 'utf-8');
  } catch {
    template = '[prompts] Missing markdown prompt: general-assistant system-prompt';
  }

  const reasoningHint = selectedChatModel === 'chat-model-reasoning'
    ? (normalizedLocale === 'zh'
      ? '请详细解释你的思考过程。'
      : normalizedLocale === 'ja'
        ? '思考プロセスを詳しく説明してください。'
        : 'Please explain your thought process in detail.')
    : '';

  const locationHint = requestHints.city
    ? (normalizedLocale === 'zh'
      ? `用户当前位置: ${requestHints.city}, ${requestHints.country}`
      : normalizedLocale === 'ja'
        ? `ユーザーの現在位置: ${requestHints.city}, ${requestHints.country}`
        : `User current location: ${requestHints.city}, ${requestHints.country}`)
    : '';

  return template
    .replaceAll('{REASONING_HINT}', reasoningHint)
    .replaceAll('{LOCATION_HINT}', locationHint)
    .replaceAll('{MIDSCENE_REPORT}', MIDSCENE_REPORT);
};

export const systemPromptWithSkills = ({
  selectedChatModel,
  requestHints,
  locale = 'zh',
  skills,
}: {
  selectedChatModel: string;
  requestHints: RequestHints;
  locale?: string;
  skills: SkillMetadata[];
}) => {
  return `${systemPrompt({ selectedChatModel, requestHints, locale })}\n\n${buildSkillsPrompt(skills)}`;
};

export const codePrompt = readPromptFromMarkdownSync({
  skill: 'general-assistant',
  fileBase: 'code-prompt',
  locale: 'en',
  fallback: '[prompts] Missing markdown prompt: general-assistant code-prompt',
});

// 多语言表格生成提示词
export const getSheetPrompt = (locale: string = 'en') => {
  const normalizedLocale = locale === 'zh' || locale === 'ja' ? locale : 'en';
  const filePath = path.join(
    process.cwd(),
    '.agents',
    'skills',
    'general-assistant',
    'prompts',
    `sheet-prompt.${normalizedLocale}.md`,
  );

  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '[prompts] Missing markdown prompt: general-assistant sheet-prompt';
  }
};

// 保持向后兼容性的默认导出
export const sheetPrompt = getSheetPrompt('en');

export const testingPrompt = readPromptFromMarkdownSync({
  skill: 'execute-automation',
  fileBase: 'testing-prompt',
  locale: 'zh',
  fallback: '[prompts] Missing markdown prompt: execute-automation testing-prompt',
});

export const updateDocumentPrompt = (
  currentContent: string | null,
  type: ArtifactKind,
) =>
  type === 'text'
    ? `\
Improve the following contents of the document based on the given prompt.

${currentContent}
`
    : type === 'code'
      ? `\
Improve the following code snippet based on the given prompt.

${currentContent}
`
      : type === 'sheet'
        ? `\
Improve the following spreadsheet based on the given prompt.

${currentContent}
`
        : type === MIDSCENE_REPORT
          ? `\
Improve the following testing plan based on the given prompt. Keep the YAML format intact.

${currentContent}
`
          : '';
