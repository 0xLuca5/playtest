import * as XLSX from 'xlsx';

/**
 * 测试用例Excel模板生成器
 * 用于生成标准的测试用例导入模板
 */

// 多语言标题头配置
function getLocalizedHeaders(locale: string) {
  const headers = {
    zh: {
      testCase: [
        '测试用例名称*',
        '测试用例描述*',
        '前置条件',
        '优先级*',
        '状态*',
        '权重*',
        '格式*',
        '性质*',
        '类型*',
        '标签',
        '预估执行时间(分钟)',
        '文件夹路径'
      ],
      testStep: [
        '测试用例名称*',
        '步骤序号*',
        '操作描述*',
        '预期结果*',
        '步骤类型*',
        '备注'
      ],
      sheetNames: {
        testCase: '测试用例',
        testStep: '测试步骤',
        instruction: '使用说明'
      }
    },
    en: {
      testCase: [
        'Test Case Name*',
        'Test Case Description*',
        'Preconditions',
        'Priority*',
        'Status*',
        'Weight*',
        'Format*',
        'Nature*',
        'Type*',
        'Tags',
        'Estimated Time (minutes)',
        'Folder Path'
      ],
      testStep: [
        'Test Case Name*',
        'Step Number*',
        'Action Description*',
        'Expected Result*',
        'Step Type*',
        'Notes'
      ],
      sheetNames: {
        testCase: 'Test Cases',
        testStep: 'Test Steps',
        instruction: 'Instructions'
      }
    },
    ja: {
      testCase: [
        'テストケース名*',
        'テストケース説明*',
        '前提条件',
        '優先度*',
        'ステータス*',
        '重要度*',
        'フォーマット*',
        '性質*',
        'タイプ*',
        'タグ',
        '予想実行時間(分)',
        'フォルダパス'
      ],
      testStep: [
        'テストケース名*',
        'ステップ番号*',
        '操作説明*',
        '期待結果*',
        'ステップタイプ*',
        '備考'
      ],
      sheetNames: {
        testCase: 'テストケース',
        testStep: 'テストステップ',
        instruction: '使用説明'
      }
    }
  };

  return headers[locale as keyof typeof headers] || headers.zh;
}

