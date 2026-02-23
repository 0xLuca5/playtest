# 贡献指南

感谢您对 AI Run 项目的关注！我们欢迎所有形式的贡献。

## 🤝 如何贡献

### 报告问题

如果您发现了问题或有功能建议，请：

1. 在提交 Issue 之前，请先搜索是否已有类似问题
2. 使用 Issue 模板，提供详细的信息
3. 包含复现步骤、预期行为和实际行为
4. 如果可能，请提供截图或日志

### 提交代码

1. **Fork 项目**
   ```bash
   git clone https://github.com/your-username/ai-run-nextjs.git
   cd ai-run-nextjs
   ```

2. **创建功能分支**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **安装依赖**
   ```bash
   npm install
   ```

4. **运行测试**
   ```bash
   npm run test
   npm run lint
   ```

5. **提交更改**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

6. **推送到分支**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **创建 Pull Request**

## 📋 开发规范

### 代码风格

- 使用 TypeScript 进行类型检查
- 遵循 ESLint 和 Prettier 配置
- 使用函数式组件和 Hooks
- 优先使用服务器组件 (RSC)

### 提交信息规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

类型说明：
- `feat`: 新功能
- `fix`: 修复问题
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

### 组件开发规范

1. **组件命名**
   ```typescript
   // 使用 PascalCase
   export function UserProfile() {
     // 组件实现
   }
   ```

2. **Props 类型定义**
   ```typescript
   interface UserProfileProps {
     userId: string;
     onUpdate?: (user: User) => void;
   }
   ```

3. **错误处理**
   ```typescript
   try {
     // 业务逻辑
   } catch (error) {
     console.error('Error:', error);
     // 用户友好的错误处理
   }
   ```

### 数据库变更

1. **创建迁移文件**
   ```bash
   npm run db:generate
   ```

2. **应用迁移**
   ```bash
   npm run db:migrate
   ```

3. **更新类型定义**
   ```typescript
   // 在 lib/db/schema.ts 中更新类型
   ```

## 🧪 测试规范

### 单元测试

```typescript
// components/__tests__/UserProfile.test.tsx
import { render, screen } from '@testing-library/react';
import { UserProfile } from '../UserProfile';

describe('UserProfile', () => {
  it('should render user information', () => {
    render(<UserProfile userId="123" />);
    expect(screen.getByText('User Profile')).toBeInTheDocument();
  });
});
```

### 集成测试

```typescript
// app/api/__tests__/chat.test.ts
import { createMocks } from 'node-mocks-http';
import { POST } from '../chat/route';

describe('/api/chat', () => {
  it('should handle chat request', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { message: 'Hello' },
    });

    await POST(req, res);
    expect(res._getStatusCode()).toBe(200);
  });
});
```

## 📚 文档规范

### 组件文档

```typescript
/**
 * 用户资料组件
 * 
 * @param userId - 用户ID
 * @param onUpdate - 更新回调函数
 * @returns 用户资料界面
 * 
 * @example
 * ```tsx
 * <UserProfile userId="123" onUpdate={handleUpdate} />
 * ```
 */
export function UserProfile({ userId, onUpdate }: UserProfileProps) {
  // 组件实现
}
```

### API 文档

```typescript
/**
 * 聊天 API
 * 
 * @param request - 包含消息内容的请求对象
 * @returns AI 响应
 * 
 * @example
 * ```typescript
 * const response = await fetch('/api/chat', {
 *   method: 'POST',
 *   body: JSON.stringify({ message: 'Hello' })
 * });
 * ```
 */
export async function POST(request: Request) {
  // API 实现
}
```

## 🔧 开发环境设置

### 必需工具

- Node.js 18+
- npm, yarn 或 pnpm
- Git
- Docker (可选)

### 环境变量

复制 `.env.example` 到 `.env.local` 并配置：

```bash
cp .env.example .env.local
```

### 开发命令

```bash
# 启动开发服务器
npm run dev

# 运行测试
npm run test

# 代码检查
npm run lint

# 类型检查
npm run type-check

# 构建项目
npm run build
```

## 🚀 部署测试

### 本地 Docker 测试

```bash
# 构建并启动
docker-compose up --build

# 测试生产构建
docker-compose -f docker-compose.dev.yml up --build
```

### 性能测试

```bash
# 运行 Lighthouse 测试
npm run lighthouse

# 运行性能分析
npm run analyze
```

## 📝 Pull Request 检查清单

在提交 PR 之前，请确保：

- [ ] 代码通过所有测试
- [ ] 代码通过 ESLint 检查
- [ ] 添加了必要的测试
- [ ] 更新了相关文档
- [ ] 提交信息符合规范
- [ ] 功能在本地环境正常工作
- [ ] 没有引入新的依赖（除非必要）

## 🎯 贡献优先级

我们特别欢迎以下方面的贡献：

1. **Bug 修复** - 提高应用稳定性
2. **性能优化** - 提升用户体验
3. **文档改进** - 帮助其他开发者
4. **测试覆盖** - 提高代码质量
5. **新功能** - 扩展应用能力

## 📞 联系我们

- 📧 邮箱: your-email@example.com
- 💬 Discord: [加入我们的社区](https://discord.gg/your-server)
- 🐛 Issues: [GitHub Issues](https://github.com/your-repo/issues)

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者！

---

**再次感谢您的贡献！** 🎉 