# Azure App Service 503エラー診断ガイド

## 🚨 503エラーの原因調査

### Azure Portal でのログ確認手順：

1. **Azure Portal** → **App Service "Emergency-Assistance"**
2. **監視** → **ログストリーム** をクリック
3. リアルタイムログを確認

**または**

1. **開発ツール** → **高度なツール** → **移動**
2. Kudu コンソールが開く
3. **Debug console** → **CMD** 
4. `/home/LogFiles` フォルダを確認

### よくある503エラーの原因：

1. **起動スクリプトエラー**: `package.json` の `start` が間違っている
2. **環境変数不足**: 必須の環境変数が設定されていない  
3. **ポート設定問題**: `process.env.PORT` を使用していない
4. **モジュール不足**: `node_modules` が正しくデプロイされていない
5. **メモリ不足**: サーバーがメモリ制限に達している

### 現在の修正状況：
- ✅ `package.json` start スクリプトを `index.js` に修正済み
- ✅ `web.config` でIISNode設定追加済み  
- ✅ 堅牢なエラーハンドリング実装済み

### 次の診断ステップ：
1. Azure Portal でログを確認
2. 起動時のエラーメッセージを特定
3. 必要に応じてさらなる修正を実施