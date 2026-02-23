import puppeteer from 'puppeteer';
import { PuppeteerAgent } from "@midscene/web/puppeteer";
import { DataStreamWriter } from 'ai';
import { generateText } from 'ai';
import { myProvider } from '@/lib/ai/providers';

import fs from 'fs';
import path from 'path';
import os from 'node:os';
import { aiLogger } from '@/lib/logger';
import { getMidsceneDetailedPrompt } from '@/lib/ai/prompts/automation-prompts';

// 创建模块专用的日志记录器
const logger = aiLogger.child('testing-service');

// 生成UUID的辅助函数
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// 测试服务
export class TestingService {
  // 1. 移除ReportMappingManager类及其实例化
  // 2. 移除getReportUrl、setCacheMapping、saveMapping等方法
  // 3. executeTest/finally等兜底查找映射的代码全部删除
  // 4. 只保留直接生成和返回publicReportUrl的逻辑
  // 5. 相关调用点全部移除

  constructor() {
    // 不再需要初始化自定义Logger
  }

  // 获取本地化的测试提示词 - 已迁移到 /lib/ai/prompts/automation-prompts.ts
  private getLocalizedTestingPrompt(locale: string): string {
    // 使用新的prompt系统
    return getMidsceneDetailedPrompt(locale);
  }

