import { NextRequest, NextResponse } from 'next/server';
import { getProjects, createProject } from '@/lib/db/queries';
import { auth } from '@/app/auth/auth';

export async function GET() {
  try {
    // TODO: Re-enable auth when auth issues are resolved
    // const session = await auth();
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const projects = await getProjects();
    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // TODO: Re-enable auth when auth issues are resolved
    // const session = await auth();
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const body = await request.json();
    const { name, description, key, status, color, avatar, settings } = body;

    if (!name || !key) {
      return NextResponse.json(
        { error: 'Name and key are required' },
        { status: 400 }
      );
    }

    const project = await createProject({
      name,
      description,
      key,
      status,
      color,
      avatar,
      settings,
      createdBy: 'system', // TODO: Use session.user.id when auth is fixed
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
