#!/bin/bash

# Emergency Assistance System - API Test Script
# サーバーが起動している状態で実行してください

echo "🚀 Emergency Assistance System - API Test"
echo "=========================================="

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

# ヘルスチェック
echo ""
print_info "1. サーバーヘルスチェック"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" "$BASE_URL/api/health" || print_error "サーバーに接続できません"

# 機種一覧取得API
echo ""
print_info "2. 機種一覧取得API (/api/machine-types)"
curl -s "$BASE_URL/api/machine-types" | jq '.' 2>/dev/null || curl -s "$BASE_URL/api/machine-types"

# 全機械データ取得API
echo ""
print_info "3. 全機械データ取得API (/api/all-machines)"
curl -s "$BASE_URL/api/all-machines" | jq '.' 2>/dev/null || curl -s "$BASE_URL/api/all-machines"

# 履歴一覧取得API
echo ""
print_info "4. 履歴一覧取得API (/api/history)"
curl -s "$BASE_URL/api/history" | jq '.' 2>/dev/null || curl -s "$BASE_URL/api/history"

# ナレッジベース文書一覧取得API
echo ""
print_info "5. ナレッジベース文書一覧取得API (/api/data-processor/documents)"
curl -s "$BASE_URL/api/data-processor/documents" | jq '.' 2>/dev/null || curl -s "$BASE_URL/api/data-processor/documents"

# 機種追加API（テスト用）
echo ""
print_info "6. 機種追加APIテスト (/api/machine-types)"
curl -s -X POST "$BASE_URL/api/machine-types" \
  -H "Content-Type: application/json" \
  -d '{"machine_type_name": "テスト機種"}' | jq '.' 2>/dev/null || curl -s -X POST "$BASE_URL/api/machine-types" \
  -H "Content-Type: application/json" \
  -d '{"machine_type_name": "テスト機種"}'

# 履歴保存API（テスト用）
echo ""
print_info "7. 履歴保存APIテスト (/api/history/save)"
curl -s -X POST "$BASE_URL/api/history/save" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "123e4567-e89b-12d3-a456-426614174000",
    "question": "テスト質問",
    "answer": "テスト回答",
    "machineType": "軌道モータカー",
    "machineNumber": "TRACK-001"
  }' | jq '.' 2>/dev/null || curl -s -X POST "$BASE_URL/api/history/save" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "123e4567-e89b-12d3-a456-426614174000",
    "question": "テスト質問",
    "answer": "テスト回答",
    "machineType": "軌道モータカー",
    "machineNumber": "TRACK-001"
  }'

echo ""
print_info "API テスト完了"
echo "=========================================="

# 手動テスト用のコマンド例
echo ""
echo "📋 手動テスト用コマンド例:"
echo "------------------------------------------"
echo "1. 機種一覧取得:"
echo "   curl -s '$BASE_URL/api/machine-types' | jq '.'"
echo ""
echo "2. 全機械データ取得:"
echo "   curl -s '$BASE_URL/api/all-machines' | jq '.'"
echo ""
echo "3. 履歴一覧取得:"
echo "   curl -s '$BASE_URL/api/history' | jq '.'"
echo ""
echo "4. 機種追加:"
echo "   curl -X POST '$BASE_URL/api/machine-types' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"machine_type_name\": \"新機種\"}' | jq '.'"
echo ""
echo "5. 履歴保存:"
echo "   curl -X POST '$BASE_URL/api/history/save' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"sessionId\": \"$(uuidgen)\", \"question\": \"質問\", \"answer\": \"回答\"}' | jq '.'" 