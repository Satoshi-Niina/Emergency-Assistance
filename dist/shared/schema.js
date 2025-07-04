// 後方互換性のための再エクスポート
// 新しい構造への移行を容易にするため、既存のインポートパスを維持
export * from './schema.js';
export * from './types.js';
export * from './validation.js';
export * from './utils.js';
// 既存のコードとの互換性を保つため、元のエクスポートも維持
import { schema } from './schema.js';
export { schema as exampleSchema };
