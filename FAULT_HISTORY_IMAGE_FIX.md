# 故障履歴管理UI - 画像表示・編集・印刷機能実装

## 概要
故障履歴管理UIで画像が表示されない問題を修正し、編集UI・印刷プレビュー機能を実装しました。

## 実装日
2025年11月20日

## 実装内容

### 1. 履歴一覧表への画像列追加

**ファイル**: `client/src/components/fault-history/fault-history-manager.tsx`

#### 変更点
- 各履歴カードに画像プレビュー（最大3枚）を表示
- 画像が3枚以上ある場合は「+N」で残り枚数を表示
- 画像読み込みエラー時はプレースホルダーSVGを表示
- グリッドレイアウトで整理された表示

#### 表示例
```tsx
{item.images && item.images.length > 0 && (
  <div className="grid grid-cols-3 gap-2 mb-2">
    {item.images.slice(0, 3).map((image) => (
      <div key={image.id} className="relative aspect-square">
        <img
          src={getFaultHistoryImageUrl(image.fileName)}
          alt={image.description || image.originalFileName}
          className="w-full h-full object-cover rounded border"
          onError={(e) => {
            // プレースホルダー画像を表示
          }}
        />
      </div>
    ))}
  </div>
)}
```

### 2. 編集UI実装

**ファイル**: `client/src/pages/fault-history.tsx`

#### 新規コンポーネント
- `HistoryDetailView`: 選択された履歴の詳細表示・編集コンポーネント

#### 機能
- **編集可能フィールド**:
  - タイトル
  - 説明
  - 機種
  - 機械番号
  - 事業所
  - カテゴリ

- **編集モード切り替え**:
  - 編集ボタンで編集モードに切り替え
  - 保存・キャンセルボタン
  - リアルタイムプレビュー

- **画像一覧表示**:
  - 関連画像をグリッドで表示
  - 画像ホバー時のシャドウエフェクト
  - 画像の説明文表示

### 3. 印刷プレビュー実装

**ファイル**: `client/src/pages/fault-history.tsx`

#### 機能
- 印刷ボタンで新しいウィンドウを開き、フォーマットされた印刷用HTMLを生成
- A4サイズに最適化されたレイアウト

#### 印刷内容
1. **基本情報セクション**
   - タイトル
   - 説明
   - 機種、機械番号、事業所、カテゴリ

2. **キーワードセクション**
   - タグ形式で表示

3. **画像セクション**
   - 2列グリッドレイアウト
   - 各画像に説明文付き

4. **メタデータセクション**
   - ID、保存モード、作成日時、更新日時

5. **JSONデータセクション**
   - 元のJSONデータを整形表示

#### CSSスタイリング
- プリント用メディアクエリ対応
- Yu Gothic、Meiryoフォント使用
- カラースキーム: ブルー系統
- レスポンシブグリッドレイアウト

### 4. サーバーサイド修正

#### `server/routes/fault-history.ts`

**画像配信エンドポイント修正**:
```typescript
// ファイル名バリデーション修正（大文字小文字を区別しない）
if (!filename || !filename.match(/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|gif|webp)$/i)) {
  return res.status(400).json({
    success: false,
    error: '無効なファイル名です',
  });
}
```

**デバッグログ追加**:
```typescript
console.log(`📷 画像リクエスト: ${filename}`);
console.log(`📁 画像ディレクトリ: ${imagesDir}`);
console.log(`📄 画像パス: ${filePath}`);
console.log(`✅ ファイル存在: ${fs.existsSync(filePath)}`);
```

#### `server/services/fault-history-service.ts`

**画像情報抽出の改善**:
```typescript
// 複数のソースから画像情報を抽出
const savedImagesArray = data.savedImages || data.jsonData?.savedImages || [];
```

**デバッグログ追加**:
```typescript
console.log(`📷 [${file}] 画像配列取得:`, savedImagesArray?.length || 0, '件');
console.log(`  📄 [${imageFileName}] 存在: ${exists}`);
console.log(`📷 [${file}] 最終的な画像数:`, images.length, '件');
```

### 5. 環境変数による自動切替

#### クライアント側（`client/src/lib/api/fault-history-api.ts`）
```typescript
export const getFaultHistoryImageUrl = (filename: string): string => {
  const baseUrl = import.meta.env.DEV
    ? 'http://localhost:8080'
    : import.meta.env.VITE_API_BASE_URL || window.location.origin;

  return `${baseUrl}/api/fault-history/images/${filename}`;
};
```

#### サーバー側（`server/routes/fault-history.ts`）
```typescript
const imagesDir = process.env.FAULT_HISTORY_IMAGES_DIR ||
  path.join(process.cwd(), 'knowledge-base', 'images', 'chat-exports');
```

#### 環境別設定

**ローカル開発環境**:
- 画像URL: `http://localhost:8080/api/fault-history/images/{filename}`
- 画像ディレクトリ: `knowledge-base/images/chat-exports`
- Viteプロキシ経由でAPIアクセス

**本番環境**:
- 画像URL: `${VITE_API_BASE_URL}/api/fault-history/images/{filename}`
- 画像ディレクトリ: `${FAULT_HISTORY_IMAGES_DIR}`
- Azure App ServiceまたはDocker環境変数で設定

## 環境変数一覧

