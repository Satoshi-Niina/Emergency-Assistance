#!/bin/bash

# Emergency Assistance System - Users API Test Script
# ユーザー管理APIのテスト

echo "🚀 Emergency Assistance System - Users API Test"
echo "=============================================="

# サーバーの基本URL
BASE_URL="http://localhost:3001"

# 色付きの出力関数
print_success() {
    echo -e "\033[32m✅ $1\033[0m"
}

print_error() {
    echo -e "\033[31m❌ $1\033[0m"
}

print_info() {
    echo -e "\033[34mℹ️  $1\033[0m"
}

print_warning() {
    echo -e "\033[33m⚠️  $1\033[0m"
}

# 1. サーバーヘルスチェック
echo ""
print_info "1. サーバーヘルスチェック"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" "$BASE_URL/api/health" || print_error "サーバーに接続できません"

# 2. デバッグ用 - データベース接続確認
echo ""
print_info "2. データベース接続確認"
curl -s "$BASE_URL/api/debug/users/database" | jq '.' 2>/dev/null || curl -s "$BASE_URL/api/debug/users/database"

# 3. デバッグ用 - セッション情報確認
echo ""
print_info "3. セッション情報確認"
curl -s "$BASE_URL/api/debug/users/session" | jq '.' 2>/dev/null || curl -s "$BASE_URL/api/debug/users/session"

# 4. デバッグ用 - ユーザー一覧取得（認証なし）
echo ""
print_info "4. ユーザー一覧取得（認証なし）"
curl -s "$BASE_URL/api/debug/users/list" | jq '.' 2>/dev/null || curl -s "$BASE_URL/api/debug/users/list"

# 5. 通常のユーザー一覧取得API
echo ""
print_info "5. 通常のユーザー一覧取得API"
curl -s "$BASE_URL/api/users" | jq '.' 2>/dev/null || curl -s "$BASE_URL/api/users"

# 6. ログイン
echo ""
print_info "6. ログイン"
LOGIN_RESPONSE=$(curl -s -c cookies.txt -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }')

echo "ログインレスポンス:"
echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"

# 7. ログイン後のユーザー一覧取得
echo ""
print_info "7. ログイン後のユーザー一覧取得"
curl -s -b cookies.txt "$BASE_URL/api/users" | jq '.' 2>/dev/null || curl -s -b cookies.txt "$BASE_URL/api/users"

# 8. 新規ユーザー作成テスト
echo ""
print_info "8. 新規ユーザー作成テスト"
NEW_USER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass123",
    "display_name": "テストユーザー",
    "role": "employee",
    "department": "テスト部署"
  }')

echo "新規ユーザー作成レスポンス:"
echo "$NEW_USER_RESPONSE" | jq '.' 2>/dev/null || echo "$NEW_USER_RESPONSE"

# 9. 作成後のユーザー一覧確認
echo ""
print_info "9. 作成後のユーザー一覧確認"
curl -s "$BASE_URL/api/users" | jq '.' 2>/dev/null || curl -s "$BASE_URL/api/users"

# 10. 個別ユーザー取得テスト
echo ""
print_info "10. 個別ユーザー取得テスト"
# 最初のユーザーIDを取得してテスト
FIRST_USER_ID=$(curl -s "$BASE_URL/api/users" | jq -r '.data[0].id' 2>/dev/null)
if [ "$FIRST_USER_ID" != "null" ] && [ -n "$FIRST_USER_ID" ]; then
    echo "最初のユーザーID: $FIRST_USER_ID"
    curl -s "$BASE_URL/api/users/$FIRST_USER_ID" | jq '.' 2>/dev/null || curl -s "$BASE_URL/api/users/$FIRST_USER_ID"
else
    print_warning "ユーザーIDが取得できませんでした"
fi

# クリーンアップ
rm -f cookies.txt

echo ""
print_info "ユーザー管理APIテスト完了"
echo "=============================================="

# 手動テスト用のコマンド例
echo ""
echo "📋 手動テスト用コマンド例:"
echo "------------------------------------------"
echo "1. データベース確認:"
echo "   curl -s '$BASE_URL/api/debug/users/database' | jq '.'"
echo ""
echo "2. ユーザー一覧取得（認証なし）:"
echo "   curl -s '$BASE_URL/api/debug/users/list' | jq '.'"
echo ""
echo "3. 通常のユーザー一覧取得:"
echo "   curl -s '$BASE_URL/api/users' | jq '.'"
echo ""
echo "4. ログイン:"
echo "   curl -c cookies.txt -X POST '$BASE_URL/api/auth/login' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"username\": \"admin\", \"password\": \"admin123\"}'"
echo ""
echo "5. ログイン後のユーザー一覧取得:"
echo "   curl -b cookies.txt '$BASE_URL/api/users' | jq '.'"
echo ""
echo "6. 新規ユーザー作成:"
echo "   curl -X POST '$BASE_URL/api/users' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{"
echo "       \"username\": \"newuser\","
echo "       \"password\": \"newpass123\","
echo "       \"display_name\": \"新規ユーザー\","
echo "       \"role\": \"employee\","
echo "       \"department\": \"新規部署\""
echo "     }' | jq '.'" 