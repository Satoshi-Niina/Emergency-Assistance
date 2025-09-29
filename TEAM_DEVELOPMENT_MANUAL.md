# チーム開発マニュアル

## 📋 目次
1. [プロジェクト概要](#プロジェクト概要)
2. [開発環境セットアップ](#開発環境セットアップ)
3. [開発フロー](#開発フロー)
4. [デプロイメント](#デプロイメント)
5. [トラブルシューティング](#トラブルシューティング)
6. [重要な注意事項](#重要な注意事項)

## 🚀 プロジェクト概要

### アーキテクチャ
- **フロントエンド**: React + TypeScript + Vite
- **バックエンド**: Node.js + Express
- **デプロイ先**: Azure Static Web Apps (フロントエンド) + Azure Web App (バックエンド)
- **CI/CD**: GitHub Actions

### リポジトリ構造
```
Emergency-Assistance/
├── client/                 # フロントエンド
│   ├── src/               # ソースコード
│   ├── dist/              # ビルド出力
│   └── vite.config.ts     # Vite設定
├── server/                # バックエンド
├── shared/                # 共通ライブラリ
├── .github/workflows/     # CI/CD設定
├── staticwebapp.config.json # Azure Static Web Apps設定
└── web.config             # Azure Web App設定
```

## 🛠️ 開発環境セットアップ

### 必要な環境
- Node.js 18以上
- npm 8以上
- Git

### セットアップ手順

1. **リポジトリのクローン**
   ```bash
   git clone https://github.com/Satoshi-Niina/Emergency-Assistance.git
   cd Emergency-Assistance
   ```

2. **依存関係のインストール**
   ```bash
   # ルートディレクトリ
   npm install
   
   # フロントエンド
   cd client
   npm install
   
   # バックエンド
   cd ../server
   npm install
   
   # 共通ライブラリ
   cd ../shared
   npm install
   ```

3. **環境変数の設定**
   ```bash
   # ルートディレクトリに .env ファイルを作成
   cp local.env.example local.env
   # 必要に応じて値を編集
   ```

4. **開発サーバーの起動**
   ```bash
   # ルートディレクトリから
   npm run dev
   # または
   ./start-dev.ps1  # Windows
   ./start-dev.sh   # Linux/Mac
   ```

## 🔄 開発フロー

### 基本的な作業フロー

1. **ブランチの作成**
   ```bash
   git checkout -b feature/新機能名
   # または
   git checkout -b fix/バグ修正名
   ```

2. **開発作業**
   - フロントエンド: `client/src/` を編集
   - バックエンド: `server/` を編集
   - 共通ライブラリ: `shared/` を編集

3. **ローカルテスト**
   ```bash
   # フロントエンドのビルドテスト
   cd client
   npm run build
   
   # バックエンドのテスト
   cd ../server
   npm test
   ```

4. **コミットとプッシュ**
   ```bash
   git add .
   git commit -m "feat: 新機能の説明"
   git push origin feature/新機能名
   ```

5. **プルリクエストの作成**
   - GitHubでプルリクエストを作成
   - レビューを受けてマージ

### コミットメッセージの規約
```
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
style: コードスタイル修正
refactor: リファクタリング
test: テスト追加・修正
chore: ビルド設定・依存関係更新
```

## 🚀 デプロイメント

### 自動デプロイ
- **mainブランチ**にプッシュすると自動的に本番環境にデプロイされます
- **developブランチ**にプッシュするとステージング環境にデプロイされます

### デプロイプロセス
1. GitHub Actionsが自動実行
2. 依存関係のインストール
3. ビルド実行
4. Azure Static Web Apps (フロントエンド) にデプロイ
5. Azure Web App (バックエンド) にデプロイ

### デプロイ確認
- フロントエンド: Azure Static Web AppsのURL
- バックエンド: `https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/health`

## 🔧 トラブルシューティング

### よくある問題と解決方法

#### 1. MIMEタイプエラー
```
Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "application/octet-stream"
```

**解決方法**: 既に修正済み。`staticwebapp.config.json`でMIMEタイプを設定しています。

#### 2. ビルドエラー
```bash
# 依存関係の問題
rm -rf node_modules package-lock.json
npm install

# キャッシュクリア
npm run clean
```

#### 3. デプロイエラー
- GitHub Actionsのログを確認
- 環境変数が正しく設定されているか確認
- Azureのリソースが正常に動作しているか確認

#### 4. ローカル開発での問題
```bash
# ポート競合の解決
# client/vite.config.ts でポートを変更
server: {
  port: 5176, // デフォルトは5173
}
```

## ⚠️ 重要な注意事項

### 設定ファイルの変更時

#### 1. `staticwebapp.config.json` の変更
- 新しいファイル形式を追加する場合、`mimeTypes`に追加
- 例: `.wasm`ファイルを追加する場合
  ```json
  "mimeTypes": {
    ".wasm": "application/wasm"
  }
  ```

#### 2. `client/vite.config.ts` の変更
- ビルド設定を変更する場合、全員に影響
- 変更前にチームで相談

#### 3. `.github/workflows/` の変更
- CI/CD設定を変更する場合、デプロイに影響
- 変更前にチームで確認

### セキュリティ
- 機密情報は環境変数で管理
- `.env`ファイルはコミットしない
- APIキーやパスワードはGitHub Secretsで管理

### パフォーマンス
- 大きなファイルの追加は避ける
- 画像は最適化してから追加
- 不要な依存関係は削除

## 📞 サポート

### 問題が発生した場合
1. このマニュアルを確認
2. GitHub Issuesで既存の問題を検索
3. チームメンバーに相談
4. 新しいIssueを作成

### 連絡先
- プロジェクトリーダー: Satoshi Niina
- GitHub: https://github.com/Satoshi-Niina/Emergency-Assistance

## 📚 参考資料

- [Vite公式ドキュメント](https://vitejs.dev/)
- [React公式ドキュメント](https://react.dev/)
- [Azure Static Web Apps公式ドキュメント](https://docs.microsoft.com/azure/static-web-apps/)
- [GitHub Actions公式ドキュメント](https://docs.github.com/actions)

---

**最終更新**: 2025年1月
**バージョン**: 1.0
