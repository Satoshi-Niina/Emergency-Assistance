// 後方互換性のための再エクスポート
// 新しい構造への移行を容易にするため、既存のインポートパスを維持
export * from './src/schema';
export * from './src/types';
export * from './src/validation';
export * from './src/utils';
// 既存のコードとの互換性を保つため、元のエクスポートも維持
import { schema } from './src/schema';
export { schema as exampleSchema };
