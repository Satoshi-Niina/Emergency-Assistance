# Emergency Assistance Shared Library

このライブラリは、Emergency Assistance Systemの共有コンポーネント、型定義、バリデーションスキーマ、ユーティリティ関数を提供します。

## 構造

```
shared/
├── src/
│   ├── schema.ts      # データベーススキーマ定義
│   ├── types.ts       # TypeScript型定義
│   ├── validation.ts  # Zodバリデーションスキーマ
│   ├── utils.ts       # 共通ユーティリティ関数
│   └── index.ts       # メインエントリーポイント
├── dist/              # ビルド出力
├── package.json       # パッケージ設定
├── tsconfig.json      # TypeScript設定
└── README.md          # このファイル
```

## インストール

```bash
# 共有ライブラリのビルド
npm run build:shared

# または、共有ライブラリディレクトリで直接ビルド
cd shared && npm run build
```

## 使用方法

### 基本的なインポート

```typescript
// 全てのエクスポートをインポート
import * as Shared from '@emergency-assistance/shared';

// 特定のモジュールをインポート
import { schema } from '@emergency-assistance/shared/schema';
import { types } from '@emergency-assistance/shared/types';
import { validation } from '@emergency-assistance/shared/validation';
import { utils } from '@emergency-assistance/shared/utils';
```

### データベーススキーマ

```typescript
import { users, chats, messages, emergencyFlows } from '@emergency-assistance/shared/schema';

// スキーマの使用例
const userTable = users;
const chatTable = chats;
```

### 型定義

```typescript
import type { User, Chat, Message, EmergencyFlow } from '@emergency-assistance/shared/types';

// 型の使用例
const user: User = {
  id: 'user-123',
  username: 'john_doe',
  display_name: 'John Doe',
  role: 'employee',
  created_at: new Date()
};
```

### バリデーション

```typescript
import { loginSchema, insertUserSchema } from '@emergency-assistance/shared/validation';

// バリデーションの使用例
const loginData = loginSchema.parse({
  username: 'john_doe',
  password: 'password123'
});
```

### ユーティリティ関数

```typescript
import { 
  formatDate, 
  generateUUID, 
  createSuccessResponse,
  validatePasswordStrength 
} from '@emergency-assistance/shared/utils';

// ユーティリティ関数の使用例
const formattedDate = formatDate(new Date(), 'long');
const uuid = generateUUID();
const response = createSuccessResponse({ message: 'Success' });
const passwordCheck = validatePasswordStrength('MyPassword123!');
```

## 後方互換性

既存のコードとの互換性を保つため、以下のインポートパスも引き続きサポートされています：

```typescript
// 既存のインポートパス（後方互換性）
import { schema, users, messages } from '../shared/schema';
```

## 開発

### ビルド

```bash
npm run build
```

### 開発モード（ウォッチ）

```bash
npm run dev
```

### クリーンアップ

```bash
npm run clean
```

## エクスポート

### スキーマ (`./schema`)

- `users` - ユーザーテーブル
- `chats` - チャットテーブル
- `messages` - メッセージテーブル
- `media` - メディアテーブル
- `emergencyFlows` - 緊急フローテーブル
- `images` - 画像テーブル
- `documents` - ドキュメントテーブル
- `keywords` - キーワードテーブル
- `chatExports` - チャットエクスポートテーブル
- `schema` - 全スキーマの統合オブジェクト

### 型定義 (`./types`)

- `User`, `InsertUser` - ユーザー関連の型
- `Chat`, `InsertChat` - チャット関連の型
- `Message`, `InsertMessage` - メッセージ関連の型
- `EmergencyFlow`, `InsertEmergencyFlow` - 緊急フロー関連の型
- `ChatMessage` - 統一されたチャットメッセージ型
- `ApiResponse<T>` - APIレスポンス型
- `SearchResult<T>` - 検索結果型
- `SystemConfig` - システム設定型

### バリデーション (`./validation`)

- `loginSchema` - ログインバリデーション
- `insertUserSchema` - ユーザー作成バリデーション
- `insertMessageSchema` - メッセージ作成バリデーション
- `insertEmergencyFlowSchema` - 緊急フロー作成バリデーション
- その他のバリデーションスキーマ

### ユーティリティ (`./utils`)

- `formatDate()` - 日付フォーマット
- `generateUUID()` - UUID生成
- `createSuccessResponse()` - 成功レスポンス作成
- `createErrorResponse()` - エラーレスポンス作成
- `validatePasswordStrength()` - パスワード強度チェック
- `formatFileSize()` - ファイルサイズフォーマット
- `debounce()` - デバウンス関数
- `throttle()` - スロットル関数
- その他のユーティリティ関数

## 注意事項

1. **後方互換性**: 既存のコードに影響を与えないよう、既存のインポートパスは引き続きサポートされています。

2. **型安全性**: 全ての型定義は厳密に定義されており、TypeScriptの型チェックを活用できます。

3. **バリデーション**: Zodを使用した堅牢なバリデーションスキーマを提供しています。

4. **パフォーマンス**: ユーティリティ関数は最適化されており、本番環境での使用に適しています。

## ライセンス

MIT License 