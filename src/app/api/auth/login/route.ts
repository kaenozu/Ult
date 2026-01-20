import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

interface LoginRequest {
  email: string;
  password: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export async function POST(request: NextRequest) {
  try {
    const { email, password }: LoginRequest = await request.json();

    // 本番環境ではデータベースからユーザー情報を取得
    // 開発環境用のモックユーザーデータ
    const mockUsers: User[] = [
      {
        id: '1',
        email: 'admin@ult.com',
        name: 'Admin User',
        role: 'admin',
      },
      {
        id: '2',
        email: 'user@ult.com',
        name: 'Demo User',
        role: 'user',
      },
    ];

    // ユーザー検索
    const user = mockUsers.find(u => u.email === email);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // パスワード検証
    // 本番ではデータベースのハッシュ値と比較
    // 開発用の簡易な検証
    const isValidPassword = password === 'admin123' || password === 'user123';

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // JWTトークン生成
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '1h' }
    );

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