### クライアント（Vite）
| 変数名 | 用途 | ローカル | 本番 |
|--------|------|----------|------|
| `VITE_API_BASE_URL` | APIベースURL | 不要（プロキシ使用） | Azure App ServiceのURL |

### サーバー（Node.js）
| 変数名 | 用途 | ローカル | 本番 |
|--------|------|----------|------|
| `FAULT_HISTORY_IMAGES_DIR` | 画像保存ディレクトリ | デフォルト値使用 | `/app/knowledge-base/images/chat-exports` |

## デプロイ手順

### 1. Azure App Serviceへの環境変数設定

```bash
# Azure CLIでの設定例
az webapp config appsettings set \
  --resource-group <リソースグループ名> \
  --name <アプリ名> \
  --settings \
    FAULT_HISTORY_IMAGES_DIR=/app/knowledge-base/images/chat-exports
```

### 2. Docker環境での設定

**docker-compose.yml**:
```yaml
services:
  server:
    environment:
      FAULT_HISTORY_IMAGES_DIR: /app/knowledge-base/images/chat-exports
    volumes:
      - ./knowledge-base:/app/knowledge-base
```

### 3. GitHub Actions設定

**.github/workflows/deploy-server-docker-container.yml**:
```yaml
- name: Configure App Settings
  run: |
    az webapp config appsettings set \
      --name ${{ secrets.AZURE_APP_SERVICE_NAME }} \
      --resource-group ${{ secrets.AZURE_RESOURCE_GROUP }} \
      --settings \
        FAULT_HISTORY_IMAGES_DIR=/app/knowledge-base/images/chat-exports
```

## テスト方法

### 1. ローカル環境でのテスト

```bash
# サーバー起動
cd server
npm run dev

# 別のターミナルでクライアント起動
cd client
npm run dev

# ブラウザで確認
# http://localhost:5173
# 「履歴管理」タブを開く
```

### 2. 画像表示の確認

1. 履歴一覧で画像プレビューが表示されることを確認
2. 詳細表示で画像が正しく表示されることを確認
3. ブラウザの開発者ツールで画像URLを確認:
   - ローカル: `http://localhost:8080/api/fault-history/images/{filename}`
   - 本番: `https://{app-name}.azurewebsites.net/api/fault-history/images/{filename}`

### 3. 編集機能のテスト

1. 履歴を選択して「選択中の履歴」タブを開く
2. 「編集」ボタンをクリック
3. 各フィールドを編集
4. 「保存」または「キャンセル」ボタンの動作確認

### 4. 印刷プレビューのテスト

1. 履歴を選択して「選択中の履歴」タブを開く
2. 「印刷」ボタンをクリック
3. 新しいウィンドウで印刷プレビューが表示されることを確認
4. ブラウザの印刷機能で実際に印刷できることを確認

## トラブルシューティング

### 画像が表示されない場合

1. **サーバーログを確認**:
   ```
   📷 画像リクエスト: {filename}
   📁 画像ディレクトリ: {path}
   📄 画像パス: {full_path}
   ✅ ファイル存在: true/false
   ```

2. **画像ファイルの存在確認**:
   ```bash
   # ローカル
   ls -la knowledge-base/images/chat-exports/

   # Docker
   docker exec <container_id> ls -la /app/knowledge-base/images/chat-exports/
   ```

3. **環境変数の確認**:
   ```bash
   # ローカル
   echo $FAULT_HISTORY_IMAGES_DIR

   # Azure
   az webapp config appsettings list \
     --name <app_name> \
     --resource-group <resource_group>
   ```

4. **ブラウザコンソールで画像URL確認**:
   - F12で開発者ツールを開く
   - Networkタブで画像リクエストを確認
   - 404エラーの場合はURLが正しいか確認

### 編集が保存されない場合

現在、保存機能は実装中です。以下のコメントを確認してください:
```typescript
// TODO: 保存API実装
alert('保存機能は実装中です');
```

## 今後の実装予定

1. **編集保存API実装**
   - PUT /api/fault-history/:id エンドポイント作成
   - 変更差分の保存
   - 履歴のバージョン管理

2. **画像アップロード機能**
   - 編集画面から画像を追加
   - ドラッグ&ドロップ対応
   - 画像のリサイズ・最適化

3. **画像削除機能**
   - 画像の個別削除
   - 確認ダイアログ
   - 物理ファイルの削除

4. **印刷テンプレートのカスタマイズ**
   - 印刷レイアウトの選択
   - ロゴの追加
   - ヘッダー・フッターのカスタマイズ

## 関連ファイル

### クライアント側
- `client/src/components/fault-history/fault-history-manager.tsx`
- `client/src/pages/fault-history.tsx`
- `client/src/lib/api/fault-history-api.ts`
- `client/vite.config.js`

### サーバー側
- `server/routes/fault-history.ts`
- `server/services/fault-history-service.ts`

### 設定ファイル
- `docker-compose.yml`
- `docker-compose.dev.yml`
- `.github/workflows/deploy-server-docker-container.yml`

## 参考資料

- [Vite環境変数](https://vitejs.dev/guide/env-and-mode.html)
- [Azure App Service環境変数](https://docs.microsoft.com/en-us/azure/app-service/configure-common)
- [Docker環境変数](https://docs.docker.com/compose/environment-variables/)
