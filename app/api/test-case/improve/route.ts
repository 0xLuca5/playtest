import { NextRequest, NextResponse } from 'next/server';
import { getTestCasesByFolder } from '@/lib/db/queries';
import * as XLSX from 'xlsx';
import { generateText } from 'ai';
import { myProvider } from '@/lib/ai/providers';
import { db } from '@/lib/db';
import { testCaseComment } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, and } from 'drizzle-orm';

// 国际化翻译
const translations = {
  en: {
    title: 'AI Test Case Improvement Report',
    testCaseName: 'Test Case Name',
    description: 'Description',
    priority: 'Priority',
    status: 'Status',
    weight: 'Weight',
    stepCount: 'Step Count',
    currentSteps: 'Current Steps',
    improvementType: 'Improvement Type',
    improvementDescription: 'Improvement Description',
    implementationPriority: 'Implementation Priority',
    estimatedEffort: 'Estimated Effort',
    createdAt: 'Created At',
    updatedAt: 'Updated At',
    summary: 'Summary',
    totalTestCases: 'Total Test Cases',
    totalSuggestions: 'Total Suggestions',
    highPrioritySuggestions: 'High Priority Suggestions',
    mediumPrioritySuggestions: 'Medium Priority Suggestions',
    lowPrioritySuggestions: 'Low Priority Suggestions',
    recommendations: 'Key Recommendations'
  },
  zh: {
    title: 'AI 测试用例改进报告',
    testCaseName: '测试用例名称',
    description: '描述',
    priority: '优先级',
    status: '状态',
    weight: '重要性',
    stepCount: '步骤数量',
    currentSteps: '当前步骤',
    improvementType: '改进类型',
    improvementDescription: '改进描述',
    implementationPriority: '实施优先级',
    estimatedEffort: '预估工作量',
    createdAt: '创建时间',
    updatedAt: '更新时间',
    summary: '总结',
    totalTestCases: '测试用例总数',
    totalSuggestions: '建议总数',
    highPrioritySuggestions: '高优先级建议',
    mediumPrioritySuggestions: '中优先级建议',
    lowPrioritySuggestions: '低优先级建议',
    recommendations: '关键建议'
  },
  ja: {
    title: 'AI テストケース改善レポート',
    testCaseName: 'テストケース名',
    description: '説明',
    priority: '優先度',
    status: 'ステータス',
    weight: '重要度',
    stepCount: 'ステップ数',
    currentSteps: '現在のステップ',
    improvementType: '改善タイプ',
    improvementDescription: '改善説明',
    implementationPriority: '実装優先度',
    estimatedEffort: '推定工数',
    createdAt: '作成日時',
    updatedAt: '更新日時',
    summary: '概要',
    totalTestCases: 'テストケース総数',
    totalSuggestions: '提案総数',
    highPrioritySuggestions: '高優先度提案',
    mediumPrioritySuggestions: '中優先度提案',
    lowPrioritySuggestions: '低優先度提案',
    recommendations: '主要な推奨事項'
  }
};

