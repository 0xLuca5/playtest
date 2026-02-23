// 树节点类型定义
export interface TreeNode {
  id: string;
  name: string;
  children: TreeNode[];
  isFolder?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

// 测试用例数据类型
export interface TestStep {
  id: string;
  step: number;
  action: string;
  expected: string;
  status: 'pending' | 'passed' | 'failed' | 'skipped';
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'draft' | 'active' | 'deprecated';
  tags: string[];
  steps: TestStep[];
  createdAt: string;
  updatedAt: string;
  author: string;
  executionTime?: number;
  lastRun?: string;
}

// 模块按钮配置接口
export interface ModuleButtonConfig {
  id: string;
  label: string;
  icon: any; // LucideIcon type
  color: string;
}

// 创建对话框类型
export type CreateType = 'folder' | 'testCase';

// 拖拽相关类型
export interface DragEndEvent {
  active: {
    id: string;
  };
  over: {
    id: string;
  } | null;
}
