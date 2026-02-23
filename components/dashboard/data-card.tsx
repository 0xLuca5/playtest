"use client"

import { Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, Legend, LabelList, ResponsiveContainer } from "recharts"
import { TrendingUp, Bug, AlertTriangle } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useI18n } from "@/hooks/use-i18n"
import * as React from "react"

// 注意：缺陷趋势数据现在从API获取，不再使用模拟数据

export interface StatCard {
  title: string
  value: number | string
  percent: string
  chartType?: 'line' | 'bar' | 'radar' | 'testCaseDistribution'
  chartKey?: string
  chartData?: Array<{ day: string; value: number; [key: string]: any }>
}

// 使用固定颜色确保在黑暗模式下的可见性
const getChartColor = (index: number) => {
  const colors = [
    '#3b82f6', // 蓝色 - 自动化覆盖率
    '#f59e0b', // 橙色 - test-case数量
    '#22c55e', // 绿色 - 测试成功率
    '#8b5cf6', // 紫色 - 仓库数量
  ];
  return colors[index % colors.length];
}

// 注意：bug分布数据现在从API获取，不再使用模拟数据

export function DataCard({ stats }: { stats: StatCard[] }) {
  const { t } = useI18n()



  return (
    <div className="grid gap-3 sm:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 w-full">
      {stats.map((stat, i) => {

        // 如果是雷达图类型，渲染Bug Distribution图表
        if (stat.chartType === 'radar') {
          const bugData = stat.chartData || generateBugDistributionData();
          const totalBugs = bugData.reduce((sum, item) => sum + item.count, 0);

          // 翻译bug类别
          const translateBugCategory = (category: string) => {
            const categoryKey = `dashboard.bugRadar.categories.${category}`;
            const translated = t(categoryKey);
            return translated === categoryKey ? category.charAt(0).toUpperCase() + category.slice(1) : translated;
          };

          const translatedBugData = bugData.map(item => ({
            ...item,
            categoryLabel: translateBugCategory(item.category)
          }));

          return (
            <Card key={stat.title} className="hover:shadow-lg transition-shadow duration-200 gap-4 w-full overflow-hidden py-2 h-[200px] sm:h-[220px] lg:h-[240px]">
              <CardContent className="pb-2 px-3 sm:px-4 pt-3 overflow-hidden h-full flex flex-col">
                <div className="text-xs sm:text-sm lg:text-base font-normal text-slate-600 dark:text-slate-400 leading-tight mb-1">
                  {stat.title}
                </div>
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</div>
                <p className="text-xs text-muted-foreground dark:text-slate-400 mb-1">
                  {stat.percent}
                </p>
                <div className="w-full h-[140px] mt-1">
                  <ChartContainer config={{}} className="h-full w-full dashboard-card-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={translatedBugData}
                        margin={{ top: 10, right: 10, left: 10, bottom: 30 }}
                      >
                      <defs>
                        <linearGradient id="bugGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f97316" stopOpacity={0.8} />
                          <stop offset="100%" stopColor="#ea580c" stopOpacity={0.9} />
                        </linearGradient>
                      </defs>
                      <ChartTooltip
                        cursor={{ fill: '#f97316', fillOpacity: 0.1 }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-3">
                                <div className="font-medium text-sm text-foreground mb-1">
                                  {data.categoryLabel}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {data.count} {t('dashboard.bugDistribution.bugs')}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {totalBugs > 0 ? Math.round((data.count / totalBugs) * 100) : 0}% of total
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/20" />
                      <XAxis
                        dataKey="categoryLabel"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        height={25}
                        interval={0}
                        className="text-muted-foreground dark:text-slate-400"
                      />
                      <YAxis
                        hide
                        domain={[0, 'dataMax + 2']}
                      />
                      <Bar
                        dataKey="count"
                        fill="url(#bugGradient)"
                        radius={4}
                        className="hover:opacity-80 transition-opacity"
                      >
                        <LabelList
                          dataKey="count"
                          position="center"
                          className="fill-white text-xs font-medium"
                        />
                      </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          );
        }

        // 如果是测试用例分布图类型，渲染Test Case Distribution图表
        if (stat.chartType === 'testCaseDistribution') {
          const testCaseData = stat.chartData || [];
          const totalTestCases = testCaseData.reduce((sum: number, item: any) => sum + (item.count || 0), 0);

          return (
            <Card key={stat.title} className="hover:shadow-lg transition-shadow duration-200 gap-4 w-full overflow-hidden py-2 h-[200px] sm:h-[220px] lg:h-[240px]">
              <CardContent className="pb-2 px-3 sm:px-4 pt-3 overflow-hidden h-full flex flex-col">
                <div className="text-xs sm:text-sm lg:text-base font-normal text-slate-600 dark:text-slate-400 leading-tight mb-1">
                  {stat.title}
                </div>
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</div>
                <p className="text-xs text-muted-foreground dark:text-slate-400 mb-1">
                  {stat.percent.includes('/')
                    ? stat.percent
                    : `${stat.percent} from last month`
                  }
                </p>
                <div className="w-full h-[140px] mt-1">
                  {/* 始终显示柱状图，即使数据为0 */}
                  <ChartContainer config={{}} className="h-full w-full dashboard-card-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={testCaseData}
                        margin={{ top: 10, right: 10, left: 10, bottom: 30 }}
                      >
                      <defs>
                        {stat.title.includes('Bug') ? (
                          <linearGradient id="bugDistributionGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f97316" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#ea580c" stopOpacity={0.9} />
                          </linearGradient>
                        ) : (
                          <linearGradient id="testCaseGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.9} />
                          </linearGradient>
                        )}
                      </defs>
                      <ChartTooltip
                        cursor={{ fill: stat.title.includes('Bug') ? '#f97316' : '#3b82f6', fillOpacity: 0.1 }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-3">
                                <div className="font-medium text-sm text-foreground mb-1">
                                  {data.categoryLabel || data.category}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {data.count} {t('dashboard.testCaseDistribution.testCases')}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {totalTestCases > 0 ? Math.round((data.count / totalTestCases) * 100) : 0}% of total
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/20" />
                      <XAxis
                        dataKey="categoryLabel"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        height={25}
                        interval={0}
                        className="text-muted-foreground dark:text-slate-400"
                      />
                      <YAxis
                        hide
                        domain={[0, 'dataMax + 2']}
                      />
                      <Bar
                        dataKey="count"
                        fill={stat.title.includes('Bug') ? "url(#bugDistributionGradient)" : "url(#testCaseGradient)"}
                        radius={4}
                        className="hover:opacity-80 transition-opacity"
                      >
                        <LabelList
                          dataKey="count"
                          position="center"
                          className="fill-white text-xs font-medium"
                        />
                      </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          );
        }

        return (
        <Card key={stat.title} className="hover:shadow-lg transition-shadow duration-200 gap-4 w-full overflow-hidden py-2 h-[200px] sm:h-[220px] lg:h-[240px]">
          <CardContent className="pb-2 px-3 sm:px-4 pt-3 overflow-hidden h-full flex flex-col">
            <div className="text-xs sm:text-sm lg:text-base font-normal text-slate-600 dark:text-slate-400 leading-tight mb-1">{stat.title}</div>
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</div>
            <p className="text-xs text-muted-foreground dark:text-slate-400 mb-1">
              {stat.percent.includes('/')
                ? stat.percent // 显示比例，如 "15/50"
                : `${stat.percent} from last month` // 显示变化百分比
              }
            </p>
            {stat.chartData && stat.chartData.length > 0 && stat.chartType && stat.chartKey && (
              // <div className="flex-1 w-full min-h-[100px] mt-1">
              <div className="w-full h-[140px] mt-1">
              {/* // <div className="flex-1 w-full h-[140px] mt-1"> */}
                {/* <ChartContainer config={{}} className="h-full w-full"> */}
                <ChartContainer config={{}} className="h-full w-full dashboard-card-chart">
                  {stat.chartType === 'line' ? (
                    <LineChart data={stat.chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/20" />
                      <XAxis dataKey="day" />
                      <ChartTooltip
                        cursor={{ stroke: getChartColor(i), strokeWidth: 1, strokeDasharray: '3 3' }}
                        content={
                          <ChartTooltipContent
                            className="w-[140px] bg-background/95 backdrop-blur-sm border border-border"
                            labelFormatter={(value) => {
                              // 根据图表类型显示不同的标签
                              if (stat.title.includes('Bug') || stat.title.includes('缺陷')) {
                                return `${t('dashboard.bugDistribution.category')}: ${value}`;
                              }
                              if (stat.title.includes('Test Case') || stat.title.includes('测试用例')) {
                                return `${t('dashboard.testCaseDistribution.category')}: ${value}`;
                              }
                              return `${t('common.day')}: ${value}`;
                            }}
                            formatter={(value) => [
                              `${value}${stat.title.includes('Rate') || stat.title.includes('Coverage') ? '%' : ''}`,
                              stat.title
                            ]}
                          />
                        }
                      />
                      <Line
                        type="monotone"
                        strokeWidth={2.5}
                        dataKey={stat.chartKey}
                        stroke={getChartColor(i)}
                        activeDot={{
                          r: 4,
                          strokeWidth: 2,
                          stroke: getChartColor(i),
                          fill: 'white',
                          className: 'drop-shadow-sm'
                        }}
                        dot={{
                          r: 2,
                          strokeWidth: 1.5,
                          stroke: getChartColor(i),
                          fill: getChartColor(i)
                        }}
                      />
                    </LineChart>
                  ) : (
                    <BarChart data={stat.chartData} margin={{ top: 5, right: 5, left: 5, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/20" />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 9 }}
                        tickLine={false}
                        axisLine={false}
                        height={12}
                        className="text-muted-foreground dark:text-slate-400"
                        interval="preserveStartEnd"
                      />
                      <ChartTooltip
                        cursor={{ fill: getChartColor(i), fillOpacity: 0.1 }}
                        content={
                          <ChartTooltipContent
                            className="w-[140px] bg-background/95 backdrop-blur-sm border border-border"
                            labelFormatter={(value) => {
                              // 根据图表类型显示不同的标签
                              if (stat.title.includes('Bug') || stat.title.includes('缺陷')) {
                                return `${t('dashboard.bugDistribution.category')}: ${value}`;
                              }
                              if (stat.title.includes('Test Case') || stat.title.includes('测试用例')) {
                                return `${t('dashboard.testCaseDistribution.category')}: ${value}`;
                              }
                              return `${t('common.day')}: ${value}`;
                            }}
                            formatter={(value) => [
                              `${value}${stat.title.includes('Rate') || stat.title.includes('Coverage') ? '%' : ''}`,
                              stat.title
                            ]}
                          />
                        }
                      />
                      <Bar
                        dataKey={stat.chartKey}
                        fill={getChartColor(i)}
                        radius={[2, 2, 0, 0]}
                        className="hover:opacity-80 transition-opacity"
                      >
                        <LabelList
                          dataKey={stat.chartKey}
                          position="top"
                          className="fill-foreground text-xs font-medium"
                          offset={5}
                        />
                      </Bar>
                    </BarChart>
                  )}
                </ChartContainer>
              </div>
            )}
          </CardContent>
        </Card>
        )
      })}
    </div>
  )
}