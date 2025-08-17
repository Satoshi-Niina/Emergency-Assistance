# 本番デプロイ用インポート修正ガイド

## 必要な修正箇所

### 1. Server 側の修正

```typescript
// 修正前
import { schema } from "../shared/schema.js";
import {
  insertMessageSchema,
  insertMediaSchema,
  insertChatSchema,
  messages,
} from "../../shared/schema.js";

// 修正後
import {
  schema,
  insertMessageSchema,
  insertMediaSchema,
  insertChatSchema,
  messages,
} from "@emergency-assistance/shared";
```

### 2. Client 側の修正

```typescript
// 修正前
import { LoginCredentials } from "@shared/schema";
import { Message } from "@shared/schema";

// 修正後
import { LoginCredentials, Message } from "@emergency-assistance/shared";
```

### 3. package.json 修正

shared パッケージを適切に参照するよう修正:

```json
{
  "dependencies": {
    "@emergency-assistance/shared": "file:../shared"
  }
}
```

### 4. tsconfig.json 修正

```json
{
  "compilerOptions": {
    "paths": {
      "@emergency-assistance/shared/*": ["../shared/src/*"],
      "@emergency-assistance/shared": ["../shared/src/index"]
    }
  }
}
```

### 5. Vite.config.ts 修正（Client）

```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
    '@emergency-assistance/shared': path.resolve(__dirname, '../shared/src'),
  }
}
```

## クラウドデプロイ時の対応

### 本番環境では以下が推奨:

1. **shared パッケージの事前ビルド**
2. **Docker コンテナ化時の COPY コマンド調整**
3. **環境変数による API エンドポイント設定**
