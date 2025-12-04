# GitHub Actions セキュリティチェック設定ガイド

## 概要

React Server Components（CVE-2025-55182）および Next.js（CVE-2025-66478）の脆弱性に対する自動チェック機能が GitHub Actions に統合されました。

## 実装されたワークフロー

### 1. **専用セキュリティチェックワークフロー** (`.github/workflows/security-check.yml`)

#### トリガー条件
- **Push イベント**: `main`, `develop`, `feature/**` ブランチへのプッシュ
- **Pull Request**: `main`, `develop` ブランチへの PR
- **手動実行**: GitHub Actions UI から実行可能
- **定期実行**: 毎週月曜日 9:00 JST（0:00 UTC）
- **対象ファイル変更時**:
  - `**/package.json`
  - `**/package-lock.json`
  - `scripts/check-rsc-vulnerabilities.js`
  - `.github/workflows/security-check.yml`

#### 実行内容
1. リポジトリをチェックアウト
2. Node.js 20 をセットアップ
3. すべての package.json（root, client, server, shared）の依存関係をインストール
4. `scripts/check-rsc-vulnerabilities.js` を実行
5. 脆弱性が検出された場合:
   - ワークフローを失敗させる（exit 1）
   - PR にコメントを自動投稿
   - 脆弱性レポートをアーティファクトとして保存（30日間保持）

### 2. **デプロイワークフローへの統合**

#### サーバーデプロイ (`.github/workflows/deploy-server-AppCervce.yml`)
- Node.js セットアップ後、依存関係インストール前にセキュリティチェックを実行
- 脆弱性が検出された場合はデプロイを中断

#### クライアントデプロイ (`.github/workflows/deploy-cliente-azure.yml`)
- Node.js セットアップ後、依存関係インストール前にセキュリティチェックを実行
- 脆弱性が検出された場合はデプロイを中断

## ワークフローの動作

### ✅ 脆弱性なしの場合

```
🔍 Running security vulnerability check...
✅ 対象パッケージが見つかりませんでした（脆弱性の影響なし）

📊 チェック結果サマリー
==========================================
チェックファイル数: 4
✅ 安全なパッケージ: 0
⚠️  脆弱なパッケージ: 0

✅ 脆弱性は検出されませんでした
✅ CI SUCCESS: No security vulnerabilities detected
```

ワークフローは正常に完了し、次のステップへ進みます。

### ⚠️ 脆弱性検出の場合

```
🔍 Running security vulnerability check...
⚠️ next
   バージョン: ^15.0.0
   ステータス: VULNERABLE
   CVE: CVE-2025-66478
   推奨バージョン: 16.0.7
   対応方法: npm install next@16.0.7

📊 チェック結果サマリー
==========================================
✅ 安全なパッケージ: 0
⚠️  脆弱なパッケージ: 1

⚠️ 【警告】脆弱性が検出されました！
❌ CI FAILURE: Security vulnerabilities detected
```

- **ワークフローは失敗します**（exit code 1）
- **デプロイは実行されません**
- **PR には自動コメントが投稿されます**

## PR への自動コメント

脆弱性が検出された場合、以下のようなコメントが PR に自動投稿されます：

---

## ⚠️ セキュリティ警告: 脆弱性が検出されました

**CVE-2025-55182** (React Server Components) または **CVE-2025-66478** (Next.js) の脆弱性が検出されました。

### 対応が必要です

1. ワークフローの詳細ログを確認してください
2. 検出された脆弱なパッケージを推奨バージョンにアップデートしてください
3. `npm install` を実行して依存関係を更新してください
4. アプリケーションのテストを実施してください

### 推奨アクション

```bash
# ローカルでチェックを実行
npm run security:check-rsc

# 脆弱なパッケージをアップデート
npm install <package>@<recommended-version>

# 再度チェック
npm run security:check-rsc
```

---

## 脆弱性への対応フロー

### 1. 脆弱性の検出

GitHub Actions で脆弱性が検出されると、ワークフローが失敗します。

### 2. ローカルで確認

```bash
# ローカル環境でチェックを実行
npm run security:check-rsc
```

