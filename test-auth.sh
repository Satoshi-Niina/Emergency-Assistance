#!/bin/bash

# Emergency Assistance System - 認証テストスクリプト
# 使用方法: ./test-auth.sh

echo "🔧 Emergency Assistance System - 認証テスト開始"
echo "================================================"

# サーバーの起動確認
echo "1. サーバー起動確認..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ サーバーが起動しています"
else
    echo "❌ サーバーが起動していません"
    echo "   サーバーを起動してください: cd server && npm run dev"
    exit 1
fi

# 環境変数確認
echo ""
echo "2. 環境変数確認..."
curl -s http://localhost:3001/api/auth/debug/env | jq '.debug.environment' 2>/dev/null || {
    echo "❌ デバッグエンドポイントにアクセスできません"
    echo "   サーバーのログを確認してください"
}

# セッション状態確認
echo ""
echo "3. セッション状態確認..."
curl -s http://localhost:3001/api/auth/debug/env | jq '.debug.session' 2>/dev/null || {
    echo "❌ セッション情報を取得できません"
}

# 認証状態確認（未認証）
echo ""
echo "4. 未認証状態での認証確認..."
AUTH_RESPONSE=$(curl -s -w "%{http_code}" http://localhost:3001/api/auth/me)
HTTP_CODE="${AUTH_RESPONSE: -3}"
RESPONSE_BODY="${AUTH_RESPONSE%???}"

if [ "$HTTP_CODE" = "401" ]; then
    echo "✅ 未認証状態で正しく401が返されました"
    echo "   レスポンス: $RESPONSE_BODY"
else
    echo "❌ 未認証状態で予期しないレスポンス: $HTTP_CODE"
    echo "   レスポンス: $RESPONSE_BODY"
fi

# ログイン試行（テスト用ユーザー）
echo ""
echo "5. ログイン試行（テスト用ユーザー）..."
LOGIN_RESPONSE=$(curl -s -w "%{http_code}" -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}' \
    -c cookies.txt)
HTTP_CODE="${LOGIN_RESPONSE: -3}"
RESPONSE_BODY="${LOGIN_RESPONSE%???}"

if [ "$HTTP_CODE" = "401" ]; then
    echo "✅ 無効なユーザーで正しく401が返されました"
    echo "   レスポンス: $RESPONSE_BODY"
elif [ "$HTTP_CODE" = "200" ]; then
    echo "✅ ログイン成功（テストユーザーが存在します）"
    echo "   レスポンス: $RESPONSE_BODY"
else
    echo "❌ ログイン試行で予期しないレスポンス: $HTTP_CODE"
    echo "   レスポンス: $RESPONSE_BODY"
fi

# 認証状態確認（ログイン後）
echo ""
echo "6. ログイン後の認証状態確認..."
if [ -f cookies.txt ]; then
    AUTH_RESPONSE=$(curl -s -w "%{http_code}" http://localhost:3001/api/auth/me -b cookies.txt)
    HTTP_CODE="${AUTH_RESPONSE: -3}"
    RESPONSE_BODY="${AUTH_RESPONSE%???}"

    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ ログイン後の認証確認が成功しました"
        echo "   ユーザー情報: $(echo $RESPONSE_BODY | jq -r '.user.username // "N/A"')"
        echo "   レスポンス: $RESPONSE_BODY"
    elif [ "$HTTP_CODE" = "401" ]; then
        echo "⚠️ ログイン後の認証確認で401が返されました（セッションが正しく保存されていない可能性）"
        echo "   レスポンス: $RESPONSE_BODY"
    else
        echo "❌ ログイン後の認証確認で予期しないレスポンス: $HTTP_CODE"
        echo "   レスポンス: $RESPONSE_BODY"
    fi
else
    echo "⚠️ クッキーファイルが見つかりません"
fi

# クリーンアップ
rm -f cookies.txt

echo ""
echo "================================================"
echo "🔧 認証テスト完了"
echo ""
echo "📝 次のステップ:"
echo "1. ブラウザで http://localhost:5002 にアクセス"
echo "2. ログイン画面が表示されることを確認"
echo "3. 有効なユーザーでログインを試行"
echo "4. ログイン成功後、ダッシュボードに遷移することを確認" 