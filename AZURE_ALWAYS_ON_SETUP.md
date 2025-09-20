# Azure App Service Always On 設定ガイド

## Always On の有効化手順

### 1. Azure Portal にログイン
1. [Azure Portal](https://portal.azure.com) にログイン
2. リソースグループ `emergency-assistance-rg` を選択

### 2. App Service の設定
1. App Service `emergencyassistance-sv-fbanemhrbshuf9bd` を選択
2. 左側メニューから「設定」→「構成」を選択
3. 「一般設定」タブを選択

### 3. Always On の有効化
1. 「Always On」の設定を探す
2. 「オン」に設定
3. 「保存」をクリック

### 4. 確認
- Always On が有効になると、アプリケーションが常にメモリに保持されます
- これにより、初回リクエスト時のコールドスタートが回避されます

## 注意事項
- Always On を有効にすると、追加の料金が発生する場合があります
- 無料プランでは Always On は利用できません
- 本番環境では必ず有効にすることを推奨します

## 代替案（Always On が利用できない場合）
1. 外部のヘルスチェックサービスを使用
2. 定期的な ping エンドポイントを呼び出す
3. アプリケーションの起動時間を短縮する最適化
