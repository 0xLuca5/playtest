import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth/auth.config';
import { generateText } from 'ai';
import { myProvider } from '@/lib/ai/providers';
import { createFolder, createTestCase, createTestSteps } from '@/lib/db/queries';
import { getCurrentProjectIdOrDefault } from '@/lib/utils/project';
import { getServerTranslation, getLocaleFromRequest } from '@/lib/utils/server-i18n';
import { isProductionEnvironment } from '@/lib/constants';

// Define test case structure using jsonSchema for better AI compatibility
type TestStep = {
  action: string;
  expected: string;
  type: 'manual' | 'automated' | 'optional';
};

type TestCase = {
  name: string;
  description: string;
  preconditions?: string;
  priority: 'high' | 'medium' | 'low';
  weight: 'high' | 'medium' | 'low';
  nature: 'unit' | 'integration' | 'system' | 'e2e';
  type: 'functional' | 'non-functional' | 'regression' | 'smoke';
  tags: string[];
  steps: TestStep[];
};

type Folder = {
  name: string;
  description?: string;
  testCases: TestCase[];
};

type GeneratedTestStructure = {
  folders: Folder[];
};

// 移除jsonSchema，使用generateText + JSON.parse

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { description, parentFolderId, projectId, locale: requestLocale } = body;

    // 获取用户语言偏好和翻译函数，优先使用前端传递的语言
    const locale = requestLocale || getLocaleFromRequest(request) || 'zh';
    console.log('🌐 Using locale:', locale);
    console.log('🌐 Request locale:', requestLocale);
    const t = await getServerTranslation(locale);

    if (!description) {
      return NextResponse.json(
        { error: t('testCase.aiGenerate.inputRequired') },
        { status: 400 }
      );
    }

    const finalProjectId = projectId || getCurrentProjectIdOrDefault();

    console.log('🤖 Generating test cases for description:', description);

    // 获取提示词模板
    const promptTemplate = t('testCase.aiGenerate.prompt', { description });
    console.log('📝 AI Prompt being used:', promptTemplate);
    console.log('📝 Prompt template length:', promptTemplate.length);
    console.log('📝 Is prompt template just the key?', promptTemplate === 'testCase.aiGenerate.prompt');

    // 使用 AI 生成测试用例结构 - 使用generateText
    const result = await generateText({
      model: myProvider.languageModel('qwen-max'),
      system: `You are a professional test engineer. Generate a test case structure STRICTLY following the JSON schema below.

⚠️ NON-NEGOTIABLE RULES:
1. Output RAW JSON ONLY — no markdown, no explanation, no prefix, no suffix.
2. "testCases" MUST be an ARRAY of objects — NEVER a number, string, or null.
3. Each testCase object MUST contain: name, description, priority, weight, nature, type, tags (array), steps (array).
4. Each step MUST contain: action, expected, type.
5. Use ONLY these values:
   - priority/weight: "high", "medium", "low"
   - nature: "unit", "integration", "system", "e2e"
   - type (testCase): "functional", "non-functional", "regression", "smoke"
   - type (step): "manual", "automated", "optional"
6. If user doesn't specify, use defaults:
   - priority: "medium"
   - weight: "medium"
   - nature: "unit"
   - type: "functional"
   - step.type: "automated"

📌 REQUIRED STRUCTURE (DO NOT DEVIATE):
{
  "folders": [
    {
      "name": "string",
      "description": "string (optional)",
      "testCases": [
        {
          "name": "string",
          "description": "string",
          "priority": "string",
          "weight": "string",
          "nature": "string",
          "type": "string",
          "tags": ["string"],
          "steps": [
            {
              "action": "string",
              "expected": "string",
              "type": "string"
            }
          ]
        }
      ]
    }
  ]
}

✅ VALID EXAMPLE — COPY THIS FORMAT EXACTLY:
{
  "folders": [
    {
      "name": "Amazon Search Function",
      "description": "Test cases for searching iPhone 16 on Amazon",
      "testCases": [
        {
          "name": "Search iPhone 16 on Amazon Homepage",
          "description": "Verify that searching for 'iPhone 16' returns relevant products",
          "priority": "medium",
          "weight": "medium",
          "nature": "functional",
          "type": "functional",
          "tags": ["amazon", "search", "iphone16"],
          "steps": [
            {
              "action": "Open Amazon homepage (https://www.amazon.com)",
              "expected": "Amazon homepage loads successfully",
              "type": "automated"
            },
            {
              "action": "Enter 'iPhone 16' in the search bar",
              "expected": "Search bar displays 'iPhone 16'",
              "type": "automated"
            },
            {
              "action": "Press Enter or click search button",
              "expected": "Search results page shows iPhone 16 related products",
              "type": "automated"
            }
          ]
        }
      ]
    }
  ]
}

📝 USER REQUEST: "create a test case: amazon search iphone16"

❗ OUTPUT RAW JSON NOW. "testCases" MUST BE ARRAY. DO NOT USE NUMBER. DO NOT FLATTEN. DO NOT INVENT.`,
      prompt: `User description: ${promptTemplate}`,
      temperature: 0.3,
      experimental_telemetry: {
        isEnabled: isProductionEnvironment,
        functionId: 'generate-test-cases',
      },
    });

    // 解析JSON
    let generatedStructure: GeneratedTestStructure;
    try {
      // 清理可能的markdown格式
      const cleanedText = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      generatedStructure = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', parseError);
      console.error('❌ Raw text:', result.text);
      throw new Error('AI generated invalid JSON format');
    }


    // 创建文件夹和测试用例
    const createdItems = [];
    const userEmail = (session as any).user?.email || 'unknown';

    // 创建文件夹及其测试用例
    for (const folder of generatedStructure.folders) {
      console.log('📁 Creating folder:', folder.name);
      
      const createdFolder = await createFolder({
        projectId: finalProjectId,
        name: folder.name,
        description: folder.description || '',
        parentId: parentFolderId || undefined,
        createdBy: userEmail
      });

      createdItems.push({
        type: 'folder',
        id: createdFolder.id,
        name: createdFolder.name
      });

      // 在文件夹中创建测试用例
      for (const testCase of folder.testCases) {
        console.log('📝 Creating test case in folder:', testCase.name);

        const createdTestCase = await createTestCase({
          projectId: finalProjectId,
          folderId: createdFolder.id,
          name: testCase.name,
          description: testCase.description,
          preconditions: testCase.preconditions,
          priority: testCase.priority,
          weight: testCase.weight,
          nature: testCase.nature,
          type: testCase.type,
          tags: testCase.tags,
          createdBy: userEmail
        });

        // 创建测试步骤
        if (testCase.steps && testCase.steps.length > 0) {
          console.log('📋 Creating test steps for:', testCase.name, 'steps count:', testCase.steps.length);

          const stepsToCreate = testCase.steps.map((step, index) => ({
            stepNumber: index + 1,
            action: step.action,
            expected: step.expected,
            type: step.type || 'automated',
            notes: undefined
          }));

          await createTestSteps(createdTestCase.id, stepsToCreate);
        }

        createdItems.push({
          type: 'testCase',
          id: createdTestCase.id,
          name: createdTestCase.name,
          folderId: createdFolder.id,
          steps: testCase.steps
        });
      }
    }



    console.log('✅ Successfully created', createdItems.length, 'items');

    const folderCount = generatedStructure.folders.length;
    const testCaseCount = generatedStructure.folders.reduce((acc, f) => acc + f.testCases.length, 0);

    return NextResponse.json({
      success: true,
      generatedStructure,
      createdItems,
      message: t('testCase.aiGenerate.successMessage', {
        folderCount,
        testCaseCount
      })
    }, { status: 201 });

  } catch (error) {
    console.error('Generate test cases error:', error);

    // 获取翻译函数（如果前面出错了）
    const locale = getLocaleFromRequest(request);
    const t = await getServerTranslation(locale);

    // 检查是否是AI生成相关的错误
    const isAIError = error instanceof Error && (
      error.message.includes('No object generated') ||
      error.message.includes('response did not match schema') ||
      error.message.includes('Type validation failed')
    );

    return NextResponse.json(
      {
        error: t('testCase.aiGenerate.failed'),
        details: error instanceof Error ? error.message : String(error),
        isAIError,
        suggestion: isAIError ? 'Please try with a simpler description or different wording.' : undefined
      },
      { status: 500 }
    );
  }
}