// AI 分析测试用例并生成改进建议
async function generateAIImprovements(testCase: any, locale: string) {
  try {
    console.log(`Analyzing test case: ${testCase.name} (locale: ${locale})`);
    const prompt = locale === 'zh'
      ? `请分析以下测试用例并提供具体的改进建议：

测试用例名称: ${testCase.name}
描述: ${testCase.description || '无描述'}
当前步骤数: ${testCase.steps?.length || 0}
当前步骤: ${testCase.steps?.map((s: any, i: number) => `${i + 1}. ${s.action} - 期望: ${s.expected}`).join('\n') || '无步骤'}

请从以下角度提供改进建议：
1. 测试覆盖率增强
2. 测试清晰度改进
3. 测试效率优化
4. 测试可维护性
5. 自动化潜力
6. 数据验证增强

请为每个建议提供：
- 改进类型
- 具体描述
- 实施优先级 (High/Medium/Low)
- 预估工作量 (小时)
- 相关步骤编号 (如果建议针对特定步骤，提供步骤编号，否则为null)

请严格按照以下JSON格式返回，不要包含任何其他文本：
{
  "suggestions": [
    {
      "type": "改进类型",
      "description": "具体的改进描述",
      "priority": "High|Medium|Low",
      "effort": "预估工作量",
      "relatedStep": 步骤编号或null
    }
  ]
}`
      : `Please analyze the following test case and provide specific improvement suggestions:

Test Case Name: ${testCase.name}
Description: ${testCase.description || 'No description'}
Current Step Count: ${testCase.steps?.length || 0}
Current Steps: ${testCase.steps?.map((s: any, i: number) => `${i + 1}. ${s.action} - Expected: ${s.expected}`).join('\n') || 'No steps'}

Please provide improvement suggestions from these perspectives:
1. Test Coverage Enhancement
2. Test Clarity Improvement
3. Test Efficiency Optimization
4. Test Maintainability
5. Automation Potential
6. Data Validation Enhancement

For each suggestion, please provide:
- Improvement Type
- Specific Description
- Implementation Priority (High/Medium/Low)
- Estimated Effort (hours)
- Related Step Number (if the suggestion targets a specific step, provide the step number, otherwise null)

Please return strictly in the following JSON format, without any other text:
{
  "suggestions": [
    {
      "type": "Improvement Type",
      "description": "Specific improvement description",
      "priority": "High|Medium|Low",
      "effort": "Estimated effort",
      "relatedStep": step_number_or_null
    }
  ]
}`;

    const { text } = await generateText({
      model: myProvider.languageModel('qwen-max'),
      prompt: prompt,
      temperature: 0.7,
    });

    // 解析AI返回的JSON文本
    let suggestions = [];
    try {
      // 清理文本，移除可能的markdown代码块标记
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // 尝试直接解析
      let parsedResult;
      try {
        parsedResult = JSON.parse(cleanText);
      } catch (directParseError) {
        // 如果直接解析失败，尝试提取JSON对象
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No valid JSON found in response');
        }
      }

      suggestions = parsedResult.suggestions || [];

      // 验证suggestions格式
      if (!Array.isArray(suggestions)) {
        throw new Error('Suggestions is not an array');
      }

      // 验证每个suggestion的格式
      suggestions = suggestions.filter(s =>
        s && typeof s === 'object' &&
        s.type && s.description && s.priority && s.effort
      );

      console.log(`Successfully parsed ${suggestions.length} suggestions for ${testCase.name}`);

    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.log('AI response text:', text.substring(0, 500) + '...');
      // 如果解析失败，使用默认建议
      suggestions = [];
    }

    return {
      id: testCase.id,
      name: testCase.name,
      description: testCase.description || '',
      priority: testCase.priority || 'medium',
      status: testCase.status || 'draft',
      weight: testCase.weight || 'medium',
      stepCount: testCase.steps?.length || 0,
      currentSteps: testCase.steps?.map((s: any, i: number) => `${i + 1}. ${s.action}`).join('; ') || '',
      steps: testCase.steps || [], // 包含完整的步骤信息
      suggestions: suggestions || [],
      createdAt: testCase.createdAt ? new Date(testCase.createdAt).toLocaleDateString() : '',
      updatedAt: testCase.updatedAt ? new Date(testCase.updatedAt).toLocaleDateString() : ''
    };

  } catch (error) {
    console.error('AI analysis failed for test case:', testCase.name, error);

    // 返回默认建议
    return {
      id: testCase.id,
      name: testCase.name,
      description: testCase.description || '',
      priority: testCase.priority || 'medium',
      status: testCase.status || 'draft',
      weight: testCase.weight || 'medium',
      stepCount: testCase.steps?.length || 0,
      currentSteps: testCase.steps?.map((s: any, i: number) => `${i + 1}. ${s.action}`).join('; ') || '',
      steps: testCase.steps || [], // 包含完整的步骤信息
      suggestions: [
        {
          type: locale === 'zh' ? '测试清晰度改进' : 'Test Clarity Improvement',
          description: locale === 'zh' ? '建议添加更详细的测试步骤和预期结果' : 'Recommend adding more detailed test steps and expected results',
          priority: 'Medium',
          effort: '1-2',
          relatedStep: null
        }
      ],
      createdAt: testCase.createdAt ? new Date(testCase.createdAt).toLocaleDateString() : '',
      updatedAt: testCase.updatedAt ? new Date(testCase.updatedAt).toLocaleDateString() : ''
    };
  }
}

