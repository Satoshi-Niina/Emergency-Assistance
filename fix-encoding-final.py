#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""文字化け修正スクリプト（最終版）"""

import os
import re

def fix_file(filepath):
    """ファイルの文字化けを修正"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # 文字化けパターンを修正（正規表現を使用）
        # 編雁E -> 編集
        content = re.sub(r'編雁E', '編集', content)
        # チEEタ -> データ
        content = re.sub(r'チEEタ', 'データ', content)
        # チE -> デ
        content = re.sub(r'チE(?!チE)', 'デ', content)
        # ププププププ -> プロパティ
        content = re.sub(r'プププププププ?プロパティ', 'プロパティ', content)
        content = re.sub(r'ププププププ', 'プ', content)
        # 古ぁE -> 古い
        content = re.sub(r'古ぁE+ロパティ', '古いプロパティ', content)
        
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

