#!/bin/bash

# Emergency Assistance System - Session API Test Script
# セッション維持確認用テスト

echo "🚀 Emergency Assistance System - Session API Test"
echo "================================================"

# サーバーの基本URL
BASE_URL="http://localhost:5000"

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

# セッション用のCookieファイル
COOKIE_FILE="session_cookies.txt"

# 1. サーバーヘルスチェック
echo ""
print_info "1. サーバーヘルスチェック"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" "$BASE_URL/api/health" || print_error "サーバーに接続できません"

# 2. ログイン（セッション開始）
echo ""
print_info "2. ログイン（セッション開始）"
LOGIN_RESPONSE=$(curl -s -c "$COOKIE_FILE" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }')

echo "ログインレスポンス:"
echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"

# ログイン成功確認
if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    print_success "ログイン成功"
else
    print_error "ログイン失敗"
    echo "レスポンス: $LOGIN_RESPONSE"
    exit 1
fi

# 3. セッション確認（/api/auth/me）
echo ""
print_info "3. セッション確認（/api/auth/me）"
ME_RESPONSE=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/api/auth/me")

echo "セッション確認レスポンス:"
echo "$ME_RESPONSE" | jq '.' 2>/dev/null || echo "$ME_RESPONSE"

# 4. 機種一覧取得（セッション付き）
echo ""
print_info "4. 機種一覧取得（セッション付き）"
MACHINE_TYPES_RESPONSE=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/api/machine-types")

echo "機種一覧レスポンス:"
echo "$MACHINE_TYPES_RESPONSE" | jq '.' 2>/dev/null || echo "$MACHINE_TYPES_RESPONSE"

# 5. 全機械データ取得（セッション付き）
echo ""
print_info "5. 全機械データ取得（セッション付き）"
ALL_MACHINES_RESPONSE=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/api/all-machines")

echo "全機械データレスポンス:"
echo "$ALL_MACHINES_RESPONSE" | jq '.' 2>/dev/null || echo "$ALL_MACHINES_RESPONSE"

# 6. 履歴一覧取得（セッション付き）
echo ""
print_info "6. 履歴一覧取得（セッション付き）"
HISTORY_RESPONSE=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/api/history")

echo "履歴一覧レスポンス:"
echo "$HISTORY_RESPONSE" | jq '.' 2>/dev/null || echo "$HISTORY_RESPONSE"

# 7. セッションなしでのアクセス（失敗確認）
echo ""
print_info "7. セッションなしでのアクセス（失敗確認）"
NO_SESSION_RESPONSE=$(curl -s "$BASE_URL/api/machine-types")

echo "セッションなしレスポンス:"
echo "$NO_SESSION_RESPONSE" | jq '.' 2>/dev/null || echo "$NO_SESSION_RESPONSE"

# 8. ログアウト
echo ""
print_info "8. ログアウト"
LOGOUT_RESPONSE=$(curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/api/auth/logout")

echo "ログアウトレスポンス:"
echo "$LOGOUT_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGOUT_RESPONSE"

# 9. ログアウト後のアクセス（失敗確認）
echo ""
print_info "9. ログアウト後のアクセス（失敗確認）"
AFTER_LOGOUT_RESPONSE=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/api/machine-types")

echo "ログアウト後レスポンス:"
echo "$AFTER_LOGOUT_RESPONSE" | jq '.' 2>/dev/null || echo "$AFTER_LOGOUT_RESPONSE"

# 10. Cookieファイルの内容確認
echo ""
print_info "10. Cookieファイルの内容確認"
if [ -f "$COOKIE_FILE" ]; then
    echo "Cookieファイル内容:"
    cat "$COOKIE_FILE"
else
    print_warning "Cookieファイルが作成されていません"
fi

# クリーンアップ
rm -f "$COOKIE_FILE"

echo ""
print_info "セッションAPIテスト完了"
echo "================================================"

# 手動テスト用のコマンド例
echo ""
echo "📋 手動テスト用コマンド例:"
echo "------------------------------------------"
echo "1. ログイン:"
echo "   curl -c cookies.txt -X POST '$BASE_URL/api/auth/login' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"username\": \"admin\", \"password\": \"admin123\"}'"
echo ""
echo "2. セッション確認:"
echo "   curl -b cookies.txt '$BASE_URL/api/auth/me'"
echo ""
echo "3. 機種一覧取得（セッション付き）:"
echo "   curl -b cookies.txt '$BASE_URL/api/machine-types'"
echo ""
echo "4. 全機械データ取得（セッション付き）:"
echo "   curl -b cookies.txt '$BASE_URL/api/all-machines'"
echo ""
echo "5. 履歴一覧取得（セッション付き）:"
echo "   curl -b cookies.txt '$BASE_URL/api/history'"
echo ""
echo "6. ログアウト:"
echo "   curl -b cookies.txt -X POST '$BASE_URL/api/auth/logout'" 