// 多语言示例数据配置
function getLocalizedSampleData(locale: string) {
  const sampleData = {
    zh: {
      testCases: [
        [
          '用户登录功能测试',
          '验证用户能够使用正确的用户名和密码成功登录系统',
          '1. 用户已注册\n2. 系统正常运行',
          'high',
          'active',
          'high',
          'classic',
          'functional',
          'functional',
          '登录,认证,核心功能',
          5,
          '/功能测试/用户管理'
        ],
        [
          '密码错误登录测试',
          '验证用户输入错误密码时系统的处理',
          '1. 用户已注册\n2. 系统正常运行',
          'medium',
          'active',
          'medium',
          'classic',
          'functional',
          'functional',
          '登录,异常处理',
          3,
          '/功能测试/用户管理'
        ],
        [
          '用户注册功能测试',
          '验证新用户能够成功注册账户',
          '1. 系统正常运行\n2. 邮箱服务可用',
          'high',
          'active',
          'high',
          'classic',
          'functional',
          'functional',
          '注册,用户管理',
          8,
          '/功能测试/用户管理'
        ]
      ],
      testSteps: [
        ['用户登录功能测试', 1, '打开登录页面', '页面正常显示，包含用户名和密码输入框', 'manual', '确保页面元素完整显示'],
        ['用户登录功能测试', 2, '输入正确的用户名和密码', '输入框正常接受输入，密码显示为*号', 'manual', '使用测试账号：test@example.com'],
        ['用户登录功能测试', 3, '点击登录按钮', '系统验证通过，跳转到主页面', 'manual', '验证跳转URL和页面内容'],
        ['密码错误登录测试', 1, '打开登录页面', '页面正常显示', 'manual', ''],
        ['密码错误登录测试', 2, '输入正确用户名和错误密码', '输入框正常接受输入', 'manual', '使用错误密码：wrongpassword'],
        ['密码错误登录测试', 3, '点击登录按钮', '显示错误提示信息，不允许登录', 'manual', '验证错误信息的准确性'],
        ['用户注册功能测试', 1, '打开注册页面', '页面正常显示注册表单', 'manual', '检查所有必填字段'],
        ['用户注册功能测试', 2, '填写用户信息', '所有字段正常接受输入', 'manual', '使用有效的邮箱格式'],
        ['用户注册功能测试', 3, '点击注册按钮', '注册成功，发送确认邮件', 'manual', '检查邮件发送状态']
      ]
    },
    en: {
      testCases: [
        [
          'User Login Function Test',
          'Verify that users can successfully log in with correct username and password',
          '1. User is registered\n2. System is running normally',
          'high',
          'active',
          'high',
          'classic',
          'functional',
          'functional',
          'login,authentication,core',
          5,
          '/Functional Tests/User Management'
        ],
        [
          'Wrong Password Login Test',
          'Verify system handling when user enters wrong password',
          '1. User is registered\n2. System is running normally',
          'medium',
          'active',
          'medium',
          'classic',
          'functional',
          'functional',
          'login,error handling',
          3,
          '/Functional Tests/User Management'
        ],
        [
          'User Registration Function Test',
          'Verify that new users can successfully register an account',
          '1. System is running normally\n2. Email service is available',
          'high',
          'active',
          'high',
          'classic',
          'functional',
          'functional',
          'registration,user management',
          8,
          '/Functional Tests/User Management'
        ]
      ],
      testSteps: [
        ['User Login Function Test', 1, 'Open login page', 'Page displays normally with username and password fields', 'manual', 'Ensure all page elements are displayed'],
        ['User Login Function Test', 2, 'Enter correct username and password', 'Input fields accept input normally, password shows as *', 'manual', 'Use test account: test@example.com'],
        ['User Login Function Test', 3, 'Click login button', 'System validates and redirects to main page', 'manual', 'Verify redirect URL and page content'],
        ['Wrong Password Login Test', 1, 'Open login page', 'Page displays normally', 'manual', ''],
        ['Wrong Password Login Test', 2, 'Enter correct username and wrong password', 'Input fields accept input normally', 'manual', 'Use wrong password: wrongpassword'],
        ['Wrong Password Login Test', 3, 'Click login button', 'Display error message, login not allowed', 'manual', 'Verify error message accuracy'],
        ['User Registration Function Test', 1, 'Open registration page', 'Page displays registration form normally', 'manual', 'Check all required fields'],
        ['User Registration Function Test', 2, 'Fill in user information', 'All fields accept input normally', 'manual', 'Use valid email format'],
        ['User Registration Function Test', 3, 'Click register button', 'Registration successful, confirmation email sent', 'manual', 'Check email sending status']
      ]
    },
    ja: {
      testCases: [
        [
          'ユーザーログイン機能テスト',
          '正しいユーザー名とパスワードでユーザーが正常にログインできることを確認',
          '1. ユーザーが登録済み\n2. システムが正常に動作している',
          'high',
          'active',
          'high',
          'classic',
          'functional',
          'functional',
          'ログイン,認証,コア機能',
          5,
          '/機能テスト/ユーザー管理'
        ],
        [
          'パスワード間違いログインテスト',
          'ユーザーが間違ったパスワードを入力した時のシステム処理を確認',
          '1. ユーザーが登録済み\n2. システムが正常に動作している',
          'medium',
          'active',
          'medium',
          'classic',
          'functional',
          'functional',
          'ログイン,エラー処理',
          3,
          '/機能テスト/ユーザー管理'
        ],
        [
          'ユーザー登録機能テスト',
          '新しいユーザーがアカウントを正常に登録できることを確認',
          '1. システムが正常に動作している\n2. メールサービスが利用可能',
          'high',
          'active',
          'high',
          'classic',
          'functional',
          'functional',
          '登録,ユーザー管理',
          8,
          '/機能テスト/ユーザー管理'
        ]
      ],
      testSteps: [
        ['ユーザーログイン機能テスト', 1, 'ログインページを開く', 'ユーザー名とパスワード入力欄を含むページが正常に表示される', 'manual', 'ページ要素が完全に表示されることを確認'],
        ['ユーザーログイン機能テスト', 2, '正しいユーザー名とパスワードを入力', '入力欄が正常に入力を受け付け、パスワードが*で表示される', 'manual', 'テストアカウントを使用: test@example.com'],
        ['ユーザーログイン機能テスト', 3, 'ログインボタンをクリック', 'システムが検証を通過し、メインページにリダイレクト', 'manual', 'リダイレクトURLとページ内容を確認'],
        ['パスワード間違いログインテスト', 1, 'ログインページを開く', 'ページが正常に表示される', 'manual', ''],
        ['パスワード間違いログインテスト', 2, '正しいユーザー名と間違ったパスワードを入力', '入力欄が正常に入力を受け付ける', 'manual', '間違ったパスワードを使用: wrongpassword'],
        ['パスワード間違いログインテスト', 3, 'ログインボタンをクリック', 'エラーメッセージが表示され、ログインが許可されない', 'manual', 'エラーメッセージの正確性を確認'],
        ['ユーザー登録機能テスト', 1, '登録ページを開く', '登録フォームが正常に表示される', 'manual', 'すべての必須フィールドを確認'],
        ['ユーザー登録機能テスト', 2, 'ユーザー情報を入力', 'すべてのフィールドが正常に入力を受け付ける', 'manual', '有効なメール形式を使用'],
        ['ユーザー登録機能テスト', 3, '登録ボタンをクリック', '登録成功、確認メールが送信される', 'manual', 'メール送信状態を確認']
      ]
    }
  };

  return sampleData[locale as keyof typeof sampleData] || sampleData.zh;
}

