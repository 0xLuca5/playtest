// 自动化测试框架的专用prompt配置

import path from 'node:path';
import fs from 'node:fs';

export interface AutomationPromptConfig {
  framework: string;
  description: string;
  generationPrompt: {
    zh: string;
    en: string;
    ja: string;
  };
}

const detailedPromptCache = new Map<string, string>();

async function readDetailedPromptFromMarkdown(params: {
  framework: string;
  locale: string;
}): Promise<string | null> {
  const normalizedLocale = params.locale === 'zh' || params.locale === 'ja' ? params.locale : 'en';
  const cacheKey = `${params.framework}:${normalizedLocale}`;
  const cached = detailedPromptCache.get(cacheKey);
  if (cached) return cached;

  const referencesDir = path.join(
    process.cwd(),
    '.agents',
    'skills',
    'automation-config-generation',
    'references',
  );

  try {
    const fullPath = path.join(referencesDir, `${params.framework}-detailed-full.${normalizedLocale}.md`);
    const legacyPath = path.join(referencesDir, `${params.framework}-detailed.${normalizedLocale}.md`);

    const content = await fs.promises.readFile(fullPath, 'utf-8').catch(() => fs.promises.readFile(legacyPath, 'utf-8'));
    detailedPromptCache.set(cacheKey, content);
    return content;
  } catch {
    return null;
  }
}

function readDetailedPromptFromMarkdownSync(params: {
  framework: string;
  locale: string;
}): string | null {
  const normalizedLocale = params.locale === 'zh' || params.locale === 'ja' ? params.locale : 'en';
  const cacheKey = `${params.framework}:${normalizedLocale}`;
  const cached = detailedPromptCache.get(cacheKey);
  if (cached) return cached;

  const referencesDir = path.join(
    process.cwd(),
    '.agents',
    'skills',
    'automation-config-generation',
    'references',
  );

  try {
    const fullPath = path.join(referencesDir, `${params.framework}-detailed-full.${normalizedLocale}.md`);
    const legacyPath = path.join(referencesDir, `${params.framework}-detailed.${normalizedLocale}.md`);
    const content = fs.existsSync(fullPath)
      ? fs.readFileSync(fullPath, 'utf-8')
      : fs.readFileSync(legacyPath, 'utf-8');
    detailedPromptCache.set(cacheKey, content);
    return content;
  } catch {
    return null;
  }
}

// Midscene框架的详细prompt配置
export const midscenePromptConfig: AutomationPromptConfig = {
  framework: 'midscene',
  description: 'AI-powered web automation testing framework',

  // 用于生成详细YAML内容的prompt
  generationPrompt: {
    zh: ``,
    en: ``,
    ja: ``
  }
};

// 获取Karate的详细配置生成prompt
export function getKarateDetailedPrompt(locale: string): string {
  const md = readDetailedPromptFromMarkdownSync({ framework: 'karate', locale });
  if (md) return md;
  return '[automation-prompts] Missing markdown prompt: karate detailed prompt';
}

// 获取Midscene的详细YAML生成prompt
export function getMidsceneDetailedPrompt(locale: string): string {
  const md = readDetailedPromptFromMarkdownSync({ framework: 'midscene', locale });
  if (md) return md;
  return '[automation-prompts] Missing markdown prompt: midscene detailed prompt';
}



// 获取框架特定的详细生成prompt
export async function getFrameworkDetailedPrompt(framework: string, locale: string): Promise<string> {
  const normalizedFramework = framework.toLowerCase();

  if (normalizedFramework === 'playwright' || normalizedFramework === 'cypress' || normalizedFramework === 'selenium') {
    const md = await readDetailedPromptFromMarkdown({ framework: 'midscene', locale });
    if (md) return md;
    return getMidsceneDetailedPrompt(locale);
  }

  if (normalizedFramework === 'midscene' || normalizedFramework === 'karate') {
    const md = await readDetailedPromptFromMarkdown({ framework: normalizedFramework, locale });
    if (md) return md;
    return normalizedFramework === 'karate'
      ? getKarateDetailedPrompt(locale)
      : getMidsceneDetailedPrompt(locale);
  }

  const md = await readDetailedPromptFromMarkdown({ framework: 'midscene', locale });
  if (md) return md;
  return getMidsceneDetailedPrompt(locale);
}
