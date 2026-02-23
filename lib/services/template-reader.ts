/**
 * 模板文件读取工具
 * 用于读取和处理自动化测试框架的模板文件
 */

import fs from 'fs';
import path from 'path';

export interface TemplateFile {
  path: string;
  content: string;
}

export interface TemplateConfig {
  framework: string;
  templatePath: string;
}

/**
 * 读取指定框架的模板文件
 */
export async function readTemplateFiles(framework: string): Promise<TemplateFile[]> {
  const templateDir = path.join(process.cwd(), 'template', framework);
  
  if (!fs.existsSync(templateDir)) {
    throw new Error(`Template directory not found for framework: ${framework}`);
  }

  const files: TemplateFile[] = [];
  
  try {
    const entries = fs.readdirSync(templateDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isFile()) {
        const filePath = path.join(templateDir, entry.name);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        files.push({
          path: entry.name,
          content: content
        });
      }
    }
    
    return files;
  } catch (error) {
    throw new Error(`Failed to read template files for ${framework}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 读取单个模板文件
 */
export async function readTemplateFile(framework: string, fileName: string): Promise<string> {
  const filePath = path.join(process.cwd(), 'template', framework, fileName);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Template file not found: ${filePath}`);
  }

  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read template file ${fileName}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 获取支持的框架列表
 */
export function getSupportedFrameworks(): string[] {
  const templateDir = path.join(process.cwd(), 'template');
  
  if (!fs.existsSync(templateDir)) {
    return [];
  }

  try {
    const entries = fs.readdirSync(templateDir, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
  } catch (error) {
    console.error('Failed to read template directory:', error);
    return [];
  }
}

/**
 * 检查框架是否有模板文件
 */
export function hasTemplateFiles(framework: string): boolean {
  const templateDir = path.join(process.cwd(), 'template', framework);
  const exists = fs.existsSync(templateDir);

  if (exists) {
    try {
      const files = fs.readdirSync(templateDir);
      return files.length > 0;
    } catch (error) {
      console.error(`Error reading template directory for ${framework}:`, error);
      return false;
    }
  }

  return false;
}

/**
 * 处理模板文件内容，替换占位符
 */
export function processTemplateContent(
  content: string, 
  variables: Record<string, string>
): string {
  let processedContent = content;
  
  // 替换变量占位符 {{variableName}}
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    processedContent = processedContent.replace(placeholder, value);
  }
  
  return processedContent;
}

/**
 * 为测试用例生成模板变量
 */
export function generateTemplateVariables(testCase: {
  id: string;
  name?: string;
  description?: string;
}): Record<string, string> {
  const testCaseName = testCase.name || 'Untitled Test Case';

  // 生成规范化的文件名（与实际YAML文件名一致）
  const normalizedFileName = testCaseName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // 移除特殊字符
    .replace(/\s+/g, '-') // 空格替换为连字符
    .replace(/-+/g, '-') // 多个连字符合并为一个
    .replace(/^-|-$/g, ''); // 移除开头和结尾的连字符

  return {
    testCaseId: testCase.id,
    testCaseName: testCaseName,
    testCaseFileName: normalizedFileName, // 添加规范化的文件名
    testCaseDescription: testCase.description || 'No description provided',
    timestamp: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0],
  };
}
