import * as React from "react"

// 定义断点
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

type Breakpoint = keyof typeof BREAKPOINTS

export function useResponsive() {
  const [screenSize, setScreenSize] = React.useState<{
    width: number
    height: number
  }>({
    width: 0,
    height: 0,
  })

  React.useEffect(() => {
    const updateSize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    // 初始化
    updateSize()

    // 监听窗口大小变化
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // 检查是否匹配特定断点
  const isBreakpoint = React.useCallback((breakpoint: Breakpoint) => {
    return screenSize.width >= BREAKPOINTS[breakpoint]
  }, [screenSize.width])

  // 检查是否在特定断点范围内
  const isBetween = React.useCallback((min: Breakpoint, max: Breakpoint) => {
    return screenSize.width >= BREAKPOINTS[min] && screenSize.width < BREAKPOINTS[max]
  }, [screenSize.width])

  // 常用的响应式状态
  const isMobile = screenSize.width < BREAKPOINTS.sm
  const isTablet = isBetween('sm', 'lg')
  const isDesktop = screenSize.width >= BREAKPOINTS.lg
  const isLargeDesktop = screenSize.width >= BREAKPOINTS.xl

  // 获取当前断点
  const getCurrentBreakpoint = React.useCallback((): Breakpoint => {
    if (screenSize.width >= BREAKPOINTS['2xl']) return '2xl'
    if (screenSize.width >= BREAKPOINTS.xl) return 'xl'
    if (screenSize.width >= BREAKPOINTS.lg) return 'lg'
    if (screenSize.width >= BREAKPOINTS.md) return 'md'
    if (screenSize.width >= BREAKPOINTS.sm) return 'sm'
    return 'sm' // 默认为最小断点
  }, [screenSize.width])

  // 根据屏幕大小返回不同的值
  const responsive = React.useCallback(<T>(values: {
    sm?: T
    md?: T
    lg?: T
    xl?: T
    '2xl'?: T
    default: T
  }): T => {
    const currentBreakpoint = getCurrentBreakpoint()
    
    // 从当前断点开始向下查找可用值
    const breakpointOrder: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm']
    const currentIndex = breakpointOrder.indexOf(currentBreakpoint)
    
    for (let i = currentIndex; i < breakpointOrder.length; i++) {
      const bp = breakpointOrder[i]
      if (values[bp] !== undefined) {
        return values[bp]!
      }
    }
    
    return values.default
  }, [getCurrentBreakpoint])

  return {
    screenSize,
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    isBreakpoint,
    isBetween,
    getCurrentBreakpoint,
    responsive,
  }
}

// 专门用于Dashboard的响应式配置
export function useDashboardResponsive() {
  const { isMobile, isTablet, isDesktop, responsive } = useResponsive()

  // Dashboard网格列数
  const gridCols = responsive({
    sm: 1,
    md: 2,
    lg: 2,
    xl: 2,
    default: 1,
  })

  // 统计卡片网格列数
  const statsGridCols = responsive({
    sm: 2,
    md: 2,
    lg: 4,
    default: 1,
  })

  // 图表高度
  const chartHeight = responsive({
    sm: 200,
    md: 250,
    lg: 300,
    default: 180,
  })

  // 卡片内边距
  const cardPadding = responsive({
    sm: 'p-4',
    md: 'p-6',
    default: 'p-3',
  })

  // 间距
  const spacing = responsive({
    sm: 'gap-4',
    md: 'gap-6',
    default: 'gap-3',
  })

  return {
    isMobile,
    isTablet,
    isDesktop,
    gridCols,
    statsGridCols,
    chartHeight,
    cardPadding,
    spacing,
  }
}
