// 测试步骤接口
export interface TestStep {
  id: string;
  step: number;
  action: string;
  expected: string;
  type?: 'manual' | 'automated' | 'optional';
  notes?: string;
}

// 自动化配置接口
export interface AutomationConfig {
  id?: string;
  repository: string;
  branch: string;
  commands: string[];
  parameters: Record<string, string>;
  framework: 'selenium' | 'playwright' | 'cypress' | 'midscene';
  browser: 'chrome' | 'firefox' | 'safari' | 'edge';
  environment: 'dev' | 'test' | 'staging' | 'prod';
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// 多个自动化配置的集合
export interface AutomationConfigs {
  midscene?: AutomationConfig;
  playwright?: AutomationConfig;
  cypress?: AutomationConfig;
  selenium?: AutomationConfig;
}

// 相关需求接口
export interface RelatedDocument {
  id: string;
  type: 'story' | 'epic' | 'task' | 'document';
  title: string;
  status: 'open' | 'in-progress' | 'done' | 'blocked';
  assignee?: string;
  url?: string;
}

// 数据集表格接口
export interface DatasetTable {
  id: string;
  name: string;
  columns: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date';
    required: boolean;
  }>;
  data: Array<Record<string, any>>;
}

// 测试运行接口
export interface TestRun {
  id: string;
  runDate: string;
  status: 'passed' | 'failed' | 'running' | 'skipped';
  duration: number;
  environment: string;
  executor: string;
  results: Array<{
    stepId: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    error?: string;
  }>;
}

// 已知问题接口
export interface KnownIssue {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'investigating' | 'resolved' | 'wont-fix';
  reporter: string;
  assignee?: string;
  createdAt: string;
  bugUrl?: string;
}

// 测试用例主接口
export interface TestCase {
  id: string;
  name: string;
  description: string;
  preconditions?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'work-in-progress' | 'active' | 'deprecated' | 'draft';
  weight: 'high' | 'medium' | 'low';
  format: 'classic' | 'bdd' | 'exploratory';
  nature: 'unit' | 'integration' | 'system' | 'e2e';
  type: 'functional' | 'non-functional' | 'regression' | 'smoke';
  tags: string[];
  steps: TestStep[];
  createdAt: string;
  updatedAt: string;
  author: string;
  modifier?: string;
  executionTime?: number;
  lastRun?: string;
  automationConfigs?: AutomationConfigs;
  relatedDocuments: RelatedDocument[];
  datasets: DatasetTable[];
  testRuns: TestRun[];
  knownIssues: KnownIssue[];
}

// 模块按钮配置接口
export interface ModuleButtonConfig {
  aiGenerate: boolean;
  edit: boolean;
  runTest: boolean;
}

// 模块组件通用Props
export interface ModuleProps {
  testCase: TestCase;
  isEditing: boolean;
  onUpdate: (updates: Partial<TestCase>) => void;
  onAIGenerate: () => void;
  onRunTest?: () => void; // 可选的运行测试函数，主要用于TestRuns模块
}
