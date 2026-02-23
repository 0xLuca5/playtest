# Project Components

这个目录包含与项目管理相关的组件。

## ProjectSwitcher

一个共享的项目切换组件，可以在水平和垂直布局中使用。

### 使用方法

```tsx
import { ProjectSwitcher } from '@/components/project/project-switcher';

// 水平布局（用于顶部导航栏）
<ProjectSwitcher variant="horizontal" />

// 垂直布局（用于侧边栏）
<ProjectSwitcher variant="vertical" collapsed={false} />

// 垂直布局（折叠状态）
<ProjectSwitcher variant="vertical" collapsed={true} />
```

### Props

- `variant`: `'horizontal' | 'vertical'` - 布局变体
- `collapsed`: `boolean` - 是否折叠（仅在垂直布局时有效）
- `className`: `string` - 额外的CSS类名

### 特性

- 🎨 **自适应设计** - 根据布局变体自动调整样式
- 📱 **响应式** - 支持折叠状态
- 🔄 **统一接口** - 水平和垂直布局使用相同的下拉菜单内容
- 🎯 **易于使用** - 简单的API，易于集成

### 当前使用位置

1. **水平布局** - `components/layout/minimal-layout-manager.tsx`
2. **垂直布局** - `components/layout/minimal-layout-manager.tsx`
3. **简单侧边栏** - `components/navigation/simple-sidebar-left.tsx`

## ProjectIndicator

一个简化版的项目指示器，只显示当前项目信息，不提供切换功能。

### 使用方法

```tsx
import { ProjectIndicator } from '@/components/project/project-switcher';

<ProjectIndicator variant="horizontal" />
<ProjectIndicator variant="vertical" collapsed={false} />
```

## 项目状态说明

项目有三种状态，用于管理项目的生命周期：

### 状态类型

- **🟢 Active (活跃)** - 项目正在进行中，可以正常使用所有功能
- **🟡 Inactive (暂停)** - 项目暂时停止，但可能会重新启动
- **⚪ Archived (归档)** - 项目已完成或永久停止，通常为只读状态

### 状态显示

- 项目状态标签替代了原来的项目描述（key）位置
- 所有项目都显示状态标签，便于快速识别项目状态
- 状态标签使用不同颜色区分：绿色(活跃)、黄色(暂停)、灰色(归档)
- 状态标签采用圆角设计，视觉效果更加友好

## 未来改进

- [x] 集成真实的项目数据
- [x] 添加项目创建功能
- [x] 支持项目状态显示
- [ ] 支持项目搜索
- [ ] 添加项目管理页面链接
- [ ] 支持自定义项目图标
- [ ] 添加键盘快捷键支持
- [ ] 支持项目状态筛选

## 测试

访问应用主页面可以查看项目切换器的实际效果。
