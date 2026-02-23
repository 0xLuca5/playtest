import { createDocumentHandler } from '@/lib/artifacts/server';
import { getCompleteTestCase, createTestCase, getFolders, createFolder } from '@/lib/db/queries';
import { getCurrentProjectIdOrDefault } from '@/lib/utils/project';
import { aiLogger } from '@/lib/logger';
import { TEST_CASE_ARTIFACT, TestCaseArtifactType } from '@/artifacts/types';

// 创建模块专用的日志记录器
const logger = aiLogger.child('test-case-handler');

// 获取或创建AI生成的测试用例文件夹
async function getOrCreateAIFolder(projectId: string, createdBy: string): Promise<string> {
  try {
    // 1. 先查找是否已存在AI文件夹
    const folders = await getFolders(projectId);
    const aiFolder = folders.find(folder => folder.name === 'AI生成' || folder.name === 'AI Generated');

    if (aiFolder) {
      logger.info(`找到现有AI文件夹: ${aiFolder.id} - ${aiFolder.name}`);
      return aiFolder.id;
    }

    // 2. 如果不存在，创建AI文件夹
    logger.info(`创建AI文件夹 - 项目ID: ${projectId}`);
    const newFolder = await createFolder({
      projectId,
      name: 'AI生成',
      description: '由AI助手自动创建的测试用例',
      createdBy
    });

    logger.info(`AI文件夹创建成功: ${newFolder.id} - ${newFolder.name}`);
    return newFolder.id;
  } catch (error) {
    logger.error(`获取或创建AI文件夹失败: ${error instanceof Error ? error.message : String(error)}`);
    // 如果创建失败，返回null，让测试用例不挂载到任何文件夹
    return null;
  }
}

export const testCaseDocumentHandler = createDocumentHandler<TestCaseArtifactType>({
  kind: TEST_CASE_ARTIFACT,
  
  onCreateDocument: async ({ title, dataStream, id, chatId, session, projectId }) => {
    logger.info(`开始创建测试用例文档，ID: ${id}, 标题: ${title}, 聊天ID: ${chatId || '无'}`);

    try {
      // AI SDK V5: 发送必要的初始化消息
      dataStream.write({
        type: 'data-id',
        data: id,
        transient: true,
      });

      dataStream.write({
        type: 'data-kind',
        data: TEST_CASE_ARTIFACT,
        transient: true,
      });

      dataStream.write({
        type: 'data-title',
        data: title,
        transient: true,
      });

      // AI SDK V5: 发送初始加载状态
      dataStream.write({
        type: 'data-test-case-delta',
        data: {
          status: 'loading',
          message: '正在创建测试用例...'
        },
        transient: true,
      });

      // 实际创建测试用例
      logger.info(`开始创建测试用例: ${title}`);

      // 使用默认项目ID
      const projectId = getCurrentProjectIdOrDefault();
      const createdBy = session.user?.email || 'AI助手';

      // 获取或创建AI文件夹
      const aiFolderId = await getOrCreateAIFolder(projectId, createdBy);

      // 创建测试用例
      const newTestCase = await createTestCase({
        projectId,
        folderId: aiFolderId, // 挂载到AI文件夹
        name: title,
        description: `通过AI助手创建的测试用例: ${title}`,
        priority: 'medium',
        status: 'draft',
        weight: 'medium',
        format: 'classic',
        nature: 'functional',
        type: 'regression',
        tags: JSON.stringify(['AI生成']), // 确保tags是JSON字符串格式
        createdBy
      });

      logger.info(`测试用例创建成功 - ID: ${newTestCase.id}, 名称: ${newTestCase.name}`);

      // AI SDK V5: 发送测试用例数据
      dataStream.write({
        type: 'data-test-case-delta',
        data: {
          testCaseId: newTestCase.id,
          testCase: newTestCase,
          status: 'created'
        },
        transient: true,
      });

      // 构建文档内容
      const draftContent = JSON.stringify({
        testCaseId: newTestCase.id,
        testCase: newTestCase,
        status: 'created'
      });

      logger.info(`测试用例文档创建完成: ${id}`);

      return {
        content: draftContent,
        testCaseId: newTestCase.id,
        testCase: newTestCase
      };
      
    } catch (error) {
      logger.error(`创建测试用例文档失败: ${error instanceof Error ? error.message : String(error)}`);

      // AI SDK V5: 发送错误信息
      dataStream.write({
        type: 'data-test-case-delta',
        data: {
          status: 'error',
          message: `创建测试用例文档失败: ${error instanceof Error ? error.message : String(error)}`
        },
        transient: true,
      });

      dataStream.write({
        type: 'data-finish',
        data: null,
        transient: false,
      });

      const errorContent = JSON.stringify({
        status: 'error',
        message: `创建测试用例文档失败: ${error instanceof Error ? error.message : String(error)}`
      });

      return {
        content: errorContent,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },
  
  onUpdateDocument: async ({ document, description, dataStream, session }) => {
    logger.info(`更新测试用例文档: ${document.id}, 标题: ${document.title}`);
    
    try {
      // 解析内容获取测试用例ID
      let testCaseId = '';
      try {
        const contentObj = JSON.parse(document.content);
        testCaseId = contentObj.testCaseId || '';
      } catch (parseError) {
        logger.warn(`解析文档内容失败: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
      
      if (testCaseId) {
        // 重新获取最新的测试用例数据
        const testCase = await getCompleteTestCase(testCaseId);
        
        if (testCase) {
          // AI SDK V5: 发送更新的数据
          dataStream.write({
            type: 'data-test-case-delta',
            data: {
              testCaseId: testCase.id,
              testCase,
              status: 'updated'
            },
            transient: true,
          });
          
          const updatedContent = JSON.stringify({
            testCaseId: testCase.id,
            testCase,
            status: 'updated'
          });
          
          logger.info(`测试用例文档更新完成: ${document.id}`);
          return updatedContent;
        }
      }

      logger.warn(`无法更新测试用例文档，测试用例ID无效: ${testCaseId}`);
      return document.content; // 返回原内容

    } catch (error) {
      logger.error(`更新测试用例文档失败: ${error instanceof Error ? error.message : String(error)}`);
      return document.content; // 返回原内容
    }
  },
});
