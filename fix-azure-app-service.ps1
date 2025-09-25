# Azure App Service 完全リセットスクリプト
# 403エラーの根本原因を解決

Write-Host "🔧 Azure App Service 完全リセットを開始..." -ForegroundColor Green

# Azure CLI でログイン確認
Write-Host "📋 Azure CLI ログイン状態を確認..." -ForegroundColor Yellow
az account show --query "name" -o tsv
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Azure CLI にログインしてください: az login" -ForegroundColor Red
    exit 1
}

# App Service 名とリソースグループ
$APP_NAME = "emergencyassistance-sv"
$RESOURCE_GROUP = "emergency-assistance-rg"

Write-Host "🔧 App Service 設定を完全リセット中..." -ForegroundColor Yellow

# 1. 認証を完全に無効化
Write-Host "🔐 認証を完全に無効化中..." -ForegroundColor Cyan
az webapp auth update --name $APP_NAME --resource-group $RESOURCE_GROUP --enabled false --output table

# 2. すべてのアクセス制限を削除
Write-Host "🚪 アクセス制限を完全に削除中..." -ForegroundColor Cyan
az webapp config access-restriction remove --name $APP_NAME --resource-group $RESOURCE_GROUP --rule-name "Allow all" --action Allow --output table 2>$null
az webapp config access-restriction remove --name $APP_NAME --resource-group $RESOURCE_GROUP --rule-name "Deny all" --action Deny --output table 2>$null

# 3. すべてのアクセス制限ルールを一覧表示して削除
Write-Host "📋 既存のアクセス制限ルールを確認中..." -ForegroundColor Cyan
$rules = az webapp config access-restriction show --name $APP_NAME --resource-group $RESOURCE_GROUP --query "ipSecurityRestrictions" -o json 2>$null
if ($rules) {
    $rulesArray = $rules | ConvertFrom-Json
    foreach ($rule in $rulesArray) {
        if ($rule.name) {
            Write-Host "🗑️ ルール削除: $($rule.name)" -ForegroundColor Yellow
            az webapp config access-restriction remove --name $APP_NAME --resource-group $RESOURCE_GROUP --rule-name $rule.name --output table 2>$null
        }
    }
}

# 4. 新しい許可ルールを追加
Write-Host "✅ 新しい許可ルールを追加中..." -ForegroundColor Cyan
az webapp config access-restriction add --name $APP_NAME --resource-group $RESOURCE_GROUP --rule-name "Allow all" --action Allow --priority 100 --output table

# 5. 環境変数を設定
Write-Host "📝 環境変数を設定中..." -ForegroundColor Cyan
az webapp config appsettings set --name $APP_NAME --resource-group $RESOURCE_GROUP --settings `
    NODE_ENV=production `
    JWT_SECRET="emergency-assistance-jwt-secret-key-32chars" `
    SESSION_SECRET="emergency-assistance-session-secret-32chars" `
    FRONTEND_URL="https://witty-river-012f39e00.1.azurestaticapps.net" `
    TRUST_PROXY=1 `
    --output table

# 6. スタートアップコマンドを設定
Write-Host "🚀 スタートアップコマンドを設定中..." -ForegroundColor Cyan
az webapp config set --name $APP_NAME --resource-group $RESOURCE_GROUP --startup-file "node production-server.js" --output table

# 7. Always Onを有効化
Write-Host "⚡ Always Onを有効化中..." -ForegroundColor Cyan
az webapp config set --name $APP_NAME --resource-group $RESOURCE_GROUP --always-on true --output table

# 8. App Serviceを再起動
Write-Host "🔄 App Serviceを再起動中..." -ForegroundColor Cyan
az webapp restart --name $APP_NAME --resource-group $RESOURCE_GROUP --output table

# 9. 設定確認
Write-Host "📋 設定確認中..." -ForegroundColor Cyan
Write-Host "認証設定:" -ForegroundColor Yellow
az webapp auth show --name $APP_NAME --resource-group $RESOURCE_GROUP --query "enabled" -o tsv

Write-Host "アクセス制限:" -ForegroundColor Yellow
az webapp config access-restriction show --name $APP_NAME --resource-group $RESOURCE_GROUP --query "ipSecurityRestrictions" -o table

Write-Host "環境変数:" -ForegroundColor Yellow
az webapp config appsettings list --name $APP_NAME --resource-group $RESOURCE_GROUP --query "[?name=='NODE_ENV' || name=='JWT_SECRET' || name=='SESSION_SECRET']" -o table

Write-Host "✅ Azure App Service リセット完了!" -ForegroundColor Green
Write-Host "🌐 テストURL: https://$APP_NAME.azurewebsites.net/api/health" -ForegroundColor Cyan
