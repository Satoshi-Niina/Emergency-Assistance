
import { Router } from 'express';
import { users } from '@shared/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';

const router = Router();

// ✅ ユーザー一覧取得
router.get('/', async (req, res) => {
  try {
    // select()の代わりに明示的にカラムを指定して取得
    const allUsers = await db.query.users.findMany({
      columns: {
        id: true,
        username: true,
        display_name: true,
        role: true,
        department: true
      }
    });
    
    res.json(allUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ✅ ユーザー更新
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params; // IDはstringとして扱う
    const { username, display_name, role, department, password } = req.body;

    console.log(`ユーザー更新リクエスト: ID=${id}`, { username, display_name, role, department, hasPassword: !!password });

    // バリデーション
    if (!username || !display_name) {
      return res.status(400).json({ message: "ユーザー名と表示名は必須です" });
    }

    // 全ユーザーを取得してデバッグ
    const allUsers = await db.query.users.findMany();
    console.log(`全ユーザー一覧:`, allUsers.map(u => ({ id: u.id, username: u.username })));

    // ユーザー存在確認
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, id)
    });

    console.log(`検索結果: existingUser=`, existingUser);

    if (!existingUser) {
      console.log(`ユーザーが見つかりません: ID=${id}`);
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    }

    // 更新データを準備
    const updateData: any = {
      username,
      display_name,
      role,
      department
    };

    // パスワードが提供され、かつ空文字でない場合のみ更新
    if (password && typeof password === 'string' && password.trim() !== '') {
      const bcrypt = require('bcrypt');
      updateData.password = await bcrypt.hash(password, 10);
      console.log(`パスワードも更新します: ID=${id}`);
    } else {
      console.log(`パスワードは未記入のため、現在のパスワードを維持します: ID=${id}`);
    }

    // ユーザー更新
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        username: users.username,
        display_name: users.display_name,
        role: users.role,
        department: users.department
      });

    console.log(`ユーザー更新成功: ID=${id}`);
    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ message: "ユーザー更新中にエラーが発生しました" });
  }
});

// ✅ ユーザー削除
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params; // IDはstringとして扱う

    console.log(`ユーザー削除リクエスト: ID=${id}`);

    // ユーザー存在確認
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, id)
    });

    if (!existingUser) {
      console.log(`削除対象ユーザーが見つかりません: ID=${id}`);
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    }

    // ユーザー削除
    await db.delete(users).where(eq(users.id, id));

    console.log(`ユーザー削除成功: ID=${id}`);
    res.json({ message: "ユーザーが削除されました" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({ message: "ユーザー削除中にエラーが発生しました" });
  }
});

export const usersRouter = router;