// 删除测试用例的所有 AI 评论
async function deleteAIComments(testCaseIds: string[]) {
  try {
    console.log('Deleting existing AI comments...');
    
    for (const testCaseId of testCaseIds) {
      // 删除该测试用例的所有 AI 评论
      await db
        .delete(testCaseComment)
        .where(
          and(
            eq(testCaseComment.testCaseId, testCaseId),
            eq(testCaseComment.authorType, 'ai')
          )
        );
      console.log(`Deleted AI comments for test case: ${testCaseId}`);
    }
    
    console.log('Successfully deleted all AI comments');
  } catch (error) {
    console.error('Failed to delete AI comments:', error);
    // 不抛出错误，让主流程继续
  }
}

// 将 AI 建议保存为评论
async function saveAISuggestionsAsComments(analysisData: any[], locale: string) {
  try {
    console.log('Saving AI suggestions as comments...');
    
    for (const testCaseData of analysisData) {
      const testCaseId = testCaseData.id; // 需要确保 testCaseData 包含 id
      
      if (!testCaseId) {
        console.warn('Test case ID not found, skipping comment creation');
        continue;
      }

      for (const suggestion of testCaseData.suggestions) {
        // 根据建议类型确定 commentType 和 category
        const getCommentTypeAndCategory = (suggestionType: string) => {
          const type = suggestionType.toLowerCase();
          
          if (type.includes('coverage') || type.includes('覆盖率')) {
            return { commentType: 'suggestion' as const, category: 'test_coverage' };
          } else if (type.includes('clarity') || type.includes('清晰度')) {
            return { commentType: 'suggestion' as const, category: 'test_clarity' };
          } else if (type.includes('efficiency') || type.includes('效率')) {
            return { commentType: 'suggestion' as const, category: 'test_efficiency' };
          } else if (type.includes('maintainability') || type.includes('可维护性')) {
            return { commentType: 'suggestion' as const, category: 'test_maintainability' };
          } else if (type.includes('automation') || type.includes('自动化')) {
            return { commentType: 'suggestion' as const, category: 'automation_potential' };
          } else if (type.includes('validation') || type.includes('验证')) {
            return { commentType: 'suggestion' as const, category: 'data_validation' };
          } else if (type.includes('performance') || type.includes('性能')) {
            return { commentType: 'suggestion' as const, category: 'performance' };
          } else if (type.includes('security') || type.includes('安全')) {
            return { commentType: 'suggestion' as const, category: 'security' };
          } else if (type.includes('issue') || type.includes('问题')) {
            return { commentType: 'issue' as const, category: 'test_coverage' };
          } else if (type.includes('risk') || type.includes('风险')) {
            return { commentType: 'risk' as const, category: 'test_coverage' };
          } else {
            return { commentType: 'suggestion' as const, category: 'test_coverage' };
          }
        };

        const { commentType, category } = getCommentTypeAndCategory(suggestion.type);

        // 获取相关步骤ID
        let relatedStepId = null;
        if (suggestion.relatedStep && testCaseData.steps && testCaseData.steps.length > 0) {
          const stepIndex = suggestion.relatedStep - 1; // 步骤编号从1开始，数组索引从0开始
          if (stepIndex >= 0 && stepIndex < testCaseData.steps.length) {
            relatedStepId = testCaseData.steps[stepIndex].id;
          }
        }

        // 创建包含 priority、status、weight 的 tags
        const tags = [
          `priority:${suggestion.priority}`,
          `status:${testCaseData.status}`,
          `weight:${testCaseData.weight}`
        ];

        // 创建评论记录
        const now = new Date().getTime();
        const newComment = {
          id: uuidv4(),
          testCaseId: testCaseId,
          content: suggestion.description,
          author: 'AI Assistant',
          authorType: 'ai' as const,
          commentType: commentType,
          category: category,
          tags: JSON.stringify(tags),
          relatedStepId: relatedStepId,
          isResolved: 0, // SQLite 中 boolean 存储为整数
          createdAt: now,
          updatedAt: now,
        };

        // 保存到数据库
        await db.insert(testCaseComment).values(newComment);
        console.log(`Saved AI suggestion comment for test case: ${testCaseData.name}`);
      }
    }
    
    console.log('Successfully saved all AI suggestions as comments');
  } catch (error) {
    console.error('Failed to save AI suggestions as comments:', error);
    // 不抛出错误，让主流程继续
  }
}

