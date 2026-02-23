import { NextRequest, NextResponse } from 'next/server';
import { getAutomationConfig, getAllAutomationConfigs, createOrUpdateAutomationConfig, deleteAutomationConfig } from '@/lib/db/queries';
import { dbLogger } from '@/lib/logger';

const logger = dbLogger.child('automation-config-api');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testCaseId = searchParams.get('testCaseId');
    const framework = searchParams.get('framework');

    if (!testCaseId) {
      return NextResponse.json(
        { error: 'testCaseId parameter is required' },
        { status: 400 }
      );
    }

    logger.info(`获取自动化配置: testCaseId=${testCaseId}, framework=${framework}`);

    if (framework) {
      // 获取特定框架的配置
      const config = await getAutomationConfig(testCaseId, framework);

      if (!config) {
        return NextResponse.json(
          { error: 'Automation config not found' },
          { status: 404 }
        );
      }

      // 解析JSON字段
      const formattedConfig = {
        ...config,
        commands: typeof config.commands === 'string' ? JSON.parse(config.commands) : config.commands,
        parameters: typeof config.parameters === 'string' ? JSON.parse(config.parameters) : config.parameters,
        environmentVariables: typeof config.environmentVariables === 'string' ? JSON.parse(config.environmentVariables) : (config.environmentVariables || {}),
      };

      return NextResponse.json(formattedConfig);
    } else {
      // 获取所有框架的配置
      const configs = await getAllAutomationConfigs(testCaseId);

      const formattedConfigs: Record<string, any> = {};

      configs.forEach(config => {
        formattedConfigs[config.framework] = {
          ...config,
          commands: typeof config.commands === 'string' ? JSON.parse(config.commands) : config.commands,
          parameters: typeof config.parameters === 'string' ? JSON.parse(config.parameters) : config.parameters,
          environmentVariables: typeof config.environmentVariables === 'string' ? JSON.parse(config.environmentVariables) : (config.environmentVariables || {}),
        };
      });

      return NextResponse.json(formattedConfigs);
    }
  } catch (error) {
    logger.error(`获取自动化配置失败: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: 'Failed to get automation config' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testCaseId, ...configData } = body;

    if (!testCaseId) {
      return NextResponse.json(
        { error: 'testCaseId is required' },
        { status: 400 }
      );
    }

    logger.info(`创建/更新自动化配置: testCaseId=${testCaseId}`);

    await createOrUpdateAutomationConfig(testCaseId, configData);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(`创建/更新自动化配置失败: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: 'Failed to create/update automation config' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  return POST(request); // 复用POST逻辑
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { testCaseId, framework } = body;

    if (!testCaseId || !framework) {
      return NextResponse.json(
        { error: 'testCaseId and framework are required' },
        { status: 400 }
      );
    }

    logger.info(`删除自动化配置: testCaseId=${testCaseId}, framework=${framework}`);

    await deleteAutomationConfig(testCaseId, framework);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(`删除自动化配置失败: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: 'Failed to delete automation config' },
      { status: 500 }
    );
  }
}
