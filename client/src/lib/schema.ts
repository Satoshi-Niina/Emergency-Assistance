import { z } from "zod";

export type User = {
  id: string;
  username: string;
  displayName: string;
  role: "employee" | "admin";
  department?: string;
};

// 繝ｭ繧ｰ繧､繝ｳ繧ｹ繧ｭ繝ｼ繝槭・螳夂ｾｩ
export const loginSchema = z.object({
  username: z.string().min(1, "繝ｦ繝ｼ繧ｶ繝ｼ蜷阪ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞"),
  password: z.string().min(1, "繝代せ繝ｯ繝ｼ繝峨ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞"),
});

// 莉悶・繧ｹ繧ｭ繝ｼ繝槭ｄ蝙句ｮ夂ｾｩ縺後≠繧後・縺薙％縺ｫ霑ｽ蜉