  // 生成测试YAML
  async generateTestingYaml(url: string, title: string, additionalInfo?: string, testCaseId?: string, locale: string = 'en') {
    logger.info(`开始为URL ${url} 生成测试YAML，语言: ${locale}`);

    try {
      // 根据语言选择提示词
      const localizedPrompt = this.getLocalizedTestingPrompt(locale);

      // 构建提示词
      let prompt = `${localizedPrompt}\n\n`;

      if (locale === 'zh') {
        prompt += `请为以下网站URL生成一个测试计划：\n`;
        prompt += `URL: ${url}\n`;
        prompt += `测试标题: ${title}\n`;
        if (additionalInfo) {
          prompt += `用户提供的额外信息: ${additionalInfo}\n`;
        }
      } else if (locale === 'ja') {
        prompt += `以下のウェブサイトURLのテスト計画を生成してください：\n`;
        prompt += `URL: ${url}\n`;
        prompt += `テストタイトル: ${title}\n`;
        if (additionalInfo) {
          prompt += `ユーザー提供の追加情報: ${additionalInfo}\n`;
        }
      } else {
        // 默认英文
        prompt += `Please generate a test plan for the following website URL:\n`;
        prompt += `URL: ${url}\n`;
        prompt += `Test Title: ${title}\n`;
        if (additionalInfo) {
          prompt += `Additional information provided by user: ${additionalInfo}\n`;
        }
      }

      if (additionalInfo) {
        logger.info(`用户提供的额外信息: ${additionalInfo}`);
      }
      
      // 调用AI生成YAML
      const { text: responseText } = await generateText({
        model: myProvider.languageModel('qwen-max'),
        prompt: prompt,
      });
      
      logger.debug(`AI生成的原始响应:\n${responseText}`);
      
      // 从响应中提取YAML
      const yamlMatch = responseText.match(/```(?:yaml)?\s*([\s\S]*?)(?:```|$)/);
      
      let extractedYaml = "";
      if (yamlMatch && yamlMatch[1]) {
        extractedYaml = yamlMatch[1].trim();
      } else {
        // 如果无法提取YAML，使用响应文本中的web部分
        const webMatch = responseText.match(/web:[\s\S]*/);
        if (webMatch) {
          extractedYaml = webMatch[0].trim();
        }
      }
      
      // 如果没有提取到YAML
      if (!extractedYaml) {
        logger.warn("未能从AI响应中提取YAML");
        return {
          yaml: "",
          success: false,
          message: "AI无法生成有效的测试步骤，请提供更多关于您想测试的功能信息",
          rawResponse: responseText
        };
      }
      
      logger.info(`提取的YAML:\n${extractedYaml}`);
      
      // 如果YAML不是以web:开头，返回错误
      if (!extractedYaml.trim().startsWith('web:')) {
        logger.warn("AI生成的YAML格式不正确");
        
        return {
          yaml: "",
          success: false,
          message: "AI生成的YAML格式不正确，请提供更具体的测试步骤说明",
          rawResponse: responseText,
          originalYaml: extractedYaml
        };
      }

      // 如果提供了testCaseId，替换YAML中的各种testcase占位符
      let finalYaml = extractedYaml;
      if (testCaseId) {
        // 替换多种可能的占位符格式，按照从具体到一般的顺序
        finalYaml = extractedYaml
          .replace(/testcase-[^\/\s]+/g, testCaseId)  // 先替换 testcase-任意字符 格式
          .replace(/testcase[^\/\s]*/g, testCaseId)   // 再替换 testcase开头的任意字符
          .replace(/testcase-id/g, testCaseId);       // 最后替换标准格式
        logger.info(`已将YAML中的testcase占位符替换为: ${testCaseId}`);
        logger.info(`替换前: ${extractedYaml.substring(0, 200)}...`);
        logger.info(`替换后: ${finalYaml.substring(0, 200)}...`);
      }

      return {
        yaml: finalYaml,
        success: true,
        message: "AI成功生成了测试步骤"
      };
    } catch (error) {
      logger.error(`AI生成YAML失败: ${error instanceof Error ? error.message : String(error)}`);
      return {
        yaml: "",
        success: false,
        message: `AI生成YAML失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // 将Midscene报告复制到public目录
  async copyReportToPublic(originalPath: string): Promise<string> {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(originalPath)) {
        logger.error(`报告文件不存在: ${originalPath}`);
        return "";
      }
      
      // 修改报告HTML，去掉Midscene的logo
      await this.modifyReportHtml(originalPath);
      
      // 由于报告已经在public目录下，直接提取文件名
      const fileName = path.basename(originalPath);
      
      // 构建URL路径 - 使用新的API路由
      const reportUrl = `/report/${fileName}`;
      logger.info(`生成报告URL: ${reportUrl}，原始路径: ${originalPath}`);
      
      return reportUrl;
    } catch (error) {
      logger.error(`处理报告URL失败: ${error instanceof Error ? error.message : String(error)}`);
      return "";
    }
  }
  
  // 修改报告HTML，去掉Midscene的logo
  async modifyReportHtml(filePath: string): Promise<void> {
    try {
      logger.info(`开始修改报告HTML: ${filePath}`);
      
      // 读取HTML文件内容
      let htmlContent = fs.readFileSync(filePath, 'utf8');
      
      // 使用CSS隐藏logo，而不是替换HTML结构
      const cssStyle = `
      <style>
      /* 隐藏Midscene logo */
      .page-nav-left .logo {
        display: none !important;
      }
      .page-nav .page-nav-toolbar {
        margin-left: 0px !important;
      }
      /* 确保page-nav-left布局正确 */
      .page-nav-left {
        display: flex !important;
        align-items: center !important;
        justify-content: flex-start !important;
      }
      </style>
      `;
      
      // 将CSS样式插入到<head>标签结束前
      if (htmlContent.includes('</head>')) {
        htmlContent = htmlContent.replace('</head>', `${cssStyle}</head>`);
        logger.info('成功添加CSS样式，隐藏了logo部分');
        
        // 写回文件
        fs.writeFileSync(filePath, htmlContent, 'utf8');
        logger.info(`修改后的报告已保存: ${filePath}`);
      } else {
        logger.warn(`未找到</head>标签，无法插入CSS`);
      }
    } catch (error) {
      logger.error(`修改报告HTML失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 执行测试
  async executeTest(url: string, yaml: string, dataStream: DataStreamWriter, options: {width?: number, height?: number, documentId?: string, testRunId?: string} = {}) {
    const width = options.width || 1280;
    const height = options.height || 800;
    const documentId = options.documentId || generateUUID(); // 如果没有提供文档ID，生成一个
    const testRunId = options.testRunId;
    const startTime = Date.now(); // 记录开始时间
    
    logger.info(`开始执行测试，URL: ${url}, 文档ID: ${documentId}`);
    logger.debug(`测试YAML:\n${yaml}`);
    
    // 检查YAML格式是否正确
    // 改进YAML验证逻辑，移除前导空格和注释后再检查
    const cleanedYaml = yaml.replace(/^\s*#.*$/gm, '').trim(); // 移除注释行和空白
    if (!cleanedYaml.startsWith('web:')) {
      logger.error(`YAML格式不正确: ${cleanedYaml.substring(0, 20)}...`);
      throw new Error("YAML格式不正确，必须以'web:'开头");
    }
    
    let testReport = "";
    let browser;
    let reportPath = "";
    let publicReportUrl = "";
    
    try {
      // 设置环境变量
      process.env.MIDSCENE_MODEL_NAME = process.env.MIDSCENE_MODEL_NAME;
      process.env.MIDSCENE_USE_QWEN_VL = process.env.MIDSCENE_USE_QWEN_VL;
      process.env.OPENAI_API_KEY = process.env.MIDSCENE_API_KEY;
      process.env.OPENAI_BASE_URL = process.env.MIDSCENE_BASE_URL;
      process.env.MIDSCENE_RUN_DIR = path.join(process.cwd(), 'public');
      // process.env.REPORT_NAME = documentId;
      
      logger.info(`设置环境变量 REPORT_NAME = ${documentId}`);
      
      // 确保报告目录存在
      const reportDir = path.join(process.cwd(), 'public', 'report');
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }
      
      // 启动浏览器
      logger.info("启动浏览器");
      
      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox", 
          "--disable-setuid-sandbox",
          "--disable-gpu",
          "--disable-dev-shm-usage"
        ],
      });

      const page = await browser.newPage();
      await page.setViewport({
        width,
        height,
        deviceScaleFactor: os.platform() === "darwin" ? 2 : 1,
      });

      // 监听控制台消息，捕获报告路径
      page.on('console', async msg => {
        const text = msg.text();
        
        if (text.includes('Midscene - report file updated:')) {
          const path = text.split('Midscene - report file updated:')[1].trim();
          logger.info(`捕获到Midscene报告路径: ${path}`);
          reportPath = path;
        } else if (text.includes('error') || text.includes('Error') || text.includes('exception')) {
          // 记录浏览器控制台错误
          logger.warn(`浏览器控制台错误: ${text}`);
        }
      });

      // 添加页面事件监听
      page.on('dialog', async dialog => {
        await dialog.dismiss();
      });

      // 访问URL
      logger.info(`访问URL: ${url}`);
      
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        logger.info("页面加载完成，等待3秒");
      } catch (error) {
        logger.error(`页面导航错误: ${error instanceof Error ? error.message : String(error)}`);
        // 继续执行，因为某些网站即使有错误也可能部分加载
      }
      
