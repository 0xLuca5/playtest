import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcrypt-ts';
import { getUser } from '@/lib/db/queries';
import { DUMMY_PASSWORD } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // 验证输入
    if (!email || !password) {
      return NextResponse.json(
        { 
          error: 'Missing credentials',
          message: 'Email and password are required'
        },
        { status: 400 }
      );
    }

    // 验证邮箱格式
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { 
          error: 'Invalid email format',
          message: 'Please enter a valid email address'
        },
        { status: 400 }
      );
    }

    // 查询用户
    const users = await getUser(email);

    if (users.length === 0) {
      // 防止时序攻击，即使用户不存在也要执行密码比较
      await compare(password, DUMMY_PASSWORD);
      return NextResponse.json(
        { 
          error: 'Invalid credentials',
          message: 'Invalid email or password'
        },
        { status: 401 }
      );
    }

    const [user] = users;

    if (!user.password) {
      await compare(password, DUMMY_PASSWORD);
      return NextResponse.json(
        { 
          error: 'Account not activated',
          message: 'Account password not set. Please contact administrator.'
        },
        { status: 401 }
      );
    }

    // 验证密码
    const passwordsMatch = await compare(password, user.password);

    if (!passwordsMatch) {
      return NextResponse.json(
        { 
          error: 'Invalid credentials',
          message: 'Invalid email or password'
        },
        { status: 401 }
      );
    }

    // 登录成功
    return NextResponse.json(
      { 
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again later.'
      },
      { status: 500 }
    );
  }
}
