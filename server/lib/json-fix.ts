"use strict";
/**
 * 厳密なJSON修復ユーティリティ
 * OpenAI APIからの不完全なJSONレスポンスを修復し、有効なJSONに変換するための関数群
 */
Object.defineProperty(exports, "__esModule", { value: true });
export const fixAndParseJSON: any = fixAndParseJSON;
/**
 * OpenAI APIからのJSONレスポンスを解析して修復する
 * @param jsonString JSON文字列
 * @returns 修復されたJSONオブジェクト
 */
function fixAndParseJSON(jsonString) {
    try {
        // まず直接パースを試みる
        return JSON.parse(jsonString);
    }
    catch (initialError) {
        console.log('直接JSONパースに失敗。修復を試みます...');
        // 余分な文字を取り除く
        var cleaned = jsonString
            .replace(/```json\s*/g, '')
            .replace(/```\s*/g, '')
            .replace(/```/g, '')
            .trim();
        // JSONの開始と終了を正確に特定
        var start = cleaned.indexOf('{');
        var end = cleaned.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
            cleaned = cleaned.substring(start, end + 1);
        }
        // 不完全なJSONを特定して修復
        try {
            var partialObject = JSON.parse(cleaned);
            // もし正常にパースできた場合はそのまま返す
            return partialObject;
        }
        catch (parseError) {
            // パースできなかった場合は、部分的なJSONの修復を試みる
            console.log('基本的な修復でも失敗。詳細修復を試みます');
            // エラーの位置を特定する
            var errorPosition = -1;
            var errorMessage = '';
            if (parseError instanceof Error) {
                errorMessage = parseError.message;
                // "JSON at position X" という形式のエラーメッセージから位置を抽出
                var posMatch = errorMessage.match(/position\s+(\d+)/i);
                if (posMatch && posMatch[1]) {
                    errorPosition = parseInt(posMatch[1], 10);
                }
            }
            if (errorPosition > 0) {
                console.log("\u30A8\u30E9\u30FC\u4F4D\u7F6E: ".concat(errorPosition, ", \u30E1\u30C3\u30BB\u30FC\u30B8: ").concat(errorMessage));
                // 問題のある部分の前後を出力
                var start_1 = Math.max(0, errorPosition - 20);
                var end_1 = Math.min(cleaned.length, errorPosition + 20);
                console.log("\u554F\u984C\u7B87\u6240\u306E\u5468\u8FBA: \"".concat(cleaned.substring(start_1, errorPosition), "<<<ERROR HERE>>>").concat(cleaned.substring(errorPosition, end_1), "\""));
                // 1. 途中で切れたオブジェクトの検出と修復
                var fixed = '';
                // エラー位置から末尾までに記述が切れている可能性がある
                if (errorPosition > cleaned.length * 0.9) {
                    // エラー位置が文字列の末尾付近なら、不足している閉じ括弧を追加
                    var _a = countBrackets(cleaned), braces = _a.braces, brackets = _a.brackets;
                    fixed = cleaned;
                    if (braces.open > braces.close) {
                        fixed += '}'.repeat(braces.open - braces.close);
                    }
                    if (brackets.open > brackets.close) {
                        fixed += ']'.repeat(brackets.open - brackets.close);
                    }
                }
                else {
                    // 途中で不正な文字や形式が含まれている場合
                    // エラー発生箇所の前後を分析し修復
                    var before = cleaned.substring(0, errorPosition);
                    var after = cleaned.substring(errorPosition);
                    // エラー箇所の文字を特定して修正または削除
                    var errorChar = cleaned.charAt(errorPosition);
                    console.log("\u30A8\u30E9\u30FC\u6587\u5B57: \"".concat(errorChar, "\""));
                    if (errorChar === ',') {
                        // 不要なカンマの除去
                        fixed = before + after.substring(1);
                    }
                    else if (errorChar === '"' || errorChar === "'") {
                        // 不完全な引用符の修正
                        fixed = before + after.substring(1);
                    }
                    else {
                        // その他の不正な文字・構造の場合
                        // 直前の有効なJSONまでを抽出して閉じる
                        fixed = repairIncompleteStructure(cleaned, errorPosition);
                    }
                }
                // 特殊文字の変換
                fixed = fixed
                    .replace(/[\u2018\u2019]/g, "'") // スマート引用符を単一引用符に
                    .replace(/[\u201C\u201D]/g, '"') // スマート二重引用符を二重引用符に
                    .replace(/,\s*}/g, '}') // 末尾のコンマを削除
                    .replace(/,\s*]/g, ']') // 末尾のコンマを削除
                    .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":'); // キーを適切に引用符で囲む
                try {
                    // 修復したJSONをパース
                    return JSON.parse(fixed);
                }
                catch (finalError) {
                    console.error('JSON修復の全ての試みが失敗しました');
                    // 最後の手段：すべての非ASCII文字を削除し、構造だけを維持する
                    var asciiOnly = cleaned.replace(/[^\x00-\x7F]/g, '');
                    try {
                        return JSON.parse(asciiOnly);
                    }
                    catch (e) {
                        throw new Error('JSON解析に失敗しました: ' + (finalError instanceof Error ? finalError.message : '不明なエラー'));
                    }
                }
            }
            else {
                // エラー位置を特定できなかった場合は一般的な修復を試みる
                var generalFixed = cleaned
                    .replace(/[\u2018\u2019]/g, "'") // スマート引用符を単一引用符に
                    .replace(/[\u201C\u201D]/g, '"') // スマート二重引用符を二重引用符に
                    .replace(/[^\x00-\x7F]/g, '') // ASCII以外の文字を削除
                    .replace(/,\s*}/g, '}') // 末尾のコンマを削除
                    .replace(/,\s*]/g, ']') // 末尾のコンマを削除
                    .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":'); // キーを適切に引用符で囲む
                var _b = countBrackets(generalFixed), braces = _b.braces, brackets = _b.brackets;
                var balancedJSON = generalFixed;
                if (braces.open > braces.close) {
                    balancedJSON += '}'.repeat(braces.open - braces.close);
                }
                if (brackets.open > brackets.close) {
                    balancedJSON += ']'.repeat(brackets.open - brackets.close);
                }
                try {
                    return JSON.parse(balancedJSON);
                }
                catch (e) {
                    throw new Error('JSON解析に失敗しました: ' + (e instanceof Error ? e.message : '不明なエラー'));
                }
            }
        }
    }
}
/**
 * 不完全なJSON構造を修復する
 * @param str JSON文字列
 * @param errorPos エラーが発生した位置
 * @returns 修復されたJSON文字列
 */
function repairIncompleteStructure(str: any, errorPos) {
    // エラー位置より前の部分を抽出
    var beforeError = str.substring(0, errorPos);
    // 直前の有効な構造を探す
    var lastValidObject = '';
    // 直前の閉じ括弧を探す（最後に正常に閉じたオブジェクトまで）
    var lastCloseBrace = beforeError.lastIndexOf('}');
    var lastCloseBracket = beforeError.lastIndexOf(']');
    if (lastCloseBrace > lastCloseBracket) {
        lastValidObject = beforeError.substring(0, lastCloseBrace + 1);
    }
    else if (lastCloseBracket > -1) {
        lastValidObject = beforeError.substring(0, lastCloseBracket + 1);
    }
    else {
        // 閉じ括弧が見つからない場合は、直前までの文字列を使用
        lastValidObject = beforeError;
    }
    // 残りの構造を復元するための括弧を追加
    var _a = countBrackets(lastValidObject), braces = _a.braces, brackets = _a.brackets;
    var fixed = lastValidObject;
    if (braces.open > braces.close) {
        fixed += '}'.repeat(braces.open - braces.close);
    }
    if (brackets.open > brackets.close) {
        fixed += ']'.repeat(brackets.open - brackets.close);
    }
    return fixed;
}
/**
 * 文字列内の括弧の数を数える
 * @param str 対象の文字列
 * @returns 括弧のカウント情報
 */
function countBrackets(str) {
    return {
        braces: {
            open: (str.match(/{/g) || []).length,
            close: (str.match(/}/g) || []).length
        },
        brackets: {
            open: (str.match(/\[/g) || []).length,
            close: (str.match(/\]/g) || []).length
        }
    };
}