### 3. パッケージのアップデート

#### Next.js の場合
```bash
cd client  # または該当ディレクトリ
npm install next@16.0.7
```

#### React Server Components の場合
```bash
cd client  # または該当ディレクトリ
npm install react-server-dom-webpack@19.2.1
# または
npm install react-server-dom-parcel@19.2.1
# または
npm install react-server-dom-turbopack@19.2.1
```

### 4. 動作確認

```bash
# 開発サーバーを起動
npm run dev

# テストを実行（存在する場合）
npm test
```

### 5. 再チェック

```bash
npm run security:check-rsc
```

### 6. コミット & プッシュ

```bash
git add package.json package-lock.json
git commit -m "fix: Update vulnerable packages (CVE-2025-55182, CVE-2025-66478)"
git push
```

GitHub Actions が自動的に再実行され、脆弱性が解消されていればワークフローが成功します。

## 手動実行

GitHub Actions UI から手動でセキュリティチェックを実行できます：

1. リポジトリの **Actions** タブを開く
2. **Security Check - RSC & Next.js Vulnerabilities** を選択
3. **Run workflow** をクリック
4. ブランチを選択して **Run workflow** を実行

## 定期実行

セキュリティチェックは毎週月曜日 9:00 JST（0:00 UTC）に自動実行されます。

これにより、新たな脆弱性が公開された場合でも早期に検出できます。

## ワークフローの無効化（非推奨）

緊急時にセキュリティチェックを一時的にスキップする必要がある場合：

```yaml
# .github/workflows/security-check.yml または deploy-*.yml の該当ステップを修正
- name: Security check - RSC & Next.js vulnerabilities
  run: |
    echo "🔍 Running security vulnerability check..."
    node scripts/check-rsc-vulnerabilities.js
  continue-on-error: true  # false から true に変更
```

**⚠️ 警告**: セキュリティチェックをスキップすることは推奨されません。脆弱なコードが本番環境にデプロイされるリスクがあります。

## トラブルシューティング

### スクリプトが見つからない

```
Error: Cannot find module 'scripts/check-rsc-vulnerabilities.js'
```

**解決方法**: スクリプトが正しくコミットされているか確認してください。

```bash
git add scripts/check-rsc-vulnerabilities.js
git commit -m "Add security check script"
git push
```

### Node.js バージョンエラー

```
Error: The engine "node" is incompatible with this module
```

**解決方法**: ワークフローで Node.js 20 を使用していることを確認してください。

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
```

### CI 環境でのみ失敗する

ローカルでは成功するが CI で失敗する場合：

1. **環境変数の違い**: CI 環境特有の設定を確認
2. **キャッシュの問題**: `npm ci` を使用してクリーンインストール
3. **タイムゾーン**: タイムスタンプ関連の問題がないか確認

## アーティファクト

脆弱性レポートは GitHub Actions のアーティファクトとして 30 日間保存されます。

**アクセス方法**:
1. GitHub Actions の実行結果ページを開く
2. **Artifacts** セクションを確認
3. `vulnerability-report-<commit-sha>` をダウンロード

## 参考リンク

- [CVE-2025-55182 詳細](https://www.cve.org/CVERecord?id=CVE-2025-55182)
- [CVE-2025-66478 詳細](https://www.cve.org/CVERecord?id=CVE-2025-66478)
- [GitHub Actions ドキュメント](https://docs.github.com/en/actions)
- [セキュリティチェックスクリプト README](./README-check-rsc-vulnerabilities.md)

## まとめ

この GitHub Actions 統合により：

✅ **自動チェック**: すべてのプッシュと PR で自動実行  
✅ **デプロイ保護**: 脆弱なコードのデプロイを防止  
✅ **早期検出**: 定期実行により新しい脆弱性を早期に発見  
✅ **チーム全体の安全性**: すべての開発者が同じセキュリティ基準を共有  
✅ **透明性**: PR コメントとアーティファクトで完全な可視性

このセキュリティチェック機能は、チーム全体の安全性を向上させ、脆弱なコードが本番環境にデプロイされるリスクを最小限に抑えます。
