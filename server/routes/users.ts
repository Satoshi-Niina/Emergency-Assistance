
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
    const { id } = req.params;
    const { username, display_name, role, department } = req.body;

    // バリデーション
    if (!username || !display_name) {
      return res.status(400).json({ message: "ユーザー名と表示名は必須です" });
    }

    // ユーザー存在確認
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, id)
    });

    if (!existingUser) {
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    }

    // ユーザー更新
    const [updatedUser] = await db
      .update(users)
      .set({
        username,
        display_name,
        role,
        department
      })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        username: users.username,
        display_name: users.display_name,
        role: users.role,
        department: users.department
      });

    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ message: "ユーザー更新中にエラーが発生しました" });
  }
});

// ✅ ユーザー削除
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // ユーザー存在確認
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, id)
    });

    if (!existingUser) {
      return res.status(404).json({ message: "ユーザーが見つかりません" });
    }

    // ユーザー削除
    await db.delete(users).where(eq(users.id, id));

    res.json({ message: "ユーザーが削除されました" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({ message: "ユーザー削除中にエラーが発生しました" });
  }
});

export const usersRouter = router;
