import { NextRequest, NextResponse } from 'next/server';
import { getAutomationConfigById, updateAutomationConfigById } from '@/lib/db/queries';
import { dbLogger } from '@/lib/logger';

const logger = dbLogger.child('automation-config-id-api');

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Configuration ID is required' },
        { status: 400 }
      );
    }

    logger.info(`获取自动化配置: id=${id}`);

    const config = await getAutomationConfigById(id);

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
  } catch (error) {
    logger.error(`获取自动化配置失败: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: 'Failed to get automation config' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Configuration ID is required' },
        { status: 400 }
      );
    }

    logger.info(`更新自动化配置: id=${id}`);

    // 检查配置是否存在
    const existingConfig = await getAutomationConfigById(id);
    if (!existingConfig) {
      return NextResponse.json(
        { error: 'Automation config not found' },
        { status: 404 }
      );
    }

    // 只有midscene框架才支持YAML配置
    if (body.yamlContent && existingConfig.framework === 'midscene') {
      // 获取现有的parameters
      const existingParams = existingConfig.parameters ?
        (typeof existingConfig.parameters === 'string' ?
          JSON.parse(existingConfig.parameters) : existingConfig.parameters) : {};

      // 将YAML内容保存到parameters.yaml字段
      body.parameters = {
        ...existingParams,
        yaml: body.yamlContent
      };

      // 移除yamlContent，避免数据库错误
      delete body.yamlContent;
    } else if (body.yamlContent && existingConfig.framework !== 'midscene') {
      // 如果不是midscene框架但提供了YAML内容，返回错误
      return NextResponse.json(
        { error: 'YAML configuration is only supported for midscene framework' },
        { status: 400 }
      );
    }

    // 更新配置
    await updateAutomationConfigById(id, body);

    return NextResponse.json({ 
      success: true,
      message: 'Configuration updated successfully'
    });
  } catch (error) {
    logger.error(`更新自动化配置失败: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: 'Failed to update automation config' },
      { status: 500 }
    );
  }
}
