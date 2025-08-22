import { z } from "zod";

export type User = {
  id: string;
  username: string;
  displayName: string;
  role: "employee" | "admin";
  department?: string;
};

// ログインスキーマ�E定義
export const loginSchema = z.object({
  username: z.string().min(1, "ユーザー名を入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});

// 他�Eスキーマや型定義があれ�Eここに追加
