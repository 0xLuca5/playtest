import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { knownIssue, testCase } from '@/lib/db/schema'
import { count, eq, and, sql, gte } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const days = parseInt(searchParams.get('days') || '30');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }


    // 计算时间范围
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);
    const daysAgoTimestamp = daysAgo.getTime();

    // 1. 按严重程度统计bug数量
    const bugsBySeverity = await db
      .select({
        severity: knownIssue.severity,
        count: count()
      })
      .from(knownIssue)
      .innerJoin(testCase, eq(knownIssue.testCaseId, testCase.id))
      .where(eq(testCase.projectId, projectId))
      .groupBy(knownIssue.severity);


    // 2. 按状态统计bug数量
    const bugsByStatus = await db
      .select({
        status: knownIssue.status,
        count: count()
      })
      .from(knownIssue)
      .innerJoin(testCase, eq(knownIssue.testCaseId, testCase.id))
      .where(eq(testCase.projectId, projectId))
      .groupBy(knownIssue.status);


    // 3. 按日期统计bug趋势（过去N天）
    const isPostgres = process.env.DB_PROVIDER === 'postgres';
    const dateExpression = isPostgres
      ? sql<string>`DATE(to_timestamp(${knownIssue.createdAt}/1000))`.as('date')
      : sql<string>`DATE(datetime(${knownIssue.createdAt}/1000, 'unixepoch'))`.as('date');

    const dateGroupBy = isPostgres
      ? sql`DATE(to_timestamp(${knownIssue.createdAt}/1000))`
      : sql`DATE(datetime(${knownIssue.createdAt}/1000, 'unixepoch'))`;

    const bugTrends = await db
      .select({
        date: dateExpression,
        status: knownIssue.status,
        count: count()
      })
      .from(knownIssue)
      .innerJoin(testCase, eq(knownIssue.testCaseId, testCase.id))
      .where(and(
        eq(testCase.projectId, projectId),
        gte(knownIssue.createdAt, daysAgoTimestamp)
      ))
      .groupBy(dateGroupBy, knownIssue.status)
      .orderBy(dateGroupBy);

    // 4. 处理趋势数据
    const processBugTrends = () => {
      const dates = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
      }

      const trendMap = new Map();
      
      // 初始化所有日期的数据
      dates.forEach(date => {
        trendMap.set(date, {
          date,
          newBugs: 0,
          fixedBugs: 0,
          closedBugs: 0,
          reopenedBugs: 0,
        });
      });

      // 填充实际数据
      bugTrends.forEach(item => {
        const date = item.date;
        const status = item.status;
        const count = item.count;

        if (trendMap.has(date)) {
          const dayData = trendMap.get(date);
          
          // 根据状态映射到趋势类型
          switch (status) {
            case 'open':
              dayData.newBugs += count;
              break;
            case 'investigating':
              dayData.newBugs += count;
              break;
            case 'resolved':
              dayData.fixedBugs += count;
              break;
            case 'wont-fix':
              dayData.closedBugs += count;
              break;
          }
        }
      });

      return Array.from(trendMap.values());
    };

    const bugTrendData = processBugTrends();

    // 5. 生成bug分布数据（按严重程度）
    const bugDistribution = [
      { category: "critical", categoryLabel: "Critical", count: 0 },
      { category: "high", categoryLabel: "High", count: 0 },
      { category: "medium", categoryLabel: "Medium", count: 0 },
      { category: "low", categoryLabel: "Low", count: 0 },
    ];

    // 填充实际数据
    bugsBySeverity.forEach(item => {
      const found = bugDistribution.find(d => d.category === item.severity);
      if (found) {
        found.count = item.count;
      }
    });

    // 计算总bug数量
    const totalBugs = bugDistribution.reduce((sum, item) => sum + item.count, 0);

    // 6. 计算bug统计
    const openBugs = bugsByStatus.find(b => b.status === 'open')?.count || 0;
    const resolvedBugs = bugsByStatus.find(b => b.status === 'resolved')?.count || 0;
    const totalBugsByStatus = bugsByStatus.reduce((sum, item) => sum + item.count, 0);

    return NextResponse.json({
      totalBugs,
      openBugs,
      resolvedBugs,
      bugDistribution,
      bugTrends: bugTrendData,
      bugsBySeverity,
      bugsByStatus,
      projectId,
    });
  } catch (error) {
    console.error('Bug API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bug data' },
      { status: 500 }
    );
  }
}
