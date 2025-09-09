// 手動型: schema.ts の users テーブル構造に合わせる
export interface User {
	id: string;
	username: string;
	password: string;
	displayName: string;
	role: string; // system_admin | operator | user | (レガシー) admin/employee
	department: string | null;
	description: string | null;
	created_at: Date | string; // drizzle 返却時は Date
}

export type NewUser = Omit<User, 'id' | 'created_at'> & { id?: string; created_at?: Date | string };
