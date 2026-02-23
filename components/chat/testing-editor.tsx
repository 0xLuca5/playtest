import React, { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { DiffView } from './diffview';
import { DocumentSkeleton } from './document-skeleton';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { LoaderIcon } from './icons';
import { AlertTriangleIcon, CheckIcon, ChevronDownIcon, ChevronUpIcon, MonitorIcon, FileTextIcon, Code2Icon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MIDSCENE_REPORT } from '@/artifacts/types';

interface TestingEditorProps {
  content: string;
  status: 'streaming' | 'idle';
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  saveContent: (content: string, debounce: boolean) => void;
  mode: 'edit' | 'diff';
  getDocumentContentById: (index: number) => string;
  isLoading: boolean;
}

interface Task {
  name: string;
  flow: Array<{
    type: string;
    value: string;
    status?: 'success' | 'failed' | 'pending';
    cacheable?: string;
    errorMessage?: string;
    deepThink?: string;
  }>;
  status?: 'success' | 'failed' | 'pending';
}

interface TestConfig {
  web: {
    url: string;
    viewportWidth?: number;
    viewportHeight?: number;
    waitForNetworkIdle?: {
      timeout?: number;
      continueOnNetworkIdleError?: boolean;
    };
  };
  tasks: Task[];
  error?: string;
}

const ensureApiPrefix = (url: string) => {
  if (!url) return '';
  if (url.startsWith('/api/report/')) return url;
  if (url.startsWith('/report/')) return '/api' + url;
  return url;
};

export function TestingEditor({
  content,
  status,
  isCurrentVersion,
  currentVersionIndex,
  saveContent,
  mode,
  getDocumentContentById,
  isLoading,
}: TestingEditorProps) {
  const [reportUrl, setReportUrl] = useState<string>('');
  const [reportResult, setReportResult] = useState<string>('');
  const [parsedContent, setParsedContent] = useState<boolean>(false);
  const [testConfig, setTestConfig] = useState<TestConfig | null>(null);
  const [isExecutingTest, setIsExecutingTest] = useState<boolean>(false);
  const [showYaml, setShowYaml] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [reportLoadFailed, setReportLoadFailed] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);

  // 添加iframe加载失败处理函数
  const handleIframeError = () => {
    setReportLoadFailed(true);
    
    // 最多重试3次
    if (retryCount < 3) {
      const nextRetryCount = retryCount + 1;
      setRetryCount(nextRetryCount);
      
      // 延迟1秒后重试
      setTimeout(() => {
        // 添加时间戳参数避免缓存
        const refreshedUrl = reportUrl.includes('?') 
          ? `${reportUrl}&retry=${Date.now()}` 
          : `${reportUrl}?retry=${Date.now()}`;
        setReportUrl(refreshedUrl);
        setReportLoadFailed(false);
      }, 1000);
    }
  };

  // 重置重试计数器
  useEffect(() => {
    if (reportUrl) {
      setRetryCount(0);
      setReportLoadFailed(false);
    }
  }, [reportUrl]);

  // 解析YAML内容为结构化数据
  const parseYamlContent = (yamlContent: string) => {
    try {
      console.log("开始解析YAML:", yamlContent);
      
      // 简单的YAML解析逻辑
      const lines = yamlContent.split('\n');
      const config: TestConfig = {
        web: { url: '' },
        tasks: []
      };
      
      let currentTask: Task | null = null;
      let inFlow = false;
      let currentFlowItem: any = null;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        const indent = line.search(/\S/); // 获取缩进级别
        
        console.log(`解析行 ${i}: "${trimmedLine}", 缩进: ${indent}, inFlow: ${inFlow}, currentFlowItem: ${currentFlowItem ? 'exists' : 'null'}`);
        
        // 跳过空行和注释
        if (trimmedLine === '' || trimmedLine.startsWith('#')) {
          continue;
        }
        
        // 处理行内注释，移除#后面的内容
        const commentIndex = trimmedLine.indexOf('#');
        const cleanLine = commentIndex !== -1 ? trimmedLine.substring(0, commentIndex).trim() : trimmedLine;
        
        if (cleanLine === '') {
          continue;
        }
        
        // 解析web.url
        if (cleanLine.startsWith('web:')) {
          console.log("找到web配置");
          // 查找web配置项
          for (let j = i + 1; j < lines.length; j++) {
            const nextLine = lines[j].trim();
            const nextIndent = lines[j].search(/\S/);
            
            // 如果缩进级别回到0或更小，说明web配置结束
            if (nextIndent <= 0 && nextLine !== '') {
              break;
            }
            
            if (nextLine.startsWith('url:')) {
              config.web.url = nextLine.substring(4).trim();
              console.log("设置web.url:", config.web.url);
            } else if (nextLine.startsWith('viewportWidth:')) {
              config.web.viewportWidth = parseInt(nextLine.substring(13).trim());
              console.log("设置viewportWidth:", config.web.viewportWidth);
            } else if (nextLine.startsWith('viewportHeight:')) {
              config.web.viewportHeight = parseInt(nextLine.substring(14).trim());
              console.log("设置viewportHeight:", config.web.viewportHeight);
            } else if (nextLine.startsWith('waitForNetworkIdle:')) {
              config.web.waitForNetworkIdle = {};
              // 查找waitForNetworkIdle的子配置
              for (let k = j + 1; k < lines.length; k++) {
                const subLine = lines[k].trim();
                const subIndent = lines[k].search(/\S/);
                
                // 如果缩进级别回到waitForNetworkIdle的级别或更小，说明子配置结束
                if (subIndent <= nextIndent + 2 && subLine !== '') {
                  break;
                }
                
                // 处理行内注释
                const subCommentIndex = subLine.indexOf('#');
                const cleanSubLine = subCommentIndex !== -1 ? subLine.substring(0, subCommentIndex).trim() : subLine;
                
                if (cleanSubLine.startsWith('timeout:')) {
                  config.web.waitForNetworkIdle!.timeout = parseInt(cleanSubLine.substring(8).trim());
                } else if (cleanSubLine.startsWith('continueOnNetworkIdleError:')) {
                  config.web.waitForNetworkIdle!.continueOnNetworkIdleError = cleanSubLine.substring(26).trim() === 'true';
                }
              }
            }
          }
        }
        // 解析tasks
        else if (cleanLine === 'tasks:') {
          console.log("找到tasks配置");
          continue;
        }
        // 解析task name
        else if (cleanLine.startsWith('- name:')) {
          if (currentTask) {
            console.log("添加任务:", currentTask.name);
            config.tasks.push(currentTask);
          }
          
          currentTask = {
            name: cleanLine.substring(7).trim(),
            flow: []
          };
          inFlow = false;
          console.log("创建新任务:", currentTask.name);
        }
        // 解析flow
        else if (cleanLine === 'flow:') {
          inFlow = true;
          console.log("进入flow配置");
          continue;
        }
        // 解析flow items
        else if (inFlow && currentTask) {
          // 检查各种操作类型
          if (cleanLine.startsWith('- ai:')) {
            currentFlowItem = {
              type: 'ai',
              value: cleanLine.substring(5).trim()
            };
            currentTask.flow.push(currentFlowItem);
            console.log("添加ai flow item:", currentFlowItem.value);
          }
          else if (cleanLine.startsWith('- aiAssert:')) {
            currentFlowItem = {
              type: 'aiAssert',
              value: cleanLine.substring(11).trim()
            };
            currentTask.flow.push(currentFlowItem);
            console.log("添加aiAssert flow item:", currentFlowItem.value);
          }
          else if (cleanLine.startsWith('- sleep:')) {
            currentFlowItem = {
              type: 'sleep',
              value: cleanLine.substring(8).trim()
            };
            currentTask.flow.push(currentFlowItem);
            console.log("添加sleep flow item:", currentFlowItem.value);
          }
          else if (cleanLine.startsWith('- aiTap:')) {
            currentFlowItem = {
              type: 'aiTap',
              value: cleanLine.substring(8).trim()
            };
            currentTask.flow.push(currentFlowItem);
            console.log("添加aiTap flow item:", currentFlowItem.value);
          }
          // 处理附加属性，如cacheable、errorMessage等
          else if (currentFlowItem && (cleanLine.startsWith('cacheable:') || cleanLine.startsWith('errorMessage:') || cleanLine.startsWith('deepThink:'))) {
            // 这些是附加属性，保存到currentFlowItem中
            const colonIndex = cleanLine.indexOf(':');
            if (colonIndex !== -1) {
              const key = cleanLine.substring(0, colonIndex).trim();
              const value = cleanLine.substring(colonIndex + 1).trim();
              currentFlowItem[key] = value;
              console.log(`添加属性到flow item: ${key} = ${value}`);
            }
          }
        }
      }
      
      // 添加最后一个任务
      if (currentTask) {
        console.log("添加最后一个任务:", currentTask.name);
        config.tasks.push(currentTask);
      }
      
      // 如果没有任务，创建一个默认任务
      if (config.tasks.length === 0) {
        console.log("没有找到任务，创建默认任务");
        config.tasks.push({
          name: 'New Test Task',
          flow: [
            { type: 'ai', value: 'Execute Operation' }
          ]
        });
      }
      
      console.log('解析后的配置:', JSON.stringify(config, null, 2));
      return config;
    } catch (error) {
      console.error('解析YAML失败:', error);
      // 返回默认配置
      return {
        web: { url: 'https://example.com' },
        tasks: [
          {
            name: 'New Test Task',
            flow: [
              { type: 'ai', value: 'Execute Operation' }
            ]
          }
        ]
      };
    }
  };

  // 将结构化数据转换回YAML
  const generateYaml = (config: TestConfig): string => {
    let yaml = '';
    
    // 添加web部分
    if (config.web.url) {
      yaml += `web:\n  url: ${config.web.url}\n`;
      if (config.web.viewportWidth) {
        yaml += `  viewportWidth: ${config.web.viewportWidth}\n`;
      }
      if (config.web.viewportHeight) {
        yaml += `  viewportHeight: ${config.web.viewportHeight}\n`;
      }
      if (config.web.waitForNetworkIdle) {
        yaml += `  waitForNetworkIdle:\n`;
        if (config.web.waitForNetworkIdle.timeout) {
          yaml += `    timeout: ${config.web.waitForNetworkIdle.timeout}\n`;
        }
        if (config.web.waitForNetworkIdle.continueOnNetworkIdleError) {
          yaml += `    continueOnNetworkIdleError: ${config.web.waitForNetworkIdle.continueOnNetworkIdleError}\n`;
        }
      }
      yaml += `\n`;
    }
    
    // 添加tasks部分
    yaml += `tasks:\n`;
    
    config.tasks.forEach(task => {
      yaml += `  - name: ${task.name}\n`;
      
      // 如果任务有状态，添加状态信息（仅用于UI显示，不会影响实际执行）
      if (task.status) {
        yaml += `    # status: ${task.status}\n`;
      }
      
      yaml += `    flow:\n`;
      
      task.flow.forEach(item => {
        yaml += `      - ${item.type}: ${item.value}\n`;
        
        // 添加所有附加属性
        if (item.cacheable) {
          yaml += `        cacheable: ${item.cacheable}\n`;
        }
        if (item.errorMessage) {
          yaml += `        errorMessage: ${item.errorMessage}\n`;
        }
        if (item.deepThink) {
          yaml += `        deepThink: ${item.deepThink}\n`;
        }
        
        // 如果步骤有状态，添加状态信息（仅用于UI显示，不会影响实际执行）
        if (item.status) {
          yaml += `        # status: ${item.status}\n`;
        }
      });
    });
    
    return yaml;
  };

  // 处理任务属性变更
  const handleTaskPropertyChange = (taskIndex: number, flowIndex: number, field: 'type' | 'value', newValue: string) => {
    if (!testConfig) return;
    
    console.log(`handleTaskPropertyChange: taskIndex=${taskIndex}, flowIndex=${flowIndex}, field=${field}, newValue=${newValue}`);
    console.log('当前testConfig:', testConfig);
    
    const updatedConfig = { ...testConfig };
    updatedConfig.tasks[taskIndex].flow[flowIndex][field] = newValue;
    
    console.log('更新后的testConfig:', updatedConfig);
    
    setTestConfig(updatedConfig);
    
    const updatedYaml = generateYaml(updatedConfig);
    setReportResult(updatedYaml);
    
    // 保存更新后的内容
    if (isCurrentVersion) {
      saveContent(JSON.stringify({
        reportUri: reportUrl,
        result: "已更新任务步骤",
        yaml: updatedYaml
      }), true);
    }
  };

  // 添加新的流程步骤
  const addFlowItem = (taskIndex: number) => {
    if (!testConfig) return;
    
    const updatedConfig = { ...testConfig };
    updatedConfig.tasks[taskIndex].flow.push({
      type: 'ai',
      value: 'Execute Operation'
    });
    
    setTestConfig(updatedConfig);
    
    const updatedYaml = generateYaml(updatedConfig);
    setReportResult(updatedYaml);
    
    // 保存更新后的内容
    if (isCurrentVersion) {
      saveContent(JSON.stringify({
        reportUri: reportUrl,
        result: "已添加任务步骤",
        yaml: updatedYaml
      }), true);
    }
  };

  // 删除流程步骤
  const removeFlowItem = (taskIndex: number, flowIndex: number) => {
    if (!testConfig) return;
    
    const updatedConfig = { ...testConfig };
    updatedConfig.tasks[taskIndex].flow.splice(flowIndex, 1);
    
    setTestConfig(updatedConfig);
    
    const updatedYaml = generateYaml(updatedConfig);
    setReportResult(updatedYaml);
    
    // 保存更新后的内容
    if (isCurrentVersion) {
      saveContent(JSON.stringify({
        report_uri: reportUrl,
        result: "已删除任务步骤",
        yaml: updatedYaml
      }), true);
    }
  };

  // 添加新任务
  const addTask = () => {
    if (!testConfig) return;
    
    const updatedConfig = { ...testConfig };
    updatedConfig.tasks.push({
      name: 'New Test Task',
      flow: [
        { type: 'ai', value: 'Execute Operation' }
      ]
    });
    
    setTestConfig(updatedConfig);
    
    const updatedYaml = generateYaml(updatedConfig);
    setReportResult(updatedYaml);
    
    // 保存更新后的内容
    if (isCurrentVersion) {
      saveContent(JSON.stringify({
        reportUri: reportUrl,
        result: "已添加新任务",
        yaml: updatedYaml
      }), true);
    }
  };

  // 删除任务
  const removeTask = (taskIndex: number) => {
    if (!testConfig || testConfig.tasks.length <= 1) return;
    
    const updatedConfig = { ...testConfig };
    updatedConfig.tasks.splice(taskIndex, 1);
    
    // 确保至少有一个任务
    if (updatedConfig.tasks.length === 0) {
      updatedConfig.tasks.push({
        name: 'New Test Task',
        flow: [
          { type: 'ai', value: 'Execute Operation' }
        ]
      });
    }
    
    setTestConfig(updatedConfig);
    
    const updatedYaml = generateYaml(updatedConfig);
    setReportResult(updatedYaml);
    
    // 保存更新后的内容
    if (isCurrentVersion) {
      saveContent(JSON.stringify({
        reportUri: reportUrl,
        result: "已删除任务",
        yaml: updatedYaml
      }), true);
    }
  };

  // 解析测试结果
  const parseTestResult = (content: string) => {
    if (!content) return null;
    
    try {
      // 尝试提取测试URL
      const urlMatch = content.match(/## 测试URL\s*\n([^\n]+)/);
      const url = urlMatch ? urlMatch[1].trim() : '';
      
      // 尝试提取测试状态
      const statusMatch = content.match(/- 测试状态:\s*([^\n]+)/);
      const status = statusMatch ? statusMatch[1].trim() : '失败';
      
      // 尝试提取错误信息
      const errorMatch = content.match(/- 错误信息:\s*([^\n]+)/);
      const error = errorMatch ? errorMatch[1].trim() : '';
      
      // 尝试提取详细错误信息
      const detailErrorMatch = content.match(/## 详细错误信息\s+```([\s\S]+?)```/);
      const detailError = detailErrorMatch ? detailErrorMatch[1].trim() : '';
      
      return {
        url,
        status,
        error,
        detailError
      };
    } catch (e) {
      console.error('解析测试结果失败:', e);
      return null;
    }
  };
  
  // 获取解析后的测试结果
  const testResult = content && typeof content === 'string' ? parseTestResult(content) : null;

  useEffect(() => {
    console.log("TestingEditor接收到content:", content);
    console.log("status:", status);
    
    // 始终设置为已解析状态，以便显示编辑器
    setParsedContent(true);
    
    // 检查是否正在执行测试
    if (typeof content === 'string' && content.includes("正在执行测试，请稍候")) {
      setIsExecutingTest(true);
    } else if (status !== 'streaming') {
      setIsExecutingTest(false);
    }
    
    // 无论状态如何，只要有content就尝试解析
    if (content) {
      try {
        // 尝试解析JSON
        let contentObj;
        let yamlContent = '';
        let testFailed = false;
        let errorMessage = '';
        
        // 如果content已经是对象，直接使用
        if (typeof content === 'object') {
          contentObj = content;
        } else {
          // 否则尝试解析JSON字符串
          contentObj = JSON.parse(content);
        }
        
        console.log("TestingEditor解析contentObj:", contentObj);
        
        // 检查是否测试失败
        if (contentObj.result === 'failed' || contentObj.error) {
          console.log("测试失败或有错误");
          testFailed = true;
          errorMessage = contentObj.error || '测试执行失败';
        }
        
        // 检查不同可能的字段名
        if (contentObj.reportUri) {
          console.log("找到reportUri字段:", contentObj.reportUri);
          // 处理报告URL
          const processedUrl = contentObj.reportUri.startsWith('/api')
            ? contentObj.reportUri.replace('/api', '')
            : contentObj.reportUri;
          console.log("处理后的报告URL:", processedUrl);
          setReportUrl(ensureApiPrefix(processedUrl));
        } else if (contentObj.report_uri) {
          console.log("找到report_uri字段（兼容旧格式）:", contentObj.report_uri);
          // 处理报告URL
          const processedUrl = contentObj.report_uri.startsWith('/api')
            ? contentObj.report_uri.replace('/api', '')
            : contentObj.report_uri;
          console.log("处理后的报告URL:", processedUrl);
          setReportUrl(ensureApiPrefix(processedUrl));
          
          // 优先使用yaml字段作为YAML内容
          if (contentObj.yaml && typeof contentObj.yaml === 'string') {
            console.log("使用yaml字段作为YAML内容:", contentObj.yaml.substring(0, 50) + "...");
            yamlContent = contentObj.yaml;
          } else if (contentObj.yamlResult && typeof contentObj.yamlResult === 'string') {
            console.log("使用yamlResult字段作为YAML内容:", contentObj.yamlResult.substring(0, 50) + "...");
            yamlContent = contentObj.yamlResult;
          }
          setReportResult(yamlContent);
        } 
        else if (typeof contentObj === 'string' && (contentObj.includes('/report/') || contentObj.startsWith('http'))) {
          // 处理可能的直接URL字符串
          console.log("content可能是直接URL:", contentObj);
          const processedUrl = contentObj.startsWith('/api') 
            ? contentObj.replace('/api', '') 
            : contentObj;
          console.log("处理后的报告URL:", processedUrl);
          setReportUrl(ensureApiPrefix(processedUrl));
        }
        
        // 解析YAML为结构化数据
        console.log("尝试解析YAML内容:", yamlContent);
        
        // 确保yamlContent不为空
        if (!yamlContent && contentObj.yaml) {
          yamlContent = contentObj.yaml;
          console.log("从contentObj.yaml获取YAML内容:", yamlContent.substring(0, 50) + "...");
        } else if (!yamlContent && contentObj.yamlResult) {
          yamlContent = contentObj.yamlResult;
          console.log("从contentObj.yamlResult获取YAML内容:", yamlContent.substring(0, 50) + "...");
        }
        
        // 如果仍然没有YAML内容，尝试从测试结果中提取
        if (!yamlContent && contentObj.testResult && contentObj.testResult.yamlResult) {
          yamlContent = contentObj.testResult.yamlResult;
          console.log("从contentObj.testResult.yamlResult获取YAML内容:", yamlContent.substring(0, 50) + "...");
        }
        
        console.log("最终YAML内容:", yamlContent ? yamlContent.substring(0, 50) + "..." : "(无YAML内容)");
        
        if (yamlContent) {
          const config = parseYamlContent(yamlContent);
          
          // 如果有错误信息，处理任务状态
          if (errorMessage) {
            config.error = errorMessage;
            
            // 解析错误信息，查找失败的任务
            const failedTaskMatch = errorMessage.match(/task - ([^:]+):/);
            if (failedTaskMatch && failedTaskMatch[1]) {
              const failedTaskName = failedTaskMatch[1].trim();
              
              // 更新任务状态
              config.tasks.forEach(task => {
                if (task.name === failedTaskName) {
                  task.status = 'failed';
                  // 找到错误原因中提到的具体步骤
                  const reasonMatch = errorMessage.match(/Reason: ([^\n]+)/);
                  if (reasonMatch && reasonMatch[1]) {
                    const reason = reasonMatch[1].trim();
                    // 查找可能包含这个错误的步骤
                    task.flow.forEach(step => {
                      if (reason.toLowerCase().includes(step.value.toLowerCase())) {
                        step.status = 'failed';
                      } else {
                        step.status = 'success'; // 默认其他步骤为成功
                      }
                    });
                  }
                } else {
                  task.status = 'success'; // 其他任务标记为成功
                }
              });
            }
          }
          
          setTestConfig(config);
          
          // 将解析后的配置重新生成为YAML，用于调试
          const regeneratedYaml = generateYaml(config);
          console.log("重新生成的YAML:", regeneratedYaml);
        } else {
          // 如果没有YAML内容，则创建空配置
          console.log("没有找到YAML内容，使用空配置");
          
          // 尝试从URL中提取实际测试的网站URL
          let testUrl = '';
          if (reportUrl) {
            // 尝试从报告URL中提取测试日期和ID，用于记录
            console.log("尝试从报告URL中提取信息:", reportUrl);
            
            // 尝试从文档内容中提取实际测试的URL
            if (typeof content === 'string') {
              // 尝试从Markdown内容中提取URL
              const urlMatch = content.match(/测试URL\s*\n([^\n]+)/);
              if (urlMatch && urlMatch[1]) {
                testUrl = urlMatch[1].trim();
                console.log("从Markdown中提取测试URL:", testUrl);
              }
            }
          }
          
          setTestConfig({
            web: { url: testUrl || '' },
            tasks: [
              {
                name: '',
                flow: []
              }
            ],
            error: errorMessage || undefined
          });
        }
      } catch (error) {
        // 如果解析失败，可能是普通文本或者其他格式
        console.log("解析content失败，可能不是JSON格式:", error);
        
        // 尝试从Markdown文本中提取YAML内容
        if (typeof content === 'string' && content.includes('```yaml')) {
          console.log("尝试从Markdown中提取YAML内容");
          const yamlMatch = content.match(/```yaml\s*([\s\S]*?)```/);
          if (yamlMatch && yamlMatch[1]) {
            const extractedYaml = yamlMatch[1].trim();
            console.log("从Markdown中提取的YAML:", extractedYaml);
            
            // 解析提取的YAML
            const config = parseYamlContent(extractedYaml);
            setTestConfig(config);
            setReportResult(extractedYaml);
            
            // 查找可能的报告URL
            const reportUrlMatch = content.match(/\/report\/[^\s"')]+\.html/);
            if (reportUrlMatch) {
              console.log("从Markdown中提取的报告URL:", reportUrlMatch[0]);
              const processedUrl = reportUrlMatch[0].startsWith('/api') 
                ? reportUrlMatch[0].replace('/api', '') 
                : reportUrlMatch[0];
              console.log("处理后的报告URL:", processedUrl);
              setReportUrl(ensureApiPrefix(processedUrl));
            }
            
            // 查找可能的错误信息
            const errorMatch = content.match(/Error\(s\) occurred[^:]*:([^\n]+)/);
            if (errorMatch && errorMatch[1]) {
              config.error = errorMatch[1].trim();
            }
            
            return;
          }
        }
        
        // 检查content是否直接是URL
        if (typeof content === 'string' && (content.includes('/report/') || content.startsWith('http'))) {
          console.log("content可能是直接URL字符串:", content);
          const processedUrl = content.startsWith('/api') 
            ? content.replace('/api', '') 
            : content;
          console.log("处理后的报告URL:", processedUrl);
          setReportUrl(ensureApiPrefix(processedUrl));
        }
        
        // 如果无法从Markdown提取YAML，则创建空配置
        setTestConfig({
          web: { url: '' },
          tasks: [
            {
              name: '',
              flow: []
            }
          ]
        });
      }
    } else {
      // 如果没有内容，也创建空配置
      setTestConfig({
        web: { url: '' },
        tasks: [
          {
            name: '',
            flow: []
          }
        ]
      });
    }
  
    
  }, [content]);

  // 工具函数：提取content中的详细错误信息代码块
  function extractDetailError(content: string): string | null {
    if (!content) return null;
    const match = content.match(/## 详细错误信息\s*```[\s\S]*?([\s\S]*?)```/);
    if (match && match[1]) {
      return match[1].trim();
    }
    return null;
  }

  // 在render作用域定义detailError、fallbackError、errorToShow
  const parsedContentObj = (() => {
    try {
      return typeof content === 'string' ? JSON.parse(content) : content;
    } catch { return {}; }
  })();
  const detailError = parsedContentObj && parsedContentObj.content ? extractDetailError(parsedContentObj.content) : null;
  const fallbackError = parsedContentObj && parsedContentObj.result ? (parsedContentObj.result.match(/- 错误信息:([\s\S]*?)(?:\n-|$)/)?.[1]?.trim() || '') : '';
  const errorToShow = detailError || fallbackError || (parsedContentObj && parsedContentObj.error) || '测试执行失败，请查看详细内容';

  // 在render作用域
  const MAX_ERROR_LINES = 10;
  const errorLines = errorToShow.split('\n');
  const [showAllError, setShowAllError] = useState(false);
  const getErrorSummary = (msg: string) => {
    if (!msg) return '';
    // 取第一段（遇到空行或换行即截断）
    const lines = msg.split(/\r?\n/);
    let summary = '';
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '' && i > 0) break;
      summary += lines[i] + '\n';
    }
    return summary.trim();
  };
  const errorSummary = getErrorSummary(errorToShow);

  if (isLoading) {
    return <DocumentSkeleton artifactKind={MIDSCENE_REPORT} />;
  }

  if (mode === 'diff') {
    const oldContent = getDocumentContentById(currentVersionIndex - 1);
    const newContent = getDocumentContentById(currentVersionIndex);
    return <DiffView oldContent={oldContent} newContent={newContent} />;
  }

  // 始终使用左右布局，即使content为空也显示加载状态
  return (
    <div className="flex flex-row w-full h-full overflow-hidden relative">
      {/* 左侧iframe，宽度根据右侧面板是否展开而变化 */}
      <div className={cn(
        "h-full border-r dark:border-zinc-700 transition-all duration-300",
        sidebarCollapsed ? "w-full" : "w-[75%]"
      )}>
        {reportUrl ? (
          <>
            {/* <div className="absolute top-0 left-0 bg-black/70 text-white text-xs p-1 z-10">
              当前报告URL: {reportUrl}
            </div> */}
            {reportLoadFailed && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-100/90 dark:bg-zinc-800/90 z-20">
                <div className="flex flex-col items-center gap-4 p-6 max-w-md text-center">
                  <div className="animate-spin text-blue-500">
                    <LoaderIcon />
                  </div>
                  <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                    报告加载中...
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {retryCount > 0 ? `正在尝试第 ${retryCount} 次重新加载` : '正在加载报告'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    报告生成可能需要几秒钟时间
                  </p>
                </div>
              </div>
            )}
            <iframe 
              src={ensureApiPrefix(reportUrl)}
              className="w-full h-full border-0 overflow-hidden"
              sandbox="allow-scripts allow-same-origin allow-popups"
              loading="lazy"
              style={{ width: '100%', height: '100%', overflow: 'hidden' }}
              scrolling="no"
              onError={handleIframeError}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full bg-zinc-100 dark:bg-zinc-800">
            {!parsedContent ? (
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin">
                  <LoaderIcon />
                </div>
                <div className="text-sm text-muted-foreground">Loading Testing Report...</div>
              </div>
            ) : isExecutingTest || status === 'streaming' ? (
              // 测试正在进行时的显示内容
              <div className="flex flex-col items-center gap-4 p-6 max-w-3xl">
                <div className="animate-spin text-blue-500">
                  <LoaderIcon />
                </div>
                <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">Testing is in progress</p>
                
                {/* 显示测试URL */}
                {testConfig && testConfig.web && testConfig.web.url && (
                  <div className="w-full mt-2 p-4 border border-gray-200 bg-white dark:bg-zinc-900 dark:border-zinc-700 rounded-md">
                    <p className="font-semibold mb-1">Test URL：</p>
                    <p className="text-blue-600 dark:text-blue-400 break-all">
                      <a href={testConfig.web.url} target="_blank" rel="noopener noreferrer">
                        {testConfig.web.url}
                      </a>
                    </p>
                  </div>
                )}
                
                <p className="text-sm text-muted-foreground mt-4">Testing is executing，wait...</p>
              </div>
            ) : (
              // 测试失败时的显示内容
              <div className="flex flex-col items-center gap-4 p-6 max-w-3xl">
                <AlertTriangleIcon className="h-10 w-10 text-amber-500" />
                <p className="text-lg font-semibold text-red-600 dark:text-red-400">Testing is failed，can't load testing report</p>
                
                {/* 显示测试URL */}
                {testResult && testResult.url && (
                  <div className="w-full mt-2 p-4 border border-gray-200 bg-white dark:bg-zinc-900 dark:border-zinc-700 rounded-md">
                    <p className="font-semibold mb-1">测试URL：</p>
                    <p className="text-blue-600 dark:text-blue-400 break-all">
                      <a href={testResult.url} target="_blank" rel="noopener noreferrer">
                        {testResult.url}
                      </a>
                    </p>
                  </div>
                )}
                
                {/* 在错误信息展示区只渲染 errorToShow，始终有滚动条，无收起/展开按钮，label为英文 */}
                {errorToShow && (
                  <div className="w-full mt-4 p-4 border border-red-200 bg-red-50 dark:bg-red-900/10 rounded-md">
                    <p className="font-semibold text-red-700 dark:text-red-400 mb-2">Error Message:</p>
                    <pre
                      className="text-red-700 dark:text-red-400 whitespace-pre-wrap overflow-auto max-h-80"
                      style={{ scrollbarWidth: 'thin' }}
                    >
                      {errorToShow}
                    </pre>
                  </div>
                )}
                {/* 不再渲染 content 的完整 JSON 或 markdown */}
                <p className="text-sm text-muted-foreground mt-4">You can edit the test configuration on the right and rerun the test.</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* 展开/隐藏按钮 - 放在外部以确保始终可见 */}
      <div className={cn(
        "absolute top-1/2 transform -translate-y-1/2 z-50",
        sidebarCollapsed ? "right-0" : "right-[25%]"
      )}>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8 rounded-l-md rounded-r-none border-r-0 bg-white dark:bg-zinc-800 shadow-md"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? <ChevronLeftIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
        </Button>
      </div>
      
      {/* 右侧结果面板，可展开/隐藏 */}
      <div className={cn(
        "h-full flex flex-col border-l border-zinc-200 border-t dark:border-zinc-700 shadow-lg transition-all duration-300",
        sidebarCollapsed ? "w-0 opacity-0 overflow-hidden" : "w-[25%] opacity-100",
        "bg-[#f8f8f8] dark:bg-zinc-900"
      )}>
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b dark:border-zinc-700 bg-[#f8f8f8] dark:bg-zinc-900">
          <div className="text-sm font-medium">Testing Configuration</div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs flex items-center gap-1.5"
            onClick={() => {
              // 直接切换视图，不自动生成YAML
              setShowYaml(!showYaml);
            }}
          >
            {showYaml ? (
              <>
                <MonitorIcon className="h-4 w-4" />
                <span>Visualization</span>
              </>
            ) : (
              <>
                <Code2Icon className="h-4 w-4" />
                <span>YAML View</span>
              </>
            )}
          </Button>
        </div>

        {/* 内容区 */}
        <div className="flex-grow overflow-auto p-4">
          {showYaml ? (
            // YAML视图
            <div>
              {(reportResult || (testConfig && generateYaml(testConfig))) ? (
                <div className="bg-white dark:bg-zinc-900 rounded-md p-4 overflow-auto max-h-[calc(100vh-120px)] shadow-sm">
                  <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                    {reportResult || (testConfig ? generateYaml(testConfig) : '')}
                  </pre>
                </div>
              ) : (
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-5/6 mb-2"></div>
                </div>
              )}
            </div>
          ) : (
            // 可视化配置视图
            <div className="space-y-4 flex flex-col h-full">
              {testConfig ? (
                <>
                  {testConfig.error && (
                    <Card className="border-red-200 bg-red-50 dark:bg-red-900/10">
                      <CardHeader className="py-2 px-4">
                        <CardTitle className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                          <AlertTriangleIcon className="h-4 w-4" />
                          测试执行出错
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-2 px-4 text-xs text-red-700 dark:text-red-400">
                        {testConfig.error}
                      </CardContent>
                    </Card>
                  )}
                  
                  <div className="mb-4 bg-[#f8f8f8] dark:bg-zinc-900 rounded-md">
                    <Label htmlFor="url" className="text-sm font-medium mb-2">测试URL</Label>
                    <div className="flex gap-2 mt-1">
                      <Input 
                        id="url" 
                        value={testConfig.web.url} 
                        onChange={(e) => {
                          const updatedConfig = { ...testConfig };
                          updatedConfig.web.url = e.target.value;
                          setTestConfig(updatedConfig);
                          
                          const updatedYaml = generateYaml(updatedConfig);
                          setReportResult(updatedYaml);
                          
                          if (isCurrentVersion) {
                            saveContent(JSON.stringify({
                              reportUri: reportUrl,
                              result: "已更新测试URL",
                              yaml: updatedYaml
                            }), true);
                          }
                        }}
                        className="flex-1 bg-white text-xs"
                        style={{
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden'
                        }}
                        placeholder="输入要测试的网站URL"
                        title={testConfig.web.url} // 添加 tooltip 显示完整内容
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium">Task</h3>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs"
                      onClick={addTask}
                    >
                      Add task
                    </Button>
                  </div>
                  
                  <div className="flex-grow overflow-auto mb-4">
                    <Accordion 
                      type="multiple" 
                      className="w-full" 
                      defaultValue={testConfig.tasks.map((_, i) => `task-${i}`)}
                    >
                      {testConfig.tasks.map((task, taskIndex) => (
                        <AccordionItem 
                          key={taskIndex} 
                          value={`task-${taskIndex}`} 
                          className="mb-4 bg-white dark:bg-zinc-900 rounded-md overflow-hidden shadow-sm"
                        >
                          <AccordionTrigger className="text-sm font-medium px-2 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-b dark:border-zinc-700">
                            <div className="flex items-center gap-2 flex-1 text-left">
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                                {taskIndex + 1}
                              </div>
                              {task.status === 'failed' ? (
                                <AlertTriangleIcon className="h-4 w-4 text-red-500" />
                              ) : task.status === 'success' ? (
                                <CheckIcon className="h-4 w-4 text-green-500" />
                              ) : null}
                              <span className={cn(
                                "font-medium",
                                task.status === 'failed' && "text-red-500",
                                task.status === 'success' && "text-green-500"
                              )}>
                                {task.name || `task ${taskIndex + 1}`}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-3 pb-3 pt-2 bg-white dark:bg-zinc-900">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between mb-2">
                                <Label htmlFor={`task-${taskIndex}-name`} className="text-sm">Task Name</Label>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-7 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-100"
                                  onClick={() => removeTask(taskIndex)}
                                  disabled={testConfig.tasks.length <= 1}
                                >
                                  Remove task
                                </Button>
                              </div>
                              <Input 
                                id={`task-${taskIndex}-name`}
                                value={task.name} 
                                onChange={(e) => {
                                  const updatedConfig = { ...testConfig };
                                  updatedConfig.tasks[taskIndex].name = e.target.value;
                                  setTestConfig(updatedConfig);
                                  
                                  const updatedYaml = generateYaml(updatedConfig);
                                  setReportResult(updatedYaml);
                                  
                                  if (isCurrentVersion) {
                                    saveContent(JSON.stringify({
                                      reportUri: reportUrl,
                                      result: "已更新任务名称",
                                      yaml: updatedYaml
                                    }), true);
                                  }
                                }}
                                className="text-sm w-full"
                                style={{
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden'
                                }}
                                title={task.name} // 添加 tooltip 显示完整内容
                              />
                              
                              <div className="mt-4">
                                <div className="flex justify-between items-center mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-1 h-4 bg-primary rounded-full"></div>
                                    <p className="text-sm font-medium">Processes</p>
                                  </div>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-xs h-7 px-2"
                                    onClick={() => addFlowItem(taskIndex)}
                                  >
                                    Add steps
                                  </Button>
                                </div>
                                
                                <div className="pl-4 border-l-2 border-zinc-200 dark:border-zinc-700 ml-2 mt-3 space-y-2">
                                  {task.flow.map((flowItem, flowIndex) => {
                                    console.log(`渲染 flowItem: taskIndex=${taskIndex}, flowIndex=${flowIndex}, value=${flowItem.value}`);
                                    return (
                                      <div 
                                        key={flowIndex} 
                                        className={cn(
                                          "flex flex-row items-center gap-1.5 mb-2 py-1.5 px-2 border border-dashed rounded-md relative bg-white dark:bg-zinc-900",
                                          flowItem.status === 'failed' ? "border-red-200 bg-red-50/50 dark:bg-red-900/10" : 
                                          flowItem.status === 'success' ? "border-green-200 dark:border-green-800/30" : 
                                          "border-zinc-200 dark:border-zinc-700"
                                        )}
                                      >
                                      {/* 左侧连接线 */}
                                      <div className="absolute -left-4 top-1/2 w-3 h-px bg-zinc-200 dark:bg-zinc-700"></div>
                                      
                                      {/* 步骤序号 */}
                                      <div className="w-4 h-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
                                        {flowIndex + 1}
                                      </div>
                                      
                                      {flowItem.status === 'failed' ? (
                                        <AlertTriangleIcon className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                      ) : flowItem.status === 'success' ? (
                                        <CheckIcon className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                      ) : null}
                                      
                                      <Select 
                                        value={flowItem.type} 
                                        onValueChange={(value: string) => handleTaskPropertyChange(taskIndex, flowIndex, 'type', value)}
                                      >
                                        <SelectTrigger className="w-[90px] text-xs h-7 shrink-0">
                                          <SelectValue placeholder="类型" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="ai">Ai</SelectItem>
                                          <SelectItem value="aiAssert">Assert</SelectItem>
                                          <SelectItem value="aiTap">Click</SelectItem>
                                          <SelectItem value="sleep">Wait</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      
                                      <div className="flex-1 min-w-0">
                                        <Input 
                                          key={`${taskIndex}-${flowIndex}-${flowItem.value}`}
                                          value={flowItem.value} 
                                          onChange={(e) => {
                                            console.log(`Input onChange: taskIndex=${taskIndex}, flowIndex=${flowIndex}, value=${e.target.value}`);
                                            handleTaskPropertyChange(taskIndex, flowIndex, 'value', e.target.value);
                                          }}
                                          className={cn(
                                            "text-xs h-7 w-full",
                                            flowItem.status === 'failed' && "border-red-300 bg-red-50 dark:bg-red-900/10",
                                            flowItem.status === 'success' && "border-green-300 dark:border-green-800"
                                          )}
                                          style={{
                                            color: 'inherit',
                                            backgroundColor: 'transparent',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden'
                                          }}
                                          placeholder={
                                            flowItem.type === 'ai' ? '执行AI操作' : 
                                            flowItem.type === 'aiAssert' ? '检查条件' : 
                                            flowItem.type === 'aiTap' ? '点击元素' :
                                            '等待时间(毫秒)'
                                          }
                                          title={flowItem.value} // 添加 tooltip 显示完整内容
                                        />
                                      </div>
                                      
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        className="h-6 px-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-100 shrink-0"
                                        onClick={() => removeFlowItem(taskIndex, flowIndex)}
                                      >
                                        删除
                                      </Button>
                                    </div>
                                  );
                                })}
                                </div>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                </>
              ) : (
                <div className="animate-pulse space-y-4">
                  <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4"></div>
                  <div className="h-20 bg-zinc-200 dark:bg-zinc-700 rounded w-full"></div>
                  <div className="h-40 bg-zinc-200 dark:bg-zinc-700 rounded w-full"></div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* 移除执行测试按钮，由toolbar按钮代替 */}
      </div>
    </div>
  );
}