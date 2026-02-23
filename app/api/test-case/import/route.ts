import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth/auth.config';
import { db } from '@/lib/db';
import { testCase, testStep, folder } from '@/lib/db/schema';
import { parseTestCaseExcel, validateImportData } from '@/lib/excel/test-case-template';
import { eq, and, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

/**
 * 导入测试用例
 * POST /api/test-case/import
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;
    const parentFolderId = (formData.get('parentFolderId') as string) || null;

    if (!file) {
      return NextResponse.json({ error: '请选择要导入的Excel文件' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: '请指定项目ID' }, { status: 400 });
    }

    // 验证文件类型
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json({ error: '请上传Excel文件(.xlsx或.xls格式)' }, { status: 400 });
    }

    // 解析Excel文件
    const { testCases, testSteps } = await parseTestCaseExcel(file);

    if (testCases.length === 0) {
      return NextResponse.json({ error: 'Excel文件中没有找到有效的测试用例数据' }, { status: 400 });
    }

    // 验证数据格式
    const validation = validateImportData(testCases, testSteps);
    if (!validation.isValid) {
      return NextResponse.json({
        error: '数据验证失败',
        details: validation.errors
      }, { status: 400 });
    }

    // 开始导入数据
    const importResults = {
      successCount: 0,
      errorCount: 0,
      errors: [] as string[],
      createdTestCases: [] as any[],
      createdTestSteps: [] as any[]
    };

    // 确定导入的父级（基础）文件夹
    const userId = (session as any).user?.id || 'import-system';
    const originalFileName = file?.name || 'import';
    const baseFolderName = originalFileName.replace(/\.(xlsx|xls)$/i, '') || `Import_${new Date().toISOString().slice(0,19).replace(/[:T]/g, '-')}`;
    console.log('🗂️ Import base folder plan:', { projectId, parentFolderId, baseFolderName, userId });
    const baseFolderId = await ensureFolder(projectId, baseFolderName, parentFolderId, userId);
    console.log('✅ Base folder ensured:', { baseFolderId });

    // 不再根据Excel中的 folderPath 创建子目录；统一导入到本次导入创建的基础文件夹(baseFolderId)
    // 如果将来需要启用相对路径导入，这里可以加一个开关再使用 ensureFolderPath。


    // 导入测试用例
    for (const testCaseData of testCases) {
      try {
        // 检查是否已存在同名测试用例
        const existingTestCase = await db
          .select()
          .from(testCase)
          .where(
            and(
              eq(testCase.projectId, projectId),
              eq(testCase.name, testCaseData.name)
            )
          )
          .limit(1);

        if (existingTestCase.length > 0) {
          console.log('⚠️ Skip existing test case:', testCaseData.name);
          importResults.errors.push(`测试用例"${testCaseData.name}"已存在，跳过导入`);
          importResults.errorCount++;
          continue;
        }

        // 统一导入到本次导入创建的基础文件夹
        const folderId = baseFolderId;

        // 处理标签
        const tags = testCaseData.tags
          ? testCaseData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
          : [];

        // 创建测试用例
        const newTestCaseId = uuidv4();
        const now = Date.now(); // 统一使用整数时间戳（毫秒）

        console.log('➕ Creating test case in folder:', { name: testCaseData.name, folderId, baseFolderId });
        await db.insert(testCase).values({
          id: newTestCaseId,
          projectId,
          folderId: folderId || null,
          name: testCaseData.name || '',
          description: testCaseData.description || '',
          preconditions: testCaseData.preconditions || '',
          priority: testCaseData.priority || 'medium',
          status: testCaseData.status || 'draft',
          weight: testCaseData.weight || 'medium',
          format: testCaseData.format || 'classic',
          nature: testCaseData.nature || 'functional',
          type: testCaseData.type || 'functional',
          tags: JSON.stringify(tags),
          executionTime: testCaseData.executionTime || null,
          createdAt: now,
          updatedAt: now,
          createdBy: userId,
          updatedBy: userId,
        });

        importResults.createdTestCases.push({
          id: newTestCaseId,
          name: testCaseData.name
        });

        // 导入对应的测试步骤
        const relatedSteps = testSteps.filter(step =>
          step.testCaseName.trim() === testCaseData.name.trim()
        );

        // 按步骤序号排序
        relatedSteps.sort((a, b) => a.stepNumber - b.stepNumber);

        for (const stepData of relatedSteps) {
          const newStepId = uuidv4();

          await db.insert(testStep).values({
            id: newStepId,
            testCaseId: newTestCaseId,
            stepNumber: stepData.stepNumber || 1,
            action: stepData.action || '',
            expected: stepData.expected || '',
            type: stepData.type || 'manual',
            notes: stepData.notes || '',
            createdAt: now,
            updatedAt: now,
          });

          importResults.createdTestSteps.push({
            id: newStepId,
            testCaseId: newTestCaseId,
            stepNumber: stepData.stepNumber
          });
        }

        importResults.successCount++;
        console.log('✅ Test case created:', { id: newTestCaseId, name: testCaseData.name });
      } catch (error) {
        console.error(`导入测试用例"${testCaseData.name}"失败:`, error);
        importResults.errors.push(`测试用例"${testCaseData.name}"导入失败: ${(error as Error).message}`);
        importResults.errorCount++;
      }
    }

    console.log('📦 Import results summary:', importResults);
    return NextResponse.json({
      message: '导入完成',
      results: importResults
    });

  } catch (error) {
    console.error('导入测试用例失败:', error);
    return NextResponse.json(
      { error: '导入失败', details: (error as Error).message },
      { status: 500 }
    );

  }


/**
 * 确保在指定父级下存在一个名称为 name 的文件夹，不存在则创建
 */
async function ensureFolder(projectId: string, name: string, parentId: string | null, userId: string): Promise<string> {
  // 查找是否已存在
  console.log('🧭 ensureFolder called:', { projectId, name, parentId });
  const existing = await db
    .select()
    .from(folder)
    .where(
      and(
        eq(folder.projectId, projectId),
        eq(folder.name, name),
        parentId ? eq(folder.parentId, parentId) : isNull(folder.parentId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    console.log('↩️ Reuse existing folder:', { id: existing[0].id, name });
    return existing[0].id as string;
  }

  const newId = uuidv4();
  const nowTs = Date.now();
  // 计算路径与层级
  let parentPath = '';
  let level = 0;
  if (parentId) {
    const parent = await db
      .select()
      .from(folder)
      .where(eq(folder.id, parentId))
      .limit(1);
    if (parent.length > 0) {
      parentPath = (parent[0] as any).path || '';
      level = ((parent[0] as any).level || 0) + 1;
    }
  }
  const currentPath = `${parentPath}/${name}`;

  console.log('📁 Create folder:', { name, parentId });
  await db.insert(folder).values({
    id: newId,
    projectId,
    parentId,
    name,
    description: '导入创建的文件夹',
    path: currentPath,
    level,
    createdAt: nowTs,
    updatedAt: nowTs,
    createdBy: userId,
    updatedBy: userId,
  });
  return newId;
}



}