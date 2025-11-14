#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""文字化け修正スクリプト"""

import os
import re

# 文字化けパターンと修正後の文字列のマッピング
# 複合パターンも含む
replacements = {
    # 複合パターン（長いものから順に）
    '編雁EのチEEタ': '編集のデータ',
    '編雁Eータ読み込み開姁E': '編集データ読み込み開始',
    '編雁E象ファイルパス設宁E': '編集対象ファイルパス設定',
    '編雁E面の状態': '編集画面の状態',
    '編雁Eタブに': '編集タブに',
    '編雁E/CardTitle': '編集</CardTitle>',
    '編雁Eリア': '編集エリア',
    'チEEタ読み込み': 'データ読み込み',
    'チEEタの取得': 'データの取得',
    'チEEタが見つかりません': 'データが見つかりません',
    'チEEタ警告': 'データ警告',
    'チEEタ整合性': 'データ整合性',
    'チEEタ構造': 'データ構造',
    'チEEタが空': 'データが空',
    'チEEタを送信': 'データを送信',
    'チEEタ詳細': 'データ詳細',
    'チEEタ警呁E': 'データ警告',
    'チEEタ確誁E': 'データ確認',
    'チEEタID': 'データID',
    'スチEプ数': 'ステップ数',
    'スチEプデータ': 'ステップデータ',
    'スチEプ画像': 'ステップ画像',
    'スチEプ[': 'ステップ[',
    'スチEプ]': 'ステップ]',
    'スチEプが含まれて': 'ステップが含まれて',
    'スチEプを': 'ステップを',
    'スチEプ': 'ステップ',
    'チEチE': 'デバッグ',
    'チE': 'デ',
    '編雁EのチEEタ': '編集のデータ',
    '編雁Eリア': '編集エリア',
    '編雁E/CardTitle': '編集</CardTitle>',
    '編雁E': '編集',
    '古ぁEEロパティ': '古いプロパティ',
    '古ぁEロパティ': '古いプロパティ',
    'プププププププロパティ': 'プロパティ',
    'ププププププ': 'プ',
    'チEEタ': 'データ',
    '開姁E': '開始',
    '惁E': '情報',
    '取征E': '取得',
    '設宁E': '設定',
    'キャチEュ': 'キャッシュ',
    '完亁E': '完了',
    'エンドEイント': 'エンドポイント',
    '構篁E': '構築',
    '呼び出ぁE': '呼び出し',
    '状慁E': '状態',
    '処琁E': '処理',
    '確誁E': '確認',
    'エチEター': 'エディター',
    '厳寁E': '厳密',
    'チェチE': 'チェック',
    '配E': '配列',
    '古ぁE': '古い',
    '確俁E': '確保',
    '✁E': '✅',
    '❁E': '❌',
    '🗑EE': '🗑️ ',
    '物琁E': '物理',
    '完E': '完全',
    'アイチE': 'アイテム',
    '警呁E': '警告',
    '実衁E': '実行',
    '皁E': '的',
    '検E': '検出',
    '改喁E': '改善',
    '姁E': '開始',
    '亁E': '完了',
    '場吁E': '場合',
    '式E': '式の',
    'ロパティ': 'プロパティ',
    'にEE': 'にする',
    '含まれてぁEせん': '含まれていません',
    'アチEE': 'アップロード',
    '失敁E': '失敗',
    '除夁E': '除外',
    'メチEージ': 'メッセージ',
    'なぁE': 'ない',
    'なぁE場合': 'ない場合',
    'なぁE画像': 'ない画像',
    'なぁE画像URL': 'ない画像URL',
    'なぁE場合E': 'ない場合',
    'なぁE場合EスキチEE': 'ない場合はスキップ',
    '無ぁE': '無い',
    '無ぁE場合': '無い場合',
    '無ぁE場合E': '無い場合',
    '無ぁE場合EURL': '無い場合はURL',
    '無効でなぁE': '無効でない',
    '無効でなぁE場合': '無効でない場合',
    '無効でなぁE場合E': '無効でない場合',
    '無効でなぁE場合EスキチEE': '無効でない場合はスキップ',
    'スキチEE': 'スキップ',
    'スキチE': 'スキ',
    '琁E': '理',
    '琁E始': '理開始',
    '琁E完了': '理完了',
    '琁E対象': '理対象',
    '琁E済み': '理済み',
    '琁E': '理',
}

def fix_file(filepath):
    """ファイルの文字化けを修正"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        # 文字化けパターンを修正（長いパターンから順に）
        for pattern, replacement in sorted(replacements.items(), key=lambda x: -len(x[0])):
            content = content.replace(pattern, replacement)

        if content != original_content:
            # UTF-8 (BOMなし)で保存
            with open(filepath, 'w', encoding='utf-8', newline='') as f:
                f.write(content)
            print(f"修正完了: {filepath}")
            return True
        else:
            print(f"修正不要: {filepath}")
            return False
    except Exception as e:
        print(f"エラー ({filepath}): {e}")
        return False

if __name__ == '__main__':
    # emergency-guideディレクトリ内のすべての.tsxファイルを修正
    base_dir = 'client/src/components/emergency-guide'
    fixed_count = 0

    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.endswith('.tsx'):
                filepath = os.path.join(root, file)
                if fix_file(filepath):
                    fixed_count += 1

    print(f"\n修正完了: {fixed_count}ファイル")

