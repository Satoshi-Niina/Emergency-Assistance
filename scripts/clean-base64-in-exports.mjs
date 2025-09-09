#!/usr/bin/env node
/**
 * knowledge-base/exports 内のチャットエクスポートJSONから巨大な Base64 DataURL 画像を除去/マスクするスクリプト
 * 目的: リポジトリ肥大化防止・履歴軽量化
 *
 * 動作:
 *  - message.content が data:image/ で始まる場合、プレースホルダに置換
 *  - message.media[].url が data:image/ の場合も置換
 *
 * オプション:
 *  --dry-run  : 変更を書き込まず統計のみ表示
 *  --backup   : .bak ファイルを作成
 *  --threshold=<bytes> : Base64文字列長が閾値未満なら残す(デフォルト 2000)
 */
import fs from 'fs';
import path from 'path';

const exportsDir = path.join(process.cwd(), 'knowledge-base', 'exports');
if (!fs.existsSync(exportsDir)) {
  console.error('exports ディレクトリが見つかりません:', exportsDir);
  process.exit(1);
}

const args = process.argv.slice(2);
const isDry = args.includes('--dry-run');
const doBackup = args.includes('--backup');
const thresholdArg = args.find(a => a.startsWith('--threshold='));
const threshold = thresholdArg ? parseInt(thresholdArg.split('=')[1], 10) : 2000;

let fileCount = 0;
let modifiedCount = 0;
let totalImagesRemoved = 0;

for (const file of fs.readdirSync(exportsDir)) {
  if (!file.endsWith('.json')) continue;
  const fullPath = path.join(exportsDir, file);
  let json;
  try {
    const text = fs.readFileSync(fullPath, 'utf8');
    json = JSON.parse(text);
  } catch (e) {
    console.warn('JSON読み込み失敗: ', file, e.message);
    continue;
  }
  fileCount++;

  if (!Array.isArray(json.messages)) continue;

  let fileModified = false;
  for (const msg of json.messages) {
    if (typeof msg.content === 'string' && msg.content.startsWith('data:image/')) {
      if (msg.content.length >= threshold) {
        totalImagesRemoved++;
        msg.content = `[image removed length=${msg.content.length}]`;
        fileModified = true;
      }
    }
    if (Array.isArray(msg.media)) {
      for (const media of msg.media) {
        if (media && typeof media.url === 'string' && media.url.startsWith('data:image/') && media.url.length >= threshold) {
          totalImagesRemoved++;
          media.url = `[image removed length=${media.url.length}]`;
          fileModified = true;
        }
      }
    }
  }

  if (fileModified) {
    modifiedCount++;
    if (!isDry) {
      if (doBackup) {
        fs.copyFileSync(fullPath, fullPath + '.bak');
      }
      fs.writeFileSync(fullPath, JSON.stringify(json, null, 2), 'utf8');
      console.log('✔ クリーニング:', file);
    } else {
      console.log('DRY: 変更予定ファイル ->', file);
    }
  }
}

console.log('\n=== 結果 ===');
console.log('対象ファイル数:', fileCount);
console.log('変更したファイル数:', modifiedCount);
console.log('除去(マスク)した画像数:', totalImagesRemoved);
console.log('Dry-run:', isDry);
console.log('Backup:', doBackup);
console.log('閾値(bytes):', threshold);