export async function POST(request: NextRequest) {
  try {
    const { folderId, projectId, locale = 'en' } = await request.json();
    
    if (!projectId) {
      return NextResponse.json({ message: 'Project ID is required' }, { status: 400 });
    }

    // 获取文件夹下的所有测试用例
    const testCases = await getTestCasesByFolder(projectId, folderId);
    
    if (!testCases || testCases.length === 0) {
      return NextResponse.json({ message: 'No test cases found in this folder' }, { status: 404 });
    }

    const t = translations[locale as keyof typeof translations] || translations.en;

    // 删除所有现有的 AI 评论
    const testCaseIds = testCases.map(tc => tc.id);
    await deleteAIComments(testCaseIds);

    // 使用 AI 分析每个测试用例
    const analysisPromises = testCases.map(testCase => generateAIImprovements(testCase, locale));
    const analysisData = await Promise.all(analysisPromises);

    // 将 AI 建议保存为评论
    await saveAISuggestionsAsComments(analysisData, locale);

    // 计算统计信息
    const totalTestCases = analysisData.length;
    const allSuggestions = analysisData.flatMap(item => item.suggestions);
    const totalSuggestions = allSuggestions.length;
    const highPrioritySuggestions = allSuggestions.filter(s => s.priority === 'High').length;
    const mediumPrioritySuggestions = allSuggestions.filter(s => s.priority === 'Medium').length;
    const lowPrioritySuggestions = allSuggestions.filter(s => s.priority === 'Low').length;

    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    
    // 创建详细数据工作表
    const detailsData: any[] = [];
    analysisData.forEach(item => {
      item.suggestions.forEach((suggestion: any) => {
        detailsData.push({
          [t.testCaseName]: item.name,
          [t.description]: item.description,
          [t.priority]: item.priority,
          [t.status]: item.status,
          [t.weight]: item.weight,
          [t.stepCount]: item.stepCount,
          [t.currentSteps]: item.currentSteps,
          [t.improvementType]: suggestion.type,
          [t.improvementDescription]: suggestion.description,
          [t.implementationPriority]: suggestion.priority,
          [t.estimatedEffort]: suggestion.effort,
          [t.createdAt]: item.createdAt,
          [t.updatedAt]: item.updatedAt
        });
      });
    });

    const detailsWorksheet = XLSX.utils.json_to_sheet(detailsData);
    
    // 创建汇总工作表
    const summaryData = [
      [t.summary, ''],
      [t.totalTestCases, totalTestCases],
      [t.totalSuggestions, totalSuggestions],
      [t.highPrioritySuggestions, highPrioritySuggestions],
      [t.mediumPrioritySuggestions, mediumPrioritySuggestions],
      [t.lowPrioritySuggestions, lowPrioritySuggestions],
      ['', ''],
      [t.recommendations, ''],
      [locale === 'zh' ? '建议优先实施高优先级改进项' : 'Recommend prioritizing high-priority improvements', ''],
      [locale === 'zh' ? '关注测试覆盖率和清晰度提升' : 'Focus on test coverage and clarity improvements', ''],
      [locale === 'zh' ? '考虑自动化潜力较大的测试用例' : 'Consider test cases with high automation potential', '']
    ];
    
    const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
    
    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, t.summary);
    XLSX.utils.book_append_sheet(workbook, detailsWorksheet, t.title);
    
    // 生成Excel文件
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // 设置文件名
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `test-case-improvements-${timestamp}.xlsx`;
    
    // 返回Excel文件
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': excelBuffer.length.toString(),
      },
    });
    
  } catch (error) {
    console.error('AI improvement analysis error:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
