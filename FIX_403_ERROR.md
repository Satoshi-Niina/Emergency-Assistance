# 403 Forbiddenエラー修正 - クイックリファレンス

## 🚨 緊急対応が必要です

現在、以下のAPIエンドポイントが403 Forbiddenエラーを返しています:
- `/api/emergency-flow/list`
- `/api/history/machine-data` (404と表示されるが実際は403)
- `/api/history/export-files` (404と表示されるが実際は403)

## ⚡ 最速の修正方法（5分で完了）

### Azure Portalで実行（必須）

1. **Azure Portalにログイン**
   - https://portal.azure.com

2. **App Serviceを開く**
   - `emergency-assistantapp-gwgscxcca5cahyb9`

3. **認証を無効化**
   - 左メニュー > **認証** (Authentication)
   - 「App Service認証」を **オフ**
   - **保存**

4. **再起動**
   - 左メニュー > **概要** > **再起動**

5. **確認**
   - ブラウザでフロントエンドにアクセス
   - F12で開発者ツールを開く
   - エラーが消えていることを確認

## 📋 詳細な手順書

修正方法の詳細は以下のドキュメントを参照:

1. **AZURE_403_ERROR_FIX.md**
   - 問題の詳細な分析
   - 複数の修正オプション
   - トラブルシューティング

2. **AZURE_EMERGENCY_FIX_DEPLOY.md**
   - 緊急修正とデプロイ手順
   - 動作確認方法
   - 最終チェックリスト

## 🔍 問題の原因

**Azure App ServiceのEasy Auth（認証機能）が有効**

- すべてのAPIリクエストが認証によってインターセプトされている
- APIエンドポイントは実装されているが、認証レイヤーでブロックされている
- Easy Authを無効化するか、`/api/*`を除外する必要がある

## ✅ 修正後の確認方法

### ブラウザのコンソール（F12）

**修正前:**
```
❌ Failed to load resource: 403 (Forbidden)
❌ APIエラー: 403 Forbidden
```

**修正後:**
```
✅ フロー一覧取得成功
✅ 200 OK
```

### ネットワークタブ

以下のリクエストがすべて **200 OK** を返すことを確認:
- `/api/emergency-flow/list`
- `/api/history/machine-data`
- `/api/history/export-files`

## 🛠️ コード修正内容

### `azure-server.mjs`

以下の修正を適用済み:

1. **Easy Auth検出の強化**（130行目付近）
   - すべてのリクエストでEasy Authを検出
   - 詳細な警告メッセージを出力

2. **デバッグログの追加**（4673行目付近）
   - `/api/emergency-flow/list`エンドポイントに詳細なログ
   - リクエストヘッダーの完全な出力
   - Easy Auth検出時の明示的な警告

## 📦 デプロイ方法

```powershell
# 変更をコミット
git add server/azure-server.mjs AZURE_*.md FIX_403_ERROR.md
git commit -m "fix: Add enhanced Easy Auth detection for 403 error debugging"

# プッシュ（自動デプロイが開始される）
git push origin main
```

## 🔄 デプロイが反映されない場合

1. **App Serviceを手動再起動**
   - Azure Portal > App Service > 概要 > 再起動

2. **デプロイセンターを確認**
   - Azure Portal > App Service > デプロイセンター
   - 最新のデプロイが成功しているか確認

3. **Kuduコンソールでファイル確認**
   - https://emergency-assistantapp-gwgscxcca5cahyb9.scm.azurewebsites.net/
   - Debug console > CMD
   - `cd D:\home\site\wwwroot\server`
   - `dir azure-server.mjs`で最終更新日時を確認

## 📞 サポート

問題が解決しない場合:

1. **Azure App Serviceのログを確認**
   - Azure Portal > App Service > ログ ストリーム

2. **診断ツールを使用**
   - Azure Portal > App Service > 診断と問題の解決
   - 「HTTP 4XX エラー」で検索

3. **詳細ドキュメントを参照**
   - `AZURE_403_ERROR_FIX.md`
   - `AZURE_EMERGENCY_FIX_DEPLOY.md`

## 🎯 チェックリスト

- [ ] Azure PortalでEasy Authを無効化した
- [ ] App Serviceを再起動した
- [ ] ブラウザでハードリロードした（Ctrl+Shift+R）
- [ ] コンソールでエラーが消えていることを確認した
- [ ] ネットワークタブで200 OKを確認した
- [ ] フロントエンドが正常に動作している

---

**作成日:** 2025年12月2日  
**重要度:** 🔴 緊急  
**所要時間:** 5分（Azure Portal操作のみ）

すぐにAzure Portalで認証を無効化してください！