// 多语言说明数据配置
function getLocalizedInstructions(locale: string) {
  const instructions = {
    zh: [
      ['字段说明', ''],
      ['', ''],
      ['测试用例字段说明', ''],
      ['字段名', '说明'],
      ['测试用例名称*', '必填，测试用例的名称，建议使用描述性的名称'],
      ['测试用例描述*', '必填，详细描述测试用例的目的和内容'],
      ['前置条件', '可选，执行测试前需要满足的条件'],
      ['优先级*', '必填，可选值：high(高)、medium(中)、low(低)'],
      ['状态*', '必填，可选值：work-in-progress(进行中)、active(激活)、deprecated(已废弃)、draft(草稿)'],
      ['权重*', '必填，可选值：high(高)、medium(中)、low(低)'],
      ['格式*', '必填，可选值：classic(经典)、bdd(行为驱动)、exploratory(探索性)'],
      ['性质*', '必填，可选值：functional(功能性)、non-functional(非功能性)、performance(性能)、security(安全)、usability(可用性)'],
      ['类型*', '必填，可选值：functional(功能)、regression(回归)、smoke(冒烟)、integration(集成)、unit(单元)、e2e(端到端)、performance(性能)'],
      ['标签', '可选，多个标签用逗号分隔，如：登录,认证,核心功能'],
      ['预估执行时间(分钟)', '可选，数字，表示执行该测试用例预计需要的时间'],
      ['文件夹路径', '可选，测试用例所属的文件夹路径，如：/功能测试/用户管理'],
      ['', ''],
      ['测试步骤字段说明', ''],
      ['字段名', '说明'],
      ['测试用例名称*', '必填，关联的测试用例名称，必须与测试用例工作表中的名称完全一致'],
      ['步骤序号*', '必填，数字，表示步骤的执行顺序'],
      ['操作描述*', '必填，详细描述该步骤需要执行的操作'],
      ['预期结果*', '必填，描述执行操作后的预期结果'],
      ['步骤类型*', '必填，可选值：manual(手动)、automated(自动化)、optional(可选)'],
      ['备注', '可选，该步骤的额外说明或注意事项']
    ],
    en: [
      ['Field Description', ''],
      ['', ''],
      ['Test Case Field Description', ''],
      ['Field Name', 'Description'],
      ['Test Case Name*', 'Required, name of the test case, recommend using descriptive names'],
      ['Test Case Description*', 'Required, detailed description of the test case purpose and content'],
      ['Preconditions', 'Optional, conditions that need to be met before executing the test'],
      ['Priority*', 'Required, values: high, medium, low'],
      ['Status*', 'Required, values: work-in-progress, active, deprecated, draft'],
      ['Weight*', 'Required, values: high, medium, low'],
      ['Format*', 'Required, values: classic, bdd, exploratory'],
      ['Nature*', 'Required, values: functional, non-functional, performance, security, usability'],
      ['Type*', 'Required, values: functional, regression, smoke, integration, unit, e2e, performance'],
      ['Tags', 'Optional, multiple tags separated by commas, e.g.: login,authentication,core'],
      ['Estimated Time (minutes)', 'Optional, number representing estimated execution time for this test case'],
      ['Folder Path', 'Optional, folder path where the test case belongs, e.g.: /Functional Tests/User Management'],
      ['', ''],
      ['Test Step Field Description', ''],
      ['Field Name', 'Description'],
      ['Test Case Name*', 'Required, associated test case name, must match exactly with test case worksheet'],
      ['Step Number*', 'Required, number indicating the execution order of steps'],
      ['Action Description*', 'Required, detailed description of the action to be performed in this step'],
      ['Expected Result*', 'Required, description of expected result after performing the action'],
      ['Step Type*', 'Required, values: manual, automated, optional'],
      ['Notes', 'Optional, additional notes or considerations for this step']
    ],
    ja: [
      ['フィールド説明', ''],
      ['', ''],
      ['テストケースフィールド説明', ''],
      ['フィールド名', '説明'],
      ['テストケース名*', '必須、テストケースの名前、説明的な名前の使用を推奨'],
      ['テストケース説明*', '必須、テストケースの目的と内容の詳細な説明'],
      ['前提条件', 'オプション、テスト実行前に満たす必要がある条件'],
      ['優先度*', '必須、値：high(高)、medium(中)、low(低)'],
      ['ステータス*', '必須、値：work-in-progress(進行中)、active(アクティブ)、deprecated(廃止予定)、draft(下書き)'],
      ['重要度*', '必須、値：high(高)、medium(中)、low(低)'],
      ['フォーマット*', '必須、値：classic(クラシック)、bdd(行動駆動開発)、exploratory(探索的)'],
      ['性質*', '必須、値：functional(機能的)、non-functional(非機能的)、performance(パフォーマンス)、security(セキュリティ)、usability(ユーザビリティ)'],
      ['タイプ*', '必須、値：functional(機能)、regression(回帰)、smoke(スモーク)、integration(統合)、unit(単体)、e2e(エンドツーエンド)、performance(パフォーマンス)'],
      ['タグ', 'オプション、複数のタグはカンマで区切る、例：ログイン,認証,コア機能'],
      ['予想実行時間(分)', 'オプション、このテストケースの予想実行時間を表す数値'],
      ['フォルダパス', 'オプション、テストケースが属するフォルダパス、例：/機能テスト/ユーザー管理'],
      ['', ''],
      ['テストステップフィールド説明', ''],
      ['フィールド名', '説明'],
      ['テストケース名*', '必須、関連するテストケース名、テストケースワークシートの名前と完全に一致する必要があります'],
      ['ステップ番号*', '必須、ステップの実行順序を示す数値'],
      ['操作説明*', '必須、このステップで実行するアクションの詳細な説明'],
      ['期待結果*', '必須、アクション実行後の期待される結果の説明'],
      ['ステップタイプ*', '必須、値：manual(手動)、automated(自動化)、optional(オプション)'],
      ['備考', 'オプション、このステップの追加の注意事項や考慮事項']
    ]
  };

  return instructions[locale as keyof typeof instructions] || instructions.zh;
}

