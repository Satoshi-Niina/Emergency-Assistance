#!/bin/bash

# リポジトリクリーンアップ承認スクリプト
# このスクリプトは人間レビュー後にのみ実行してください

set -e

echo "🧹 Emergency Assistance リポジトリクリーンアップ承認スクリプト"
echo "================================================================"
echo ""

# 確認メッセージ
echo "⚠️  警告: このスクリプトは以下のファイルを削除します："
echo "   - ログファイル (*.log)"
echo "   - バックアップファイル (*.backup*)"
echo "   - ビルド成果物 (dist/)"
echo "   - テストファイル (test-*)"
echo "   - 一時ファイル (*.tmp, *.bak)"
echo ""

# ユーザー確認
read -p "続行しますか？ (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ クリーンアップをキャンセルしました"
    exit 1
fi

echo ""
echo "🔍 削除候補ファイルの確認..."
if [ ! -f "delete-candidates.txt" ]; then
    echo "❌ delete-candidates.txt が見つかりません"
    exit 1
fi

echo ""
echo "📋 削除予定ファイル一覧:"
cat delete-candidates.txt | grep -v "^#" | grep -v "^$" | head -20
echo "..."

read -p "これらのファイルを削除しますか？ (yes/no): " confirm2
if [ "$confirm2" != "yes" ]; then
    echo "❌ クリーンアップをキャンセルしました"
    exit 1
fi

echo ""
echo "🗑️  ファイル削除を開始..."

# ログファイルの削除
echo "  - ログファイルを削除中..."
find . -name "*.log" -type f -delete 2>/dev/null || true

# バックアップファイルの削除
echo "  - バックアップファイルを削除中..."
find . -name "*backup*" -type f -delete 2>/dev/null || true

# ビルド成果物の削除
echo "  - ビルド成果物を削除中..."
rm -rf client/dist server/dist shared/dist 2>/dev/null || true

# 一時ファイルの削除
echo "  - 一時ファイルを削除中..."
find . -name "*.tmp" -type f -delete 2>/dev/null || true
find . -name "*.bak" -type f -delete 2>/dev/null || true
find . -name "*~" -type f -delete 2>/dev/null || true

# TypeScriptビルド情報の削除
echo "  - TypeScriptビルド情報を削除中..."
find . -name "*.tsbuildinfo" -type f -delete 2>/dev/null || true

# テストファイルの削除（要確認）
echo "  - テストファイルを削除中..."
rm -f test-*.js test-*.ps1 2>/dev/null || true
rm -f public/test-*.html 2>/dev/null || true

# ドラフトファイルの削除
echo "  - ドラフトファイルを削除中..."
rm -f cleanup-commit.md final-deploy.txt force-deploy.txt frontend-trigger.txt trigger.txt 2>/dev/null || true

echo ""
echo "✅ クリーンアップが完了しました！"
echo ""

# 最終確認
echo "🔍 クリーンアップ後の状況確認..."
echo "  - TypeScriptコンパイルチェック..."
if npx tsc --noEmit > /dev/null 2>&1; then
    echo "    ✅ TypeScriptエラーなし"
else
    echo "    ⚠️  TypeScriptエラーが残存しています"
fi

echo "  - ESLintチェック..."
if npx eslint . --ext .ts,.tsx,.js,.jsx --quiet > /dev/null 2>&1; then
    echo "    ✅ ESLintエラーなし"
else
    echo "    ⚠️  ESLintエラーが残存しています"
fi

echo "  - 依存関係チェック..."
if npx depcheck > /dev/null 2>&1; then
    echo "    ✅ 依存関係問題なし"
else
    echo "    ⚠️  依存関係問題が残存しています"
fi

echo ""
echo "🎉 リポジトリクリーンアップが完了しました！"
echo "   次のステップ:"
echo "   1. git add ."
echo "   2. git commit -m 'chore: repository cleanup'"
echo "   3. git push origin chore/repo-clean-$(date +%Y-%m-%d)"
echo ""
