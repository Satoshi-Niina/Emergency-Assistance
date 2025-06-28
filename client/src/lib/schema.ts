// client/src/lib/schema.ts
import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "ユーザー名は必須です"),
  password: z.string().min(1, "パスワードは必須です"),
});
