"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chunkText = chunkText;
exports.getChunkStats = getChunkStats;
const crypto_1 = __importDefault(require("crypto"));
/**
 * テキストをチャンクに分割する
 * @param text 分割対象のテキスト
 * @param options チャンクサイズとオーバーラップ設定
 * @returns チャンクの配列
 */
function chunkText(text, options = { size: 800, overlap: 80 }) {
    const { size, overlap } = options;
    // 入力検証
    if (!text || text.trim().length === 0) {
        return [];
    }
    if (size <= 0 || overlap < 0 || overlap >= size) {
        throw new Error('Invalid chunk options: size must be positive and overlap must be less than size');
    }
    // テキストを正規化（改行を空白に変換、連続空白を単一空白に）
    const normalizedText = text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (normalizedText.length <= size) {
        // テキストがチャンクサイズ以下の場合はそのまま返す
        const hash = crypto_1.default.createHash('sha1').update(normalizedText).digest('hex');
        return [
            {
                page: 1,
                content: normalizedText,
                hash,
            },
        ];
    }
    const chunks = [];
    let page = 1;
    let start = 0;
    while (start < normalizedText.length) {
        let end = start + size;
        // チャンクの境界を調整（単語の境界で切る）
        if (end < normalizedText.length) {
            // 次の空白を探す
            const nextSpace = normalizedText.indexOf(' ', end);
            if (nextSpace !== -1 && nextSpace - end < 50) {
                // 50文字以内に空白があれば調整
                end = nextSpace;
            }
        }
        const content = normalizedText.substring(start, end).trim();
        if (content.length > 0) {
            const hash = crypto_1.default.createHash('sha1').update(content).digest('hex');
            chunks.push({
                page,
                content,
                hash,
            });
            page++;
        }
        // 次の開始位置（オーバーラップを考慮）
        start = Math.max(start + 1, end - overlap);
        // 無限ループ防止
        if (start >= end) {
            break;
        }
    }
    return chunks;
}
/**
 * チャンクの統計情報を取得
 * @param chunks チャンク配列
 * @returns 統計情報
 */
function getChunkStats(chunks) {
    if (chunks.length === 0) {
        return {
            count: 0,
            totalLength: 0,
            avgLength: 0,
            minLength: 0,
            maxLength: 0,
        };
    }
    const lengths = chunks.map(chunk => chunk.content.length);
    const totalLength = lengths.reduce((sum, len) => sum + len, 0);
    return {
        count: chunks.length,
        totalLength,
        avgLength: Math.round(totalLength / chunks.length),
        minLength: Math.min(...lengths),
        maxLength: Math.max(...lengths),
    };
}
