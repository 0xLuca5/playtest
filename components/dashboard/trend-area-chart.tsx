"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { useIntl } from 'react-intl'
import { useI18n } from '@/hooks/use-i18n'
import { useCurrentProjectId } from "@/lib/contexts/project-context"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
// 默认空数据，实际数据从API获取
const defaultChartData: DefectTrendData[] = []

interface DefectTrendData {
  date: string
  newBugs: number
  fixedBugs: number
  closedBugs: number
  reopenedBugs: number
}

interface TrendAreaChartProps {
  data?: DefectTrendData[]
  projectId?: string
}

export function TrendAreaChart({ data }: TrendAreaChartProps = {}) {
  const [timeRange, setTimeRange] = React.useState("30d")
  const intl = useIntl()
  const { formatDate } = useI18n()
  const currentProjectId = useCurrentProjectId()
  const [bugTrendData, setBugTrendData] = React.useState<DefectTrendData[]>([])
  const [loading, setLoading] = React.useState(true)

  // 从API获取真实的bug趋势数据
  React.useEffect(() => {
    const fetchBugTrends = async () => {
      if (!currentProjectId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const response = await fetch(`/api/dashboard/bugs?projectId=${currentProjectId}&days=30`)
        if (response.ok) {
          const bugData = await response.json()
          setBugTrendData(bugData.bugTrends || [])
        } else {
          console.error('Failed to fetch bug trends')
          setBugTrendData(defaultChartData) // 使用默认数据
        }
      } catch (error) {
        console.error('Error fetching bug trends:', error)
        setBugTrendData(defaultChartData) // 使用默认数据
      } finally {
        setLoading(false)
      }
    }

    fetchBugTrends()
  }, [currentProjectId])

  // 使用传入的数据、API数据或默认空数据
  const sourceData = data || bugTrendData.length > 0 ? bugTrendData : defaultChartData

  // 动态图表配置，支持国际化
  const chartConfig = React.useMemo(() => ({
    defects: {
      label: intl.formatMessage({ id: 'dashboard.defectTrend.title' }),
    },
    newBugs: {
      label: intl.formatMessage({ id: 'dashboard.defectTrend.newDefects' }),
      color: "hsl(var(--chart-1))", // 红色
    },
    fixedBugs: {
      label: intl.formatMessage({ id: 'dashboard.defectTrend.fixedDefects' }),
      color: "hsl(var(--chart-2))", // 绿色
    },
    closedBugs: {
      label: intl.formatMessage({ id: 'dashboard.defectTrend.closedDefects' }),
      color: "hsl(var(--chart-3))", // 蓝色
    },
    reopenedBugs: {
      label: intl.formatMessage({ id: 'dashboard.defectTrend.reopenedDefects' }),
      color: "hsl(var(--chart-4))", // 橙色
    },
  } satisfies ChartConfig), [intl])

  const filteredData = React.useMemo(() => {
    let daysToShow = 30 // 默认30天

    if (timeRange === "7d") {
      daysToShow = 7
    } else if (timeRange === "14d") {
      daysToShow = 14
    } else if (timeRange === "30d") {
      daysToShow = 30
    }

    return sourceData.slice(-daysToShow)
  }, [timeRange, sourceData])

  if (loading) {
    return (
      <Card className="h-full flex flex-col py-0 bg-card backdrop-blur-sm">
        <CardHeader className="flex flex-col gap-2 space-y-0 border-b py-4 sm:flex-row sm:items-center sm:py-5">
          <div className="grid flex-1 gap-1 text-center sm:text-left">
            <CardTitle className="text-lg sm:text-xl">
              {intl.formatMessage({ id: 'dashboard.defectTrend.title' })}
            </CardTitle>
            <CardDescription className="text-sm">
              Loading chart data...
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-4 sm:pt-6 flex-1">
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col py-0 bg-card backdrop-blur-sm">
      <CardHeader className="flex flex-col gap-2 space-y-0 border-b py-4 sm:flex-row sm:items-center sm:py-5">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle className="text-lg sm:text-xl">
            {intl.formatMessage({ id: 'dashboard.defectTrend.title' })}
          </CardTitle>
          <CardDescription className="text-sm">
            {intl.formatMessage(
              { id: 'dashboard.defectTrend.description' },
              { days: timeRange === "7d" ? "7" : timeRange === "14d" ? "14" : "30" }
            )}
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="w-full sm:w-[140px] rounded-lg sm:ml-auto"
            aria-label={intl.formatMessage({ id: 'common.selectTimeRange' })}
          >
            <SelectValue placeholder={intl.formatMessage({ id: 'common.past30Days' })} />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="7d" className="rounded-lg">
              {intl.formatMessage({ id: 'common.past7Days' })}
            </SelectItem>
            <SelectItem value="14d" className="rounded-lg">
              {intl.formatMessage({ id: 'common.past14Days' })}
            </SelectItem>
            <SelectItem value="30d" className="rounded-lg">
              {intl.formatMessage({ id: 'common.past30Days' })}
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-4 sm:pt-6 flex-1">
        {sourceData.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-muted-foreground">
              <p>No bug data available for this project.</p>
              <p className="text-sm mt-2">Data will appear here once bugs are reported.</p>
            </div>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto min-h-[400px] sm:min-h-[350px] lg:min-h-[400px] h-full w-full"
          >
          <AreaChart
            data={filteredData}
            margin={{
              left: 0,
              right: 0,
              top: 20,
              bottom: 80,
            }}
          >
            <defs>
              <linearGradient id="fillNewBugs" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-newBugs)"
                  stopOpacity={0.6}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-newBugs)"
                  stopOpacity={0.05}
                />
              </linearGradient>
              <linearGradient id="fillFixedBugs" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-fixedBugs)"
                  stopOpacity={0.6}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-fixedBugs)"
                  stopOpacity={0.05}
                />
              </linearGradient>
              <linearGradient id="fillClosedBugs" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-closedBugs)"
                  stopOpacity={0.6}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-closedBugs)"
                  stopOpacity={0.05}
                />
              </linearGradient>
              <linearGradient id="fillReopenedBugs" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-reopenedBugs)"
                  stopOpacity={0.6}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-reopenedBugs)"
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              className="opacity-30 dark:opacity-40"
              stroke="hsl(var(--muted-foreground))"
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={20}
              interval="preserveStartEnd"
              height={50}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString(intl.locale, {
                  month: "short",
                  day: "numeric",
                })
              }}
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    // 使用 useI18n hook 的 formatDate 函数进行国际化日期格式化
                    const date = new Date(value);

                    // 确保日期有效
                    if (isNaN(date.getTime())) {
                      return value;
                    }

                    return formatDate(date, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    });
                  }}
                  indicator="dot"
                  className="w-[200px] bg-background/95 backdrop-blur-sm border border-border"
                />
              }
            />
            <Area
              dataKey="reopenedBugs"
              type="natural"
              fill="url(#fillReopenedBugs)"
              stroke="var(--color-reopenedBugs)"
              strokeWidth={2}
              stackId="a"
            />
            <Area
              dataKey="newBugs"
              type="natural"
              fill="url(#fillNewBugs)"
              stroke="var(--color-newBugs)"
              strokeWidth={2}
              stackId="a"
            />
            <Area
              dataKey="fixedBugs"
              type="natural"
              fill="url(#fillFixedBugs)"
              stroke="var(--color-fixedBugs)"
              strokeWidth={2}
              stackId="b"
            />
            <Area
              dataKey="closedBugs"
              type="natural"
              fill="url(#fillClosedBugs)"
              stroke="var(--color-closedBugs)"
              strokeWidth={2}
              stackId="b"
            />
            <ChartLegend
              content={<ChartLegendContent className="flex-wrap gap-1 text-xs sm:text-sm text-foreground" />}
              wrapperStyle={{
                paddingTop: '16px',
                paddingBottom: '12px'
              }}
            />
          </AreaChart>
        </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
