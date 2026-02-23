import { myProvider } from '@/lib/ai/providers';
import { createDocumentHandler } from '@/lib/artifacts/server';
import { streamText } from 'ai';
import { getSheetPrompt, updateDocumentPrompt } from '@/lib/ai/prompts';

// 从AI响应中提取JSON数据的函数
function extractJsonFromResponse(response: string): { columns: any[], sampleData: any[] } | null {
  try {
    // 尝试直接解析整个响应为JSON
    const parsed = JSON.parse(response);
    if (parsed.columns && parsed.sampleData) {
      return parsed;
    }
  } catch (e) {
    // 如果直接解析失败，尝试从响应中提取JSON块
  }

  // 尝试从markdown代码块中提取JSON
  const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.columns && parsed.sampleData) {
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse JSON from code block:', e);
    }
  }

  // 尝试查找独立的JSON对象
  const standaloneJsonMatch = response.match(/\{[\s\S]*"columns"[\s\S]*"sampleData"[\s\S]*\}/);
  if (standaloneJsonMatch) {
    try {
      const parsed = JSON.parse(standaloneJsonMatch[0]);
      if (parsed.columns && parsed.sampleData) {
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse standalone JSON:', e);
    }
  }

  return null;
}

// 将JSON数据转换为CSV格式的函数
function convertJsonToCsv(data: { columns: any[], sampleData: any[] }): string {
  const { columns, sampleData } = data;

  // 创建CSV头部
  const headers = columns.map(col => col.name).join(',');

  // 创建CSV数据行
  const rows = sampleData.map(row => {
    return columns.map(col => {
      const value = row[col.name] || '';
      // 如果值包含逗号或引号，需要用引号包围并转义
      if (value.toString().includes(',') || value.toString().includes('"') || value.toString().includes('\n')) {
        return `"${value.toString().replace(/"/g, '""')}"`;
      }
      return value.toString();
    }).join(',');
  }).join('\n');

  return `${headers}\n${rows}`;
}


// 简单的语言检测函数
function detectLanguageFromTitle(title: string): string {
  // 检测中文字符
  if (/[\u4e00-\u9fff]/.test(title)) {
    return 'zh';
  }
  // 检测日文字符（平假名、片假名、汉字）
  if (/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/.test(title)) {
    return 'ja';
  }
  // 默认英文
  return 'en';
}


export const sheetDocumentHandler = createDocumentHandler<'sheet'>({
  kind: 'sheet',
  onCreateDocument: async ({ title, dataStream }) => {
    let draftContent = '';
    const detectedLanguage = detectLanguageFromTitle(title);
    const systemPrompt = getSheetPrompt(detectedLanguage);
    const { fullStream } = streamText({
      model: myProvider.languageModel('qwen-max'),
      system: systemPrompt,
      prompt: `${title}`,
    });

    let lastSentLength = 0;

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'text-delta') {
        const { text } = delta;
        draftContent += text;
      }

      // 确保在流结束时发送最终内容
      if (type === 'finish' || type === 'error') {
        if (draftContent && lastSentLength < draftContent.length) {
          dataStream.write({
            type: 'data-sheetDelta',
            data: draftContent,
            transient: true,
          });
        }
        break;
      }
    }

    console.log('draftContent: ', draftContent);

    // 尝试从响应中提取JSON并转换为CSV
    const jsonData = extractJsonFromResponse(draftContent);
    let finalContent = draftContent;

    if (jsonData) {
      console.log('成功提取JSON数据:', jsonData);
      finalContent = convertJsonToCsv(jsonData);
      console.log('转换后的CSV:', finalContent);
    } else {
      console.log('未能提取JSON数据，使用原始内容');
    }

    // 发送最终内容
    dataStream.write({
      type: 'data-sheetDelta',
      data: finalContent,
      transient: true,
    });

    return finalContent;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent = '';

    const { fullStream } = streamText({
      model: myProvider.languageModel('qwen-max'),
      system: updateDocumentPrompt(document.content, 'sheet'),
      prompt: `Current CSV:\n${document.content}\n\nUpdate request: ${description}`,
    });

    let lastSentLength = 0;

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'text-delta') {
        const { text } = delta;
        draftContent += text;
        // 优化发送频率
        const shouldSend =
          draftContent.length - lastSentLength > 50 ||
          (draftContent.includes('\n') && lastSentLength === 0);

        if (shouldSend) {
          dataStream.write({
            type: 'data-sheetDelta',
            data: draftContent,
            transient: true,
          });
          lastSentLength = draftContent.length;
        }
      }

      // 确保在流结束时发送最终内容
      if (type === 'finish' || type === 'error') {
        if (draftContent && lastSentLength < draftContent.length) {
          dataStream.write({
            type: 'data-sheetDelta',
            data: draftContent,
            transient: true,
          });
        }
        break;
      }
    }

    // 确保最终内容被发送
    if (draftContent && lastSentLength < draftContent.length) {
      dataStream.write({
        type: 'data-sheetDelta',
        data: draftContent,
        transient: true,
      });
    }

    return draftContent;
  },
});