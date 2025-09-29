# Azure App Service Linux用の設定ファイル
# Linux環境では web.config は使用されません

# このファイルは参考用です
# 実際の設定は Azure Portal の App Settings で行います

# 必要な環境変数:
# NODE_ENV=production
# PORT=8080
# JWT_SECRET=your_jwt_secret_here_minimum_32_characters
# SESSION_SECRET=your_session_secret_here_minimum_32_characters
# DATABASE_URL=postgresql://username:password@host:port/database
# FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net
# OPENAI_API_KEY=sk-your_openai_api_key_here
# PG_SSL=require

# スタートアップコマンドは package.json の "start" スクリプトが使用されます
# "start": "node production-server.js"