      // 等待页面加载
      await new Promise(r => setTimeout(r, 3000));

      // 截图并保存
      try {
        const screenshotDir = path.join(process.cwd(), 'public', 'screenshots');
        if (!fs.existsSync(screenshotDir)) {
          fs.mkdirSync(screenshotDir, { recursive: true });
        }
        
        const timestamp = new Date().getTime();
        // 直接使用Buffer保存截图
        const screenshotBuffer = await page.screenshot();
        const screenshotPath = path.join(screenshotDir, `screenshot-${timestamp}.png`);
        fs.writeFileSync(screenshotPath, screenshotBuffer);
        
        logger.info("已捕获页面截图");
      } catch (error) {
        logger.error(`截图失败: ${error instanceof Error ? error.message : String(error)}`);
      }

      // 初始化Midscene代理
      logger.info("初始化测试代理");
      
      const agent = new PuppeteerAgent(page);
      
      // 执行YAML测试
      logger.info("开始执行测试步骤");
      
      // 执行测试
      try {
        const result = await agent.runYaml(yaml);
        try {
          logger.debug(typeof result === 'object' ? JSON.stringify(result) : String(result));
        } catch (jsonError) {
          logger.debug(`无法序列化结果: ${result}`);
        }
        
        // 获取Midscene日志内容
        const logContent = agent._unstableLogContent();
        try {
          if (typeof logContent === 'string') {
            logger.debug(logContent);
          } else if (typeof logContent === 'object') {
            logger.debug(JSON.stringify(logContent));
          } else {
            logger.debug(`日志内容类型: ${typeof logContent}`);
          }
        } catch (logError) {
          logger.debug('无法记录日志内容');
        }
        
        // 获取页面标题
        const pageTitle = await page.title();
        
        logger.info(`测试执行完成，页面标题: ${pageTitle}`);
        
        // 使用正则表达式在报告目录中查找以文档ID开头的报告文件
        const reportFiles = fs.readdirSync(reportDir);
        const documentIdPattern = new RegExp(`^puppeteer-.*-${documentId}\\.html$`);
        const matchingDocumentIdFiles = reportFiles.filter(file => documentIdPattern.test(file));
        
        if (matchingDocumentIdFiles.length > 0) {
          // 使用匹配文档ID的报告文件
          reportPath = path.join(reportDir, matchingDocumentIdFiles[0]);
          logger.info(`找到匹配文档ID的报告文件: ${reportPath}`);
        } else {
          // 如果没有找到匹配文档ID的文件，尝试使用从控制台捕获的路径
          logger.info(`未找到匹配文档ID的报告文件，尝试使用从控制台捕获的路径: ${reportPath}`);
          
          // 如果仍然没有报告路径，尝试查找最近的报告文件
          if (!reportPath || !fs.existsSync(reportPath)) {
            const reportPattern = /^puppeteer-.*\.html$/;
            const matchingFiles = reportFiles
              .filter(file => reportPattern.test(file))
              .map(file => ({
                name: file,
                path: path.join(reportDir, file),
                mtime: fs.statSync(path.join(reportDir, file)).mtime.getTime()
              }))
              .sort((a, b) => b.mtime - a.mtime);
            
            if (matchingFiles.length > 0) {
              // 使用最新的报告文件
              reportPath = matchingFiles[0].path;
              logger.info(`找到最新的报告文件: ${reportPath}`);
              logger.warn(`警告：使用最新报告文件可能导致在多用户环境下显示错误的报告`);
            }
          }
        }
        
        // 如果找到了报告路径
        if (reportPath && fs.existsSync(reportPath)) {
          // 生成报告URL
          publicReportUrl = await this.copyReportToPublic(reportPath);
          logger.info(`报告URL已生成: ${publicReportUrl}`);
        } else {
          logger.error(`未能找到有效的报告文件`);
        }
        
        return {
          success: true,
          pageTitle,
          result,
          reportPath,
          publicReportUrl
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`执行测试YAML失败: ${errorMessage}`);

        // 如果有testRunId，将错误信息保存到test_run表的logs字段
        if (testRunId) {
          try {
            const { updateTestRun } = await import('@/lib/db/queries');
            const duration = Date.now() - startTime;
            await updateTestRun(testRunId, {
              status: 'failed',
              logs: `执行测试YAML失败: ${errorMessage}`,
              duration: duration
            });
            logger.info(`已将错误信息保存到测试运行记录: ${testRunId}`);
          } catch (dbError) {
            logger.error(`保存错误信息到数据库失败: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
          }
        }

        throw error; // 重新抛出错误，让外层捕获
      }
    } catch (error) {
      logger.error(`执行测试步骤时出错: ${error instanceof Error ? error.stack || error.message : String(error)}`);

      let pageTitle = "未知";
      if (browser) {
        try {
          const page = (await browser.pages())[0];
          if (page) {
            pageTitle = await page.title();
          }
        } catch (titleError) {
          logger.error(`获取页面标题失败: ${titleError instanceof Error ? titleError.message : String(titleError)}`);
        }
      }

      // 即使发生错误，也尝试查找和处理报告文件
      if (!reportPath || !publicReportUrl) {
        try {
          const reportDir = path.join(process.cwd(), 'public', 'report');
          if (fs.existsSync(reportDir)) {
            const reportFiles = fs.readdirSync(reportDir);
            const reportPattern = /^puppeteer-.*\.html$/;
            const matchingFiles = reportFiles
              .filter(file => reportPattern.test(file))
              .map(file => ({
                name: file,
                path: path.join(reportDir, file),
                mtime: fs.statSync(path.join(reportDir, file)).mtime.getTime()
              }))
              .sort((a, b) => b.mtime - a.mtime);

            if (matchingFiles.length > 0) {
              // 使用最新的报告文件
              reportPath = matchingFiles[0].path;
              logger.info(`在错误处理中找到最新的报告文件: ${reportPath}`);

              // 生成报告URL
              publicReportUrl = await this.copyReportToPublic(reportPath);
              logger.info(`在错误处理中生成报告URL: ${publicReportUrl}`);
            }
          }
        } catch (reportError) {
          logger.error(`在错误处理中获取报告URL失败: ${reportError instanceof Error ? reportError.message : String(reportError)}`);
        }
      }

      return {
        success: false,
        pageTitle,
        error: error instanceof Error ? error : new Error(String(error)),
        reportPath,
        publicReportUrl
      };
    } finally {
      // 关闭浏览器
      if (browser) {
        try {
          await browser.close();
          logger.debug("浏览器已关闭");
        } catch (error) {
          logger.warn(`关闭浏览器时出错: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  }

  // 生成测试报告
  generateTestReport(title: string, url: string, yaml: string, testResult: any) {
    let report = `# 测试报告: ${title}\n\n`;
    report += `## 测试URL\n${url}\n\n`;
    
    // 添加测试步骤
    report += `## 测试步骤\n\`\`\`yaml\n${yaml}\n\`\`\`\n\n`;
    
    // 添加测试结果
    report += `## 测试结果\n`;
    
    if (testResult.success) {
      report += `- 页面标题: ${testResult.pageTitle}\n`;
      report += `- reportUrl: ${testResult.publicReportUrl}\n`;
      report += `- 测试状态: 成功\n\n`;
    } else if (testResult.error) {
      report += `- 页面标题: ${testResult.pageTitle}\n`;
      report += `- 测试状态: 失败\n`;
      report += `- 错误信息: ${testResult.error.message}\n\n`;
      
      if (testResult.error.stack) {
        report += `## 详细错误信息\n\`\`\`\n${testResult.error.stack}\n\`\`\`\n\n`;
      }
    
    } else {
      report += `- 页面标题: ${testResult.pageTitle || '未知'}\n`;
      report += `- 测试状态: 失败\n`;
      
      // 如果即使失败也有报告URL，也添加链接
      if (testResult.publicReportUrl) {
        report += `## 详细报告\n`;
        report += `[在新窗口中查看详细HTML报告](${testResult.publicReportUrl})\n\n`;
        
        // 添加iframe标记
        report += `<div class="report-container" data-report-url="${testResult.publicReportUrl}">\n`;
        report += `  <iframe src="${testResult.publicReportUrl}" style="width:100%; height:600px; border:none;" sandbox="allow-scripts allow-same-origin allow-popups"></iframe>\n`;
        report += `</div>\n\n`;
      }
    }
    
    return report;
  }

  
  // 执行完整的测试流程
  async runTestingWorkflow(title: string, url: string, yaml: string | undefined, dataStream: DataStreamWriter, additionalInfo?: string, documentId?: string) {
    logger.info(`开始测试工作流，标题: ${title}, URL: ${url}`);
    
    try {
      // 如果没有提供YAML，则生成
      let yamlResult;
      if (!yaml || yaml.trim() === '') {
        logger.info(`没有提供YAML，将生成YAML`);
        
        yamlResult = await this.generateTestingYaml(url, title, additionalInfo);
        
        if (!yamlResult.success) {
          // 如果生成失败，提示用户提供更多信息
          logger.warn(`YAML生成失败: ${yamlResult.message}`);
          
          let errorReport = `# 测试报告: ${title}\n\n`;
          errorReport += `## 测试URL\n${url}\n\n`;
          errorReport += `## 需要更多信息\n`;
          errorReport += `AI无法生成有效的测试步骤，请提供更具体的测试信息，例如：\n`;
          errorReport += `- 您想测试网站的哪些具体功能？\n`;
          errorReport += `- 是否需要测试表单提交、登录、导航等特定操作？\n`;
          errorReport += `- 您想点击哪些元素，或者输入什么内容？\n\n`;
          
          if (yamlResult.originalYaml) {
            errorReport += `## AI生成的YAML(格式不正确)\n\`\`\`yaml\n${yamlResult.originalYaml}\n\`\`\`\n\n`;
            errorReport += `## 正确的YAML格式示例\n\`\`\`yaml\nweb:\n  url: ${url}\n\ntasks:\n  - name: 测试任务\n    flow:\n      - aiAssert: 检查页面已加载\n      - sleep: 3000\n      - ai: 执行某个操作\n\`\`\`\n\n`;
            errorReport += `## 提示\n`;
            errorReport += `请尝试提供更具体的指令，例如：\n`;
            errorReport += `- "访问网易深圳，点击政务栏目，然后点击第一条新闻"\n`;
            errorReport += `- "在百度首页搜索'人工智能'，然后点击第一个搜索结果"\n`;
          }
          
          return {report:errorReport,result:false, yamlResult:null, error:'YAML生成失败'};
        }
        
        logger.info(`YAML生成成功: ${yamlResult.yaml.substring(0, 50)}...`);
      } else {
        // 检查用户提供的YAML格式是否正确
        logger.info(`用户提供了YAML，检查格式`);
        // 改进YAML验证逻辑，移除前导空格和注释后再检查
        const cleanedYaml = yaml.replace(/^\s*#.*$/gm, '').trim(); // 移除注释行和空白
        if (!cleanedYaml.startsWith('web:')) {
          logger.warn(`用户提供的YAML格式不正确: ${cleanedYaml.substring(0, 20)}...`);
          
          let errorReport = `# 测试报告: ${title}\n\n`;
          errorReport += `## 测试URL\n${url}\n\n`;
          errorReport += `## YAML格式错误\n`;
          errorReport += `提供的YAML格式不正确。正确的Midscene YAML格式应该是：\n\n`;
          errorReport += `\`\`\`yaml\nweb:\n  url: ${url}\n\ntasks:\n  - name: 测试任务\n    flow:\n      - aiAssert: 检查页面已加载\n      - sleep: 3000\n      - ai: 执行某个操作\n\`\`\`\n\n`;
          errorReport += `## 您提供的YAML\n\`\`\`yaml\n${yaml}\n\`\`\`\n\n`;
          
          return {report:errorReport,result:false, yamlResult:null, error:'用户提供的YAML格式不正确'};
        }
        
        logger.info(`用户提供的YAML格式正确`);
        yamlResult = { yaml, success: true };
      }
      
      // 执行测试
      logger.info(`开始执行测试`);
      const testResult = await this.executeTest(url, yamlResult.yaml, dataStream, { documentId });
      logger.info(`测试执行完成，结果: ${testResult.success ? '成功' : '失败'}`);
      
      // 生成最终报告
      logger.info(`生成最终报告`);
      const finalReport = this.generateTestReport(title, url, yamlResult.yaml, testResult);
      logger.info(`最终报告已生成`);
      
      return {
        report: finalReport,
        result: testResult.success,
        yamlResult: yamlResult.yaml,
        error: testResult.error?.message,
        testResult // 新增，便于外部直接获取publicReportUrl等
      };
    } catch (error) {
      logger.error(`测试工作流执行失败: ${error instanceof Error ? error.stack || error.message : String(error)}`);
      
      let errorReport = `# 测试报告: ${title}\n\n`;
      errorReport += `## 测试URL\n${url}\n\n`;
      errorReport += `## 错误信息\n`;
      errorReport += `\`\`\`\n${error instanceof Error ? error.stack || error.message : String(error)}\n\`\`\`\n`;
      
      return {report:errorReport,result:false, yamlResult:null, error:error instanceof Error ? error.message : String(error)};
    }
  }
}
// 导出单例实例
export const testingService = new TestingService();
