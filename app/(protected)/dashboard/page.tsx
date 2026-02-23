'use client';

import { SidebarInset } from "@/components/navigation/sidebar-main"
import { TrendAreaChart } from "@/components/dashboard/trend-area-chart"
import { DataCard } from "@/components/dashboard/data-card"
import * as React from "react"
import { useEffect, useState } from "react"
import { useCurrentProjectId } from "@/lib/contexts/project-context"
import { MIDSCENE_REPORT } from '@/artifacts/types'
import { useIntl } from 'react-intl'

interface DashboardStats {
  title: string;
  value: number;
  percent: string;
  chartType: 'line' | 'bar' | 'radar' | undefined;
  chartKey: string;
  chartData: Array<{ day: string; value: number }>;
}

interface TestCaseNatureCounts {
  unit: number;
  integration: number;
  system: number;
  e2e: number;
}

interface TrendData {
  date: string;
  sheet: number;
  [MIDSCENE_REPORT]: number;
  text: number;
  code: number;
  all: number;
}

export default function Page() {
  const intl = useIntl();
  const currentProjectId = useCurrentProjectId();
  const [stats, setStats] = useState<DashboardStats[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [currentCounts, setCurrentCounts] = useState<TestCaseNatureCounts | null>(null);
  const [testCaseNatureTrends, setTestCaseNatureTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 翻译函数 - 使用 useCallback 来稳定引用
  const t = React.useCallback((id: string, values?: Record<string, any>) => {
    try {
      return intl.formatMessage({ id }, values);
    } catch {
      return id;
    }
  }, [intl]);

  const fetchDashboardData = React.useCallback(async () => {
    console.log('🔍 Dashboard fetchDashboardData called with currentProjectId:', currentProjectId);

    if (!currentProjectId) {
      console.log('❌ No currentProjectId, skipping fetch');
      setLoading(false);
      setError(t('dashboard.noProject'));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('📡 Fetching dashboard data for project:', currentProjectId);
      const response = await fetch(`/api/dashboard?projectId=${currentProjectId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      console.log('✅ Dashboard data received:', data);

      // 保存test-case测试阶段趋势数据
      setTestCaseNatureTrends(data.testCaseNatureTrends || []);

      // 计算当前test-case测试阶段计数（从所有数据中累计）
      if (data.testCaseNatureTrends && data.testCaseNatureTrends.length > 0) {
        const totalCounts = {
          unit: 0,
          integration: 0,
          system: 0,
          e2e: 0,
        };

        // 累计所有天的运行次数
        data.testCaseNatureTrends.forEach((dayData: any) => {
          totalCounts.unit += dayData.unit || 0;
          totalCounts.integration += dayData.integration || 0;
          totalCounts.system += dayData.system || 0;
          totalCounts.e2e += dayData.e2e || 0;
        });

        setCurrentCounts(totalCounts);
      }

      // Activity API 已移除，不再需要获取活动数据

      // 生成卡片图表数据
      const chartDays = 7;
      const chartToday = new Date();
      const chatTrend: Array<{ day: string; value: number }> = [];
      const userTrend: Array<{ day: string; value: number }> = [];
      const repoTrend: Array<{ day: string; value: number }> = [];

      for (let i = chartDays - 1; i >= 0; i--) {
        const day = new Date(chartToday);
        day.setDate(chartToday.getDate() - i);
        day.setHours(0, 0, 0, 0);
        const dayStr = day.toISOString().slice(5, 10); // MM-DD

        // 使用简单的默认值，不再依赖活动数据
        chatTrend.push({ day: dayStr, value: Math.floor(Math.random() * 5 + 2) });
        userTrend.push({ day: dayStr, value: Math.floor(Math.random() * 3 + 1) });
        repoTrend.push({ day: dayStr, value: Math.floor(Math.random() * 2 + 1) });
      }

      // 使用API返回的真实测试用例测试阶段分布数据
      const testCaseNatureDistribution = data.stats[1].chartData.map((item: any) => ({
        category: item.day,
        count: item.value,
        categoryLabel: t(`testCase.nature.${item.day}`) || item.day
      }));

      const statsData = [
        {
          title: t('dashboard.stats.automationCoverage'),
          value: data.stats[0].value,
          percent: data.stats[0].percent,
          chartType: data.stats[0].chartType || 'line',
          chartKey: data.stats[0].chartKey || 'value',
          chartData: data.stats[0].chartData || chatTrend,
        },
        {
          title: t('dashboard.stats.testCaseAmount'),
          value: data.stats[1].value,
          percent: data.stats[1].percent,
          chartType: 'testCaseDistribution', // 强制使用测试用例分布类型
          chartKey: 'count',
          chartData: testCaseNatureDistribution, // 使用我们生成的测试用例分布数据
        },
        {
          title: t('dashboard.stats.testSuccessRate'),
          value: data.stats[2].value,
          percent: data.stats[2].percent,
          chartType: data.stats[2].chartType || 'line',
          chartKey: data.stats[2].chartKey || 'value',
          chartData: data.stats[2].chartData || userTrend,
        },
        {
          title: t('dashboard.stats.bugDistribution'),
          value: data.stats[3].value,
          percent: data.stats[3].percent,
          chartType: data.stats[3].chartType || 'radar',
          chartKey: data.stats[3].chartKey || 'count',
          chartData: data.stats[3].chartData || repoTrend,
        },
      ];

      setStats(statsData);

      // 使用真实的文档类型数据生成趋势数据
      const days = 7;
      const today = new Date();
      const realTrendData: TrendData[] = [];

      // 获取当前的文档类型计数
      const { text, code, sheet } = data.documentTypeCounts;

      for (let i = days - 1; i >= 0; i--) {
        const day = new Date(today);
        day.setDate(today.getDate() - i);
        day.setHours(0, 0, 0, 0);
        const dateStr = day.toISOString().slice(0, 10);

        // 使用真实数据的比例来生成趋势（模拟每日变化）
        const dayVariation = 0.8 + Math.random() * 0.4; // 80%-120% 的变化
        const daySheet = Math.max(0, Math.floor(sheet * dayVariation * 0.3)); // 每天约30%的总量
        const dayMidsceneReport = 0; // midscene_report 类型，当前为0
        const dayText = Math.max(0, Math.floor(text * dayVariation * 0.3));
        const dayCode = Math.max(0, Math.floor(code * dayVariation * 0.3));
        const dayAll = daySheet + dayMidsceneReport + dayText + dayCode;

        realTrendData.push({
          date: dateStr,
          sheet: daySheet,
          [MIDSCENE_REPORT]: dayMidsceneReport,
          text: dayText,
          code: dayCode,
          all: dayAll,
        });
      }

      console.log('📊 Generated trend data:', realTrendData);
      setTrendData(realTrendData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [currentProjectId, t]);

  useEffect(() => {
    console.log('🔄 Dashboard useEffect triggered, currentProjectId changed to:', currentProjectId);
    fetchDashboardData();
  }, [currentProjectId, fetchDashboardData]);

  // 监听项目切换事件
  useEffect(() => {
    const handleProjectChanged = (event: any) => {
      console.log('🚀 Dashboard received projectChanged event:', event.detail);
      fetchDashboardData();
    };

    window.addEventListener('projectChanged', handleProjectChanged);

    return () => {
      window.removeEventListener('projectChanged', handleProjectChanged);
    };
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <SidebarInset>
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-800 p-6">
          <div className="flex flex-1 flex-col gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.title')}</h1>
              <p className="text-muted-foreground">{t('dashboard.loading')}</p>
            </div>
          </div>
        </div>
      </SidebarInset>
    );
  }

  if (error) {
    return (
      <SidebarInset>
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-800 p-6">
          <div className="flex flex-1 flex-col gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.title')}</h1>
              {error === t('dashboard.noProject') ? (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800">
                    {error}
                  </p>
                </div>
              ) : (
                <p className="text-red-500">{t('dashboard.error')}: {error}</p>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    );
  }
  return (
    <SidebarInset>
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-800 p-3 sm:p-4 lg:p-6 xl:p-8 overflow-x-hidden">
        <div className="flex flex-1 flex-col gap-4 sm:gap-6 lg:gap-8 max-w-full">
          {/* 页面标题 */}
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold tracking-tight">{t('dashboard.title')}</h1>
            <p className="text-xs sm:text-sm lg:text-base xl:text-lg text-muted-foreground">
              {t('dashboard.subtitle')}
              {currentProjectId && (
                <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 block sm:inline">
                  ({t('dashboard.projectLabel')}: {currentProjectId})
                </span>
              )}
            </p>
          </div>

          {/* 统计卡片区 */}
          <div className="w-full">
            <DataCard stats={stats} />
          </div>

          {/* 趋势图区 */}
          <div className="w-full min-h-[500px] sm:min-h-[450px] lg:min-h-[500px]">
            <TrendAreaChart />
          </div>

          {/* Test Case表格区 */}
          {/* <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200 dark:border-zinc-700 p-6 flex-1">
            <Card className="bg-transparent border-none shadow-none">
              <DataTable data={[
                {
                  "id": 1,
                  "header": "Cover page",
                  "type": "Cover page",
                  "status": t('dashboard.status.inProcess'),
                  "target": "18",
                  "limit": "5",
                  "reviewer": "Eddie Lake"
                }
              ]}/>
            </Card>
          </div> */}
        </div>
      </div>
    </SidebarInset>
  );
}
