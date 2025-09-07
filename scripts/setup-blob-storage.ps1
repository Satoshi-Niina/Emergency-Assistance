# Azure App Service環境変数設定 - Blob Storage対応
$ResourceGroup = "your-resource-group"
$AppName = "emergencyassistance-sv"

Write-Host "=== Azure Blob Storage環境変数設定 ===" -ForegroundColor Green

# 重要: 以下を実際の値に置き換えてください
$StorageConnectionString = "DefaultEndpointsProtocol=https;AccountName=yourstorageaccount;AccountKey=youraccountkey;EndpointSuffix=core.windows.net"
$ContainerName = "knowledge-base"

# 必須環境変数を設定
$envVars = @{
    "NODE_ENV" = "production"
    "WEBSITE_NODE_DEFAULT_VERSION" = "20.x" 
    "SCM_COMMAND_IDLE_TIMEOUT" = "300"
    "AZURE_STORAGE_CONNECTION_STRING" = $StorageConnectionString
    "BLOB_CONTAINER_NAME" = $ContainerName
    "WEBSITE_TIME_ZONE" = "Asia/Tokyo"
    "WEBSITES_ENABLE_APP_SERVICE_STORAGE" = "false"
}

foreach ($key in $envVars.Keys) {
    Write-Host "Setting $key" -ForegroundColor Yellow
    az webapp config appsettings set --resource-group $ResourceGroup --name $AppName --settings "$key=$($envVars[$key])"
}

Write-Host "=== 設定完了 ===" -ForegroundColor Green
Write-Host "ヘルスチェックURL: https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/health" -ForegroundColor Cyan
Write-Host "期待されるレスポンス: {\"status\":\"ok\",\"time\":\"2025-09-07T...\"}" -ForegroundColor Cyan