// 测试用例字段定义
export interface TestCaseTemplateRow {
  // 基本信息
  name: string;
  description: string;
  preconditions?: string;
  
  // 分类信息
  priority: 'high' | 'medium' | 'low';
  status: 'work-in-progress' | 'active' | 'deprecated' | 'draft';
  weight: 'high' | 'medium' | 'low';
  format: 'classic' | 'bdd' | 'exploratory';
  nature: 'unit' | 'integration' | 'system' | 'e2e';
  type: 'functional' | 'non-functional' | 'regression' | 'smoke';
  
  // 其他信息
  tags?: string; // 逗号分隔的标签
  executionTime?: number; // 预估执行时间（分钟）
  folderPath?: string; // 文件夹路径，如：/功能测试/登录模块
}

// 测试步骤字段定义
export interface TestStepTemplateRow {
  testCaseName: string; // 关联的测试用例名称
  stepNumber: number;
  action: string;
  expected: string;
  type: 'manual' | 'automated' | 'optional';
  notes?: string;
}

/**
 * 生成测试用例Excel模板
 */
export function generateTestCaseTemplate(locale: string = 'zh'): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  // 根据语言设置标题头和示例数据
  const headers = getLocalizedHeaders(locale);
  const sampleData = getLocalizedSampleData(locale);
  const testCaseHeaders = headers.testCase;

  const testCaseData = [
    testCaseHeaders,
    ...sampleData.testCases
  ];

  const testCaseWorksheet = XLSX.utils.aoa_to_sheet(testCaseData);
  
  // 设置列宽
  testCaseWorksheet['!cols'] = [
    { width: 25 }, // 测试用例名称
    { width: 40 }, // 测试用例描述
    { width: 30 }, // 前置条件
    { width: 12 }, // 优先级
    { width: 15 }, // 状态
    { width: 12 }, // 权重
    { width: 12 }, // 格式
    { width: 15 }, // 性质
    { width: 15 }, // 类型
    { width: 20 }, // 标签
    { width: 18 }, // 预估执行时间
    { width: 20 }  // 文件夹路径
  ];

  XLSX.utils.book_append_sheet(workbook, testCaseWorksheet, headers.sheetNames.testCase);

  // 创建测试步骤工作表
  const testStepHeaders = headers.testStep;

  const testStepData = [
    testStepHeaders,
    ...sampleData.testSteps
  ];

  const testStepWorksheet = XLSX.utils.aoa_to_sheet(testStepData);
  
  // 设置列宽
  testStepWorksheet['!cols'] = [
    { width: 25 }, // 测试用例名称
    { width: 12 }, // 步骤序号
    { width: 40 }, // 操作描述
    { width: 40 }, // 预期结果
    { width: 12 }, // 步骤类型
    { width: 30 }  // 备注
  ];

  XLSX.utils.book_append_sheet(workbook, testStepWorksheet, headers.sheetNames.testStep);

  // 创建字段说明工作表
  const instructionData = getLocalizedInstructions(locale);

  const instructionWorksheet = XLSX.utils.aoa_to_sheet(instructionData);
  
  // 设置列宽
  instructionWorksheet['!cols'] = [
    { width: 30 }, // 字段名/说明项
    { width: 60 }  // 说明内容
  ];

  XLSX.utils.book_append_sheet(workbook, instructionWorksheet, headers.sheetNames.instruction);

  return workbook;
}

