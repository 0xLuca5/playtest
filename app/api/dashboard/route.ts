import { NextRequest, NextResponse } from 'next/server'
import { getDocumentTypeCounts } from '@/lib/db/queries'
import { db } from '@/lib/db'
import { document, testCase, automationConfig, testRun } from '@/lib/db/schema'
import { count, eq, and, sql, desc, gte } from 'drizzle-orm'
import { getCurrentProjectIdOrDefault } from '@/lib/utils/project'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 获取项目ID参数 - 必须从URL参数提供
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // 按项目统计文档数量
    const [documentCountResult] = await db
      .select({ count: count() })
      .from(document)
      .where(eq(document.projectId, projectId));

    // 计算test-case总数
    const [testCaseCountResult] = await db
      .select({ count: count() })
      .from(testCase)
      .where(eq(testCase.projectId, projectId));

    // 按测试阶段(nature)统计test-case数量
    const testCaseNatureDistribution = await db
      .select({
        nature: testCase.nature,
        count: count()
      })
      .from(testCase)
      .where(eq(testCase.projectId, projectId))
      .groupBy(testCase.nature);

    // 按类型和日期分组统计test-case运行次数（过去30天）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoTimestamp = thirtyDaysAgo.getTime(); // 使用毫秒级时间戳

    console.log('📅 查询30天前的日期:', thirtyDaysAgo.toISOString(), '毫秒级时间戳:', thirtyDaysAgoTimestamp);

    // 根据数据库类型使用不同的日期函数
    const isPostgres = process.env.DB_PROVIDER === 'postgres';
    const dateExpression = isPostgres
      ? sql<string>`DATE(to_timestamp(${testRun.runDate}/1000))`.as('date')
      : sql<string>`DATE(datetime(${testRun.runDate}/1000, 'unixepoch'))`.as('date');

    const dateGroupBy = isPostgres
      ? sql`DATE(to_timestamp(${testRun.runDate}/1000))`
      : sql`DATE(datetime(${testRun.runDate}/1000, 'unixepoch'))`;

    // 统一使用毫秒级时间戳进行比较
    const compareTimestamp = thirtyDaysAgoTimestamp;

    const testCaseNatureTrends = await db
      .select({
        nature: testCase.nature,
        date: dateExpression,
        count: count()
      })
      .from(testRun)
      .innerJoin(testCase, eq(testRun.testCaseId, testCase.id))
      .where(and(
        eq(testCase.projectId, projectId),
        gte(testRun.runDate, compareTimestamp) // 使用正确格式的时间戳进行比较
      ))
      .groupBy(testCase.nature, dateGroupBy)
      .orderBy(dateGroupBy);


    // 调试：检查数据库中的实际test case数据
    const allTestCases = await db
      .select({
        id: testCase.id,
        name: testCase.name,
        type: testCase.type,
        createdAt: testCase.createdAt,
        projectId: testCase.projectId
      })
      .from(testCase)
      .where(eq(testCase.projectId, projectId))
      .limit(10);

    // 调试：检查test_run表的数据
    const sampleTestRuns = await db
      .select({
        id: testRun.id,
        testCaseId: testRun.testCaseId,
        runDate: testRun.runDate,
        status: testRun.status,
        testCaseType: testCase.type,
        projectId: testCase.projectId
      })
      .from(testRun)
      .innerJoin(testCase, eq(testRun.testCaseId, testCase.id))
      .where(eq(testCase.projectId, projectId))
      .limit(10);

    // 计算自动化覆盖率
    // 1. 获取项目下所有测试用例数量
    const [totalTestCasesResult] = await db
      .select({ count: count() })
      .from(testCase)
      .where(eq(testCase.projectId, projectId));

    // 2. 获取有自动化配置的测试用例数量
    const [automatedTestCasesResult] = await db
      .select({ count: count() })
      .from(testCase)
      .innerJoin(automationConfig, eq(testCase.id, automationConfig.testCaseId))
      .where(and(
        eq(testCase.projectId, projectId),
        eq(automationConfig.isActive, 1)
      ));

    // 3. 计算覆盖率
    const totalTestCases = totalTestCasesResult.count;
    const automatedTestCases = automatedTestCasesResult.count;
    const automationCoverageRate = totalTestCases > 0
      ? ((automatedTestCases / totalTestCases) * 100).toFixed(1)
      : '0.0';

    // 4. 计算测试成功率
    // 获取所有有自动化配置且运行过的测试用例的最后一次运行状态
    const automatedTestCasesWithRuns = await db
      .select({
        testCaseId: testCase.id,
        lastRunStatus: sql<string>`(
          SELECT status
          FROM test_case_run
          WHERE test_case_run."test_case_id" = test_case.id
          ORDER BY "run_date" DESC
          LIMIT 1
        )`
      })
      .from(testCase)
      .innerJoin(automationConfig, eq(testCase.id, automationConfig.testCaseId))
      .innerJoin(testRun, eq(testCase.id, testRun.testCaseId))
      .where(and(
        eq(testCase.projectId, projectId),
        eq(automationConfig.isActive, 1)
      ))
      .groupBy(testCase.id);

    const totalAutomatedTestCasesWithRuns = automatedTestCasesWithRuns.length;
    const successfulAutomatedTestCases = automatedTestCasesWithRuns.filter(
      tc => tc.lastRunStatus === 'passed'
    ).length;

    const testSuccessRate = totalAutomatedTestCasesWithRuns > 0
      ? ((successfulAutomatedTestCases / totalAutomatedTestCasesWithRuns) * 100).toFixed(1)
      : '0.0';

    // 5. 生成真实的自动化覆盖率趋势数据（过去7天）
    const automationTrend = [];
    const today = new Date();
    const actualCoverageRate = parseFloat(automationCoverageRate);

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      // 使用真实的覆盖率数据，不添加随机变化
      automationTrend.push({
        day: date.toISOString().slice(5, 10), // MM-DD格式
        value: actualCoverageRate // 使用真实的覆盖率
      });
    }

    // 6. 生成真实的测试成功率趋势数据（过去7天）
    const successRateTrend = [];

    // 如果没有测试运行数据，所有天数都显示0
    if (totalAutomatedTestCasesWithRuns === 0) {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        successRateTrend.push({
          day: date.toISOString().slice(5, 10), // MM-DD格式
          value: 0
        });
      }
    } else {
      // 如果有测试数据，使用实际的成功率
      const actualSuccessRate = parseFloat(testSuccessRate);
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        successRateTrend.push({
          day: date.toISOString().slice(5, 10), // MM-DD格式
          value: actualSuccessRate // 使用真实的成功率，不添加随机变化
        });
      }
    }

    // 7. 生成test-case测试阶段分布的柱状图数据，确保所有阶段都显示
    // 定义所有测试阶段(nature)
    const allTestCaseNatures = [
      'unit',
      'integration',
      'system',
      'e2e'
    ];

    // 创建一个映射，包含实际数据
    const natureCountMap = new Map();
    testCaseNatureDistribution.forEach(item => {
      natureCountMap.set(item.nature || 'unknown', item.count);
    });

    // 生成图表数据，确保所有阶段都包含（即使数量为0）
    let testCaseNatureChartData = allTestCaseNatures.map(nature => ({
      day: nature,
      value: natureCountMap.get(nature) || 0
    }));

    // 添加其他未预定义的阶段
    testCaseNatureDistribution.forEach(item => {
      const nature = item.nature || 'unknown';
      if (!allTestCaseNatures.includes(nature)) {
        testCaseNatureChartData.push({
          day: nature,
          value: item.count
        });
      }
    });

    // 测试阶段只有4个，不需要合并处理
    // 按数量排序以便更好地显示
    testCaseNatureChartData = testCaseNatureChartData.sort((a, b) => b.value - a.value);

    // 8. 获取真实的bug数据
    let bugData = null;
    let totalBugCount = 0;
    let bugDistribution = [];

    try {
      const bugResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/dashboard/bugs?projectId=${projectId}&days=30`);
      if (bugResponse.ok) {
        bugData = await bugResponse.json();
        totalBugCount = bugData.totalBugs;
        bugDistribution = bugData.bugDistribution;
      }
    } catch (error) {
      console.error('Failed to fetch bug data:', error);
    }

    // 如果没有真实数据，保持空数据状态
    if (!bugData || totalBugCount === 0) {
      totalBugCount = 0;
      bugDistribution = [
        { category: "critical", categoryLabel: "Critical", count: 0 },
        { category: "high", categoryLabel: "High", count: 0 },
        { category: "medium", categoryLabel: "Medium", count: 0 },
        { category: "low", categoryLabel: "Low", count: 0 },
      ];
    }

    // 按项目获取文档类型统计
    const documentTypeCounts = await getDocumentTypeCounts(projectId);

    // 处理test-case测试阶段运行趋势数据
    const processTestCaseNatureTrends = () => {
      // 获取所有可能的测试阶段
      const allNatures = ['unit', 'integration', 'system', 'e2e'];

      // 生成过去30天的日期列表
      const dates = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]); // YYYY-MM-DD格式
      }

      // 创建日期和阶段的映射
      const trendMap = new Map();

      // 初始化所有日期的数据
      dates.forEach(date => {
        const dayData = { date, all: 0 };
        allNatures.forEach(nature => {
          dayData[nature] = 0;
        });
        trendMap.set(date, dayData);
      });

      // 填充实际运行数据
      testCaseNatureTrends.forEach(item => {
        const date = item.date;
        const nature = item.nature || 'unknown';
        const count = item.count; // 这里是运行次数，不是创建次数

        if (trendMap.has(date)) {
          const dayData = trendMap.get(date);
          if (allNatures.includes(nature)) {
            dayData[nature] = count;
          }
          dayData.all += count;
        }
      });

      // 转换为数组格式
      return Array.from(trendMap.values());
    };

    const testCaseNatureTrendData = processTestCaseNatureTrends();

    return NextResponse.json({
      stats: [
        {
          title: '自动化覆盖率',
          value: `${automationCoverageRate}%`,
          percent: `${automatedTestCases}/${totalTestCases}`,
          chartType: 'line',
          chartKey: 'value',
          chartData: automationTrend
        },
        {
          title: 'Test Case数量',
          value: testCaseCountResult.count,
          percent: testCaseNatureChartData.length > 0
            ? `${testCaseNatureChartData.length} phases`
            : 'No test cases',
          chartType: 'bar',
          chartKey: 'value',
          chartData: testCaseNatureChartData
        },
        {
          title: '测试成功率',
          value: `${testSuccessRate}%`,
          percent: `${successfulAutomatedTestCases}/${totalAutomatedTestCasesWithRuns}`,
          chartType: 'line',
          chartKey: 'value',
          chartData: successRateTrend
        },
        {
          title: 'Bug Distribution',
          value: totalBugCount,
          percent: bugData ? `${bugData.openBugs} open / ${bugData.resolvedBugs} resolved` : '50 total from last month',
          chartType: 'testCaseDistribution',
          chartKey: 'count',
          chartData: bugDistribution
        },

      ],
      documentTypeCounts,
      testCaseNatureTrends: testCaseNatureTrendData, // 新增test-case测试阶段趋势数据
      bugTrends: bugData?.bugTrends || [], // 新增bug趋势数据
      projectId, // 返回当前项目ID用于调试
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}