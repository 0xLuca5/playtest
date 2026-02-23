import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth/auth.config';
import { db } from '@/lib/db';
import { dataset } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createOrUpdateTestCaseDataset } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await getServerSession(authConfig);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const testCaseId = searchParams.get('testCaseId');

    // 验证必需参数
    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required parameter: projectId' },
        { status: 400 }
      );
    }

    if (!testCaseId) {
      return NextResponse.json(
        { error: 'Missing required parameter: testCaseId' },
        { status: 400 }
      );
    }

    console.log(`[API] Getting datasets for testCase: ${testCaseId}, project: ${projectId}`);

    // 获取测试用例的数据集
    const datasets = await db
      .select()
      .from(dataset)
      .where(eq(dataset.testCaseId, testCaseId));

    // 处理数据集，解析JSON字段
    const processedDatasets = datasets.map((ds: any) => ({
      id: ds.id,
      name: ds.name,
      description: ds.description,
      columns: typeof ds.columns === 'string' ? JSON.parse(ds.columns) : ds.columns,
      data: typeof ds.data === 'string' ? JSON.parse(ds.data) : ds.data,
      isActive: ds.isActive,
      createdAt: ds.createdAt,
      updatedAt: ds.updatedAt,
    }));

    console.log(`[API] Found ${processedDatasets.length} datasets for testCase: ${testCaseId}`);

    return NextResponse.json({
      success: true,
      datasets: processedDatasets,
      testCaseId,
      projectId
    });

  } catch (error) {
    console.error('[API] Error getting test case datasets:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get test case datasets',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { testCaseId, name, description, type, configuration, columns, data } = body;

    // Validate required fields
    if (!testCaseId || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: testCaseId, name' },
        { status: 400 }
      );
    }

    console.log(`[API] Creating dataset for testCase: ${testCaseId}`);

    // Create new dataset directly in database
    const timestamp = Date.now();
    const id = crypto.randomUUID();
    
    await db.insert(dataset).values({
      id,
      testCaseId,
      name: name.trim(),
      description: description?.trim() || null,
      type: type || 'csv',
      configuration: configuration ? JSON.stringify(configuration) : null,
      columns: JSON.stringify(columns || []),
      data: JSON.stringify(data || []),
      isActive: process.env.DB_PROVIDER === 'sqlite' ? 1 : true,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    console.log(`[API] Dataset created successfully`);

    return NextResponse.json({
      success: true,
      message: 'Dataset created successfully'
    });

  } catch (error) {
    console.error('[API] Error creating dataset:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create dataset',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, name, description, type, configuration, columns, data } = body;

    if (!id || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: id, name' },
        { status: 400 }
      );
    }

    console.log(`[API] Updating dataset: ${id}`);

    // Get existing dataset
    const existing = await db
      .select()
      .from(dataset)
      .where(eq(dataset.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      );
    }

    // Update dataset directly in database
    const updateData: any = {
      name: name.trim(),
      description: description?.trim() || null,
      type: type || existing[0].type,
      configuration: configuration ? JSON.stringify(configuration) : existing[0].configuration,
      updatedAt: Date.now(),
    };

    // Only update columns and data if provided
    if (columns !== undefined) {
      updateData.columns = JSON.stringify(columns);
    }
    if (data !== undefined) {
      updateData.data = JSON.stringify(data);
    }

    await db
      .update(dataset)
      .set(updateData)
      .where(eq(dataset.id, id));

    console.log(`[API] Dataset updated successfully: ${id}`);

    return NextResponse.json({
      success: true,
      message: 'Dataset updated successfully'
    });

  } catch (error) {
    console.error('[API] Error updating dataset:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update dataset',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    console.log(`[API] Deleting dataset: ${id}`);

    // Delete dataset
    const deletedDataset = await db
      .delete(dataset)
      .where(eq(dataset.id, id))
      .returning();

    if (deletedDataset.length === 0) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      );
    }

    console.log(`[API] Dataset deleted successfully: ${id}`);

    return NextResponse.json({
      success: true,
      message: 'Dataset deleted successfully'
    });

  } catch (error) {
    console.error('[API] Error deleting dataset:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete dataset',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