/**
 * 下载Excel模板文件
 */
export function downloadTestCaseTemplate() {
  const workbook = generateTestCaseTemplate();
  const fileName = `测试用例导入模板_${new Date().toISOString().split('T')[0]}.xlsx`;
  
  // 生成Excel文件
  XLSX.writeFile(workbook, fileName);
}

/**
 * 生成模板的Blob对象（用于Web下载）
 */
export function generateTestCaseTemplateBlob(locale: string = 'zh'): Blob {
  const workbook = generateTestCaseTemplate(locale);
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * 验证导入数据的格式
 */
export function validateImportData(testCases: any[], testSteps: any[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 验证测试用例数据
  testCases.forEach((testCase, index) => {
    const rowNum = index + 2; // Excel行号（从2开始，因为第1行是标题）
    
    if (!testCase.name?.trim()) {
      errors.push(`第${rowNum}行：测试用例名称不能为空`);
    }
    
    if (!testCase.description?.trim()) {
      errors.push(`第${rowNum}行：测试用例描述不能为空`);
    }
    
    const validPriorities = ['high', 'medium', 'low'];
    if (!validPriorities.includes(testCase.priority)) {
      errors.push(`第${rowNum}行：优先级必须是 ${validPriorities.join('、')} 之一`);
    }
    
    const validStatuses = ['work-in-progress', 'active', 'deprecated', 'draft'];
    if (!validStatuses.includes(testCase.status)) {
      errors.push(`第${rowNum}行：状态必须是 ${validStatuses.join('、')} 之一`);
    }
    
    // 其他字段验证...
  });

  // 验证测试步骤数据
  const testCaseNames = new Set(testCases.map(tc => tc.name?.trim()).filter(Boolean));
  
  testSteps.forEach((step, index) => {
    const rowNum = index + 2;
    
    if (!step.testCaseName?.trim()) {
      errors.push(`测试步骤第${rowNum}行：测试用例名称不能为空`);
    } else if (!testCaseNames.has(step.testCaseName.trim())) {
      errors.push(`测试步骤第${rowNum}行：找不到对应的测试用例"${step.testCaseName}"`);
    }
    
    if (!step.action?.trim()) {
      errors.push(`测试步骤第${rowNum}行：操作描述不能为空`);
    }
    
    if (!step.expected?.trim()) {
      errors.push(`测试步骤第${rowNum}行：预期结果不能为空`);
    }
    
    if (typeof step.stepNumber !== 'number' || step.stepNumber < 1) {
      errors.push(`测试步骤第${rowNum}行：步骤序号必须是大于0的数字`);
    }
    
    const validStepTypes = ['manual', 'automated', 'optional'];
    if (!validStepTypes.includes(step.type)) {
      errors.push(`测试步骤第${rowNum}行：步骤类型必须是 ${validStepTypes.join('、')} 之一`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 解析Excel文件中的测试用例数据
 */
export async function parseTestCaseExcel(file: File): Promise<{
  testCases: TestCaseTemplateRow[];
  testSteps: TestStepTemplateRow[];
}> {
  try {
    // 在服务端环境中，直接从File对象读取ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });

    // 尝试找到测试用例和测试步骤工作表（支持多语言）
    const sheetNames = workbook.SheetNames;

    // 可能的工作表名称（支持多语言）
    const testCaseSheetNames = ['测试用例', 'Test Cases', 'テストケース'];
    const testStepSheetNames = ['测试步骤', 'Test Steps', 'テストステップ'];

    // 查找测试用例工作表
    let testCaseSheet = null;
    for (const name of testCaseSheetNames) {
      if (workbook.Sheets[name]) {
        testCaseSheet = workbook.Sheets[name];
        break;
      }
    }

    // 查找测试步骤工作表
    let testStepSheet = null;
    for (const name of testStepSheetNames) {
      if (workbook.Sheets[name]) {
        testStepSheet = workbook.Sheets[name];
        break;
      }
    }

    if (!testCaseSheet) {
      throw new Error(`未找到测试用例工作表。可用工作表: ${sheetNames.join(', ')}`);
    }

    if (!testStepSheet) {
      throw new Error(`未找到测试步骤工作表。可用工作表: ${sheetNames.join(', ')}`);
    }

    const testCaseData = XLSX.utils.sheet_to_json(testCaseSheet, { header: 1 }) as any[][];
    const testStepData = XLSX.utils.sheet_to_json(testStepSheet, { header: 1 }) as any[][];

    // 转换为对象格式
    const testCases: TestCaseTemplateRow[] = testCaseData.slice(1).map(row => ({
      name: row[0]?.toString().trim() || '',
      description: row[1]?.toString().trim() || '',
      preconditions: row[2]?.toString().trim() || '',
      priority: row[3] as any || 'medium',
      status: row[4] as any || 'draft',
      weight: row[5] as any || 'medium',
      format: row[6] as any || 'classic',
      nature: row[7] as any || 'functional',
      type: row[8] as any || 'functional',
      tags: row[9]?.toString().trim() || '',
      executionTime: row[10] ? Number(row[10]) : undefined,
      folderPath: row[11]?.toString().trim() || ''
    })).filter(tc => tc.name); // 过滤掉空行

    const testSteps: TestStepTemplateRow[] = testStepData.slice(1).map(row => ({
      testCaseName: row[0]?.toString().trim() || '',
      stepNumber: Number(row[1]) || 1,
      action: row[2]?.toString().trim() || '',
      expected: row[3]?.toString().trim() || '',
      type: row[4] as any || 'manual',
      notes: row[5]?.toString().trim() || ''
    })).filter(ts => ts.testCaseName && ts.action); // 过滤掉空行

    return { testCases, testSteps };
  } catch (error) {
    throw new Error('Excel文件解析失败：' + (error as Error).message);
  }
}
