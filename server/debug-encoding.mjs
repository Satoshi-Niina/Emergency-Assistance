// 簡易デバッグ用：直接ファイルのエンコーディングをテスト
import fs from 'fs/promises';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const chardet = require('chardet');
const iconv = require('iconv-lite');

const filePath = process.argv[2];

if (!filePath) {
  console.log('Usage: node debug-encoding.mjs <file-path>');
  process.exit(1);
}

(async () => {
  try {
    const buffer = await fs.readFile(filePath);
    
    console.log('=== File Information ===');
    console.log('File size:', buffer.length, 'bytes');
    console.log('First 20 bytes (hex):', buffer.slice(0, 20).toString('hex'));
    console.log('First 20 bytes (decimal):', Array.from(buffer.slice(0, 20)));
    
    // BOM check
    console.log('\n=== BOM Check ===');
    if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      console.log('✅ UTF-8 BOM detected');
    } else if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
      console.log('✅ UTF-16 LE BOM detected');
    } else if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
      console.log('✅ UTF-16 BE BOM detected');
    } else {
      console.log('❌ No BOM detected');
    }
    
    // Chardet detection
    console.log('\n=== Chardet Detection ===');
    const sampleSize = Math.min(buffer.length, 4096);
    const detected = chardet.detect(buffer.slice(0, sampleSize));
    console.log('Detected encoding:', detected);
    
    // Try different encodings
    console.log('\n=== Decoding Attempts ===');
    
    const encodings = ['utf8', 'shift_jis', 'euc-jp', 'iso-8859-1'];
    
    for (const enc of encodings) {
      try {
        let text = '';
        if (enc === 'utf8') {
          text = buffer.toString('utf8');
        } else if (iconv.encodingExists(enc)) {
          text = iconv.decode(buffer, enc);
        } else {
          continue;
        }
        
        const replacementCount = (text.match(/\uFFFD/g) || []).length;
        const replacementRatio = text.length > 0 ? (replacementCount / text.length) * 100 : 100;
        
        console.log(`\n${enc.toUpperCase()}:`);
        console.log(`  Replacement chars: ${replacementCount} (${replacementRatio.toFixed(2)}%)`);
        console.log(`  First 100 chars: "${text.substring(0, 100)}"`);
      } catch (err) {
        console.log(`\n${enc.toUpperCase()}: Error - ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
