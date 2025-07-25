import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import multer from 'multer';
import AdmZip from 'adm-zip';
import { log } from '../vite.js';
import { fileURLToPath } from 'url';
// 一時ファイルクリーンアップユーティリティ
function cleanupTempDirectory(dirPath) {
    if (!fs.existsSync(dirPath))
        return;
    try {
        const files: any = fs.readdirSync(dirPath);
        for (const file of files) {
            const filePath: any = path.join(dirPath, file);
            const stat: any = fs.statSync(filePath);
            if (stat.isDirectory()) {
                // 再帰的にディレクトリを削除
                cleanupTempDirectory(filePath);
                fs.rmdirSync(filePath);
            }
            else {
                // ファイルを削除
                fs.unlinkSync(filePath);
            }
        }
        console.log(`一時ディレクトリをクリーンアップしました: ${dirPath}`);
    }
    catch (error) {
        console.error(`一時ディレクトリのクリーンアップに失敗しました: ${dirPath}`, error);
    }
}
const router: any = Router();
// ディレクトリ構造の設定
const knowledgeBaseDir: any = path.resolve('./knowledge-base');
const pptDir: any = path.join(knowledgeBaseDir, 'ppt');
const jsonDir: any = path.join(knowledgeBaseDir, 'json');
const imageDir: any = path.join(knowledgeBaseDir, 'images');
const tempDir: any = path.join(knowledgeBaseDir, 'temp');
// knowledge-baseに完全に一元化されたため、uploadsディレクトリの参照は不要
// データの参照はすべてknowledge-baseディレクトリから行う
// ディレクトリの存在確認と作成（主にknowledge-base）
[knowledgeBaseDir, pptDir, jsonDir, imageDir, tempDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});
// Multerの設定
const storage: any = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, pptDir);
    },
    filename: (_req, file, cb) => {
        const timestamp: any = Date.now();
        const originalName: any = file.originalname;
        const extension: any = path.extname(originalName);
        const fileName = `guide_${timestamp}${extension}`;
        cb(null, fileName);
    }
});
// ファイルフィルター（許可する拡張子）
const fileFilter = (_req: any, file: any, cb) => {
    const allowedExtensions = ['.pptx', '.ppt', '.xlsx', '.xls', '.pdf', '.json'];
    const ext: any = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
        cb(null, true);
    }
    else {
        cb(new Error('サポートされていないファイル形式です。PowerPoint (.pptx, .ppt)、Excel (.xlsx, .xls)、PDF (.pdf)、または JSON (.json) ファイルのみアップロードできます。'));
    }
};
const upload: any = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    }
});
// 各種ファイル形式を処理してJSONデータに変換する関数
async function processFile(filePath) {
    try {
        const fileId = `guide_${Date.now()}`;
        const fileExtension: any = path.extname(filePath);
        // PPTXファイルを解凍してXMLとして処理
        if (fileExtension.toLowerCase() === '.pptx') {
            const zip: any = new AdmZip(filePath);
            const extractDir: any = path.join(tempDir, fileId);
            // 一時ディレクトリが存在することを確認
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            if (!fs.existsSync(extractDir)) {
                fs.mkdirSync(extractDir, { recursive: true });
            }
            // ZIPとして展開
            zip.extractAllTo(extractDir, true);
            // スライドXMLファイルを探す
            const slidesDir: any = path.join(extractDir, 'ppt', 'slides');
            const slideFiles: any = fs.existsSync(slidesDir)
                ? fs.readdirSync(slidesDir).filter(file => file.startsWith('slide') && file.endsWith('.xml'))
                : [];
            // スライドのテキスト内容を抽出
            const slides = [];
            for (let i = 0; i < slideFiles.length; i++) {
                const slideNumber: any = i + 1;
                const slideFilePath: any = path.join(slidesDir, slideFiles[i]);
                const slideContent: any = fs.readFileSync(slideFilePath, 'utf8');
                // 画像の参照を探す
                const imageRefs = [];
                const imageRegex = /r:embed="rId(\d+)"/g;
                let match;
                while ((match = imageRegex.exec(slideContent)) !== null) {
                    imageRefs.push(match[1]);
                }
                // テキスト内容の抽出
                const textRegex = /<a:t>(.*?)<\/a:t>/g;
                const texts = [];
                while ((match = textRegex.exec(slideContent)) !== null) {
                    if (match[1].trim()) {
                        texts.push(match[1].trim());
                    }
                }
                // ノート（スピーカーノート）の内容を取得
                const noteFilePath: any = path.join(extractDir, 'ppt', 'notesSlides', `notesSlide${slideNumber}.xml`);
                let noteContent = '';
                if (fs.existsSync(noteFilePath)) {
                    const noteXml: any = fs.readFileSync(noteFilePath, 'utf8');
                    const noteRegex = /<a:t>(.*?)<\/a:t>/g;
                    while ((match = noteRegex.exec(noteXml)) !== null) {
                        if (match[1].trim()) {
                            noteContent += match[1].trim() + '\n';
                        }
                    }
                }
                // メディアファイルを探して保存
                const imageTexts = [];
                const mediaDir: any = path.join(extractDir, 'ppt', 'media');
                if (fs.existsSync(mediaDir)) {
                    const mediaFiles: any = fs.readdirSync(mediaDir);
                    // 各画像ファイルを処理
                    for (const mediaFile of mediaFiles) {
                        const sourcePath: any = path.join(mediaDir, mediaFile);
                        const targetFileName = `${fileId}_slide${slideNumber}_${mediaFile}`;
                        const targetPath: any = path.join(imageDir, targetFileName);
                        // 画像をコピー
                        fs.copyFileSync(sourcePath, targetPath);
                        // 画像パスの作成（相対パス）
                        const relativePath = `/knowledge-base/images/${targetFileName}`;
                        // 画像に関連するテキストを見つける（画像の近くのテキスト要素から）
                        const imageText: any = texts.length > 0 ? texts[0] : '画像の説明がありません';
                        imageTexts.push({
                            画像パス: relativePath,
                            テキスト: imageText
                        });
                    }
                }
                // スライドデータの構築
                slides.push({
                    スライド番号: slideNumber,
                    タイトル: texts.length > 0 ? texts[0] : `スライド ${slideNumber}`,
                    本文: texts.slice(1), // 先頭（タイトル）以外のテキスト
                    ノート: noteContent,
                    画像テキスト: imageTexts
                });
            }
            // プレゼンテーションのメタデータを取得
            const corePropsPath: any = path.join(extractDir, 'docProps', 'core.xml');
            let title = path.basename(filePath, fileExtension);
            let creator = '';
            let created = new Date().toISOString();
            let modified = new Date().toISOString();
            if (fs.existsSync(corePropsPath)) {
                const coreProps: any = fs.readFileSync(corePropsPath, 'utf8');
                // タイトルを取得
                const titleMatch = /<dc:title>(.*?)<\/dc:title>/g.exec(coreProps);
                if (titleMatch && titleMatch[1]) {
                    title = titleMatch[1];
                }
                // 作成者を取得
                const creatorMatch = /<dc:creator>(.*?)<\/dc:creator>/g.exec(coreProps);
                if (creatorMatch && creatorMatch[1]) {
                    creator = creatorMatch[1];
                }
                // 作成日を取得
                const createdMatch = /<dcterms:created>(.*?)<\/dcterms:created>/g.exec(coreProps);
                if (createdMatch && createdMatch[1]) {
                    created = createdMatch[1];
                }
                // 更新日を取得
                const modifiedMatch = /<dcterms:modified>(.*?)<\/dcterms:modified>/g.exec(coreProps);
                if (modifiedMatch && modifiedMatch[1]) {
                    modified = modifiedMatch[1];
                }
            }
            // 一時ディレクトリを削除
            fs.rmSync(extractDir, { recursive: true, force: true });
            // 最終的なJSONオブジェクトを作成
            const result = {
                metadata: {
                    タイトル: title,
                    作成者: creator || 'Unknown',
                    作成日: created,
                    修正日: modified,
                    説明: `PowerPointから生成された応急復旧フロー「${title}」です。接続番号: 123`
                },
                slides
            };
            // JSONファイルに保存
            const jsonFilePath: any = path.join(jsonDir, `${fileId}_metadata.json`);
            fs.writeFileSync(jsonFilePath, JSON.stringify(result, null, 2));
            return {
                id: fileId,
                filePath: jsonFilePath,
                fileName: path.basename(filePath),
                title,
                createdAt: new Date().toISOString(),
                slideCount: slides.length,
                data: result
            };
        }
        else if (fileExtension.toLowerCase() === '.xlsx' || fileExtension.toLowerCase() === '.xls') {
            // Excelファイルの処理
            const fileName: any = path.basename(filePath, fileExtension);
            const slides = [];
            try {
                // XLSXライブラリを使用してExcelファイルを処理
                const XLSX = await import("xlsx");
                const workbook: any = XLSX.readFile(filePath);
                // シート名の一覧を取得
                const sheetNames: any = workbook.SheetNames;
                // 各シートを「スライド」として処理
                for (let i = 0; i < sheetNames.length; i++) {
                    const sheetName: any = sheetNames[i];
                    const worksheet: any = workbook.Sheets[sheetName];
                    // シートの内容をJSONに変換
                    const sheetData: any = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    // 空のシートをスキップ
                    if (sheetData.length === 0)
                        continue;
                    // テキスト内容を抽出（1行目をタイトル、残りを本文と見なす）
                    const title: any = Array.isArray(sheetData[0]) && sheetData[0].length > 0
                        ? String(sheetData[0][0] || `シート ${i + 1}`)
                        : `シート ${i + 1}`;
                    // 本文として残りの行を結合
                    const bodyTexts = [];
                    for (let j = 1; j < sheetData.length; j++) {
                        if (Array.isArray(sheetData[j])) {
                            const rowText: any = sheetData[j].filter((cell) => cell !== undefined && cell !== null)
                                .map((cell) => String(cell).trim())
                                .join(', ');
                            if (rowText) {
                                bodyTexts.push(rowText);
                            }
                        }
                    }
                    // スライドデータを追加
                    slides.push({
                        スライド番号: i + 1,
                        タイトル: title,
                        本文: bodyTexts,
                        ノート: `Excelシート「${sheetName}」から生成されました`,
                        画像テキスト: []
                    });
                }
                // 最終的なJSONオブジェクトを作成
                const result = {
                    metadata: {
                        タイトル: fileName,
                        作成者: 'Excel抽出',
                        作成日: new Date().toISOString(),
                        修正日: new Date().toISOString(),
                        説明: `Excelファイル「${fileName}」から生成された応急復旧フローです。接続番号: 123`
                    },
                    slides
                };
                // JSONファイルに保存
                const jsonFilePath: any = path.join(jsonDir, `${fileId}_metadata.json`);
                fs.writeFileSync(jsonFilePath, JSON.stringify(result, null, 2));
                return {
                    id: fileId,
                    filePath: jsonFilePath,
                    fileName: path.basename(filePath),
                    title: fileName,
                    createdAt: new Date().toISOString(),
                    slideCount: slides.length,
                    data: result
                };
            }
            catch (error) {
                console.error('Excelファイル処理エラー:', error);
                throw new Error('Excelファイルの処理に失敗しました');
            }
        }
        else if (fileExtension.toLowerCase() === '.pdf') {
            // PDFファイルの処理
            const fileName: any = path.basename(filePath, fileExtension);
            // PDFファイル処理の実装（例：テキスト抽出のみ）
            // 実際のPDF処理はpdfjs-distを使用します
            try {
                // PDFからのテキスト抽出機能を仮実装
                // 実際の実装では、より詳細なPDFの解析とテキスト抽出が必要
                const slides = [{
                        スライド番号: 1,
                        タイトル: fileName,
                        本文: ['PDFからテキストを抽出しました。接続番号: 123'],
                        ノート: 'PDFファイルから生成された応急復旧フローです',
                        画像テキスト: []
                    }];
                // 最終的なJSONオブジェクトを作成
                const result = {
                    metadata: {
                        タイトル: fileName,
                        作成者: 'PDF抽出',
                        作成日: new Date().toISOString(),
                        修正日: new Date().toISOString(),
                        説明: `PDFファイル「${fileName}」から生成された応急処置フローです`
                    },
                    slides
                };
                // JSONファイルに保存
                const jsonFilePath: any = path.join(jsonDir, `${fileId}_metadata.json`);
                fs.writeFileSync(jsonFilePath, JSON.stringify(result, null, 2));
                return {
                    id: fileId,
                    filePath: jsonFilePath,
                    fileName: path.basename(filePath),
                    title: fileName,
                    createdAt: new Date().toISOString(),
                    slideCount: slides.length,
                    data: result
                };
            }
            catch (error) {
                console.error('PDFファイル処理エラー:', error);
                throw new Error('PDFファイルの処理に失敗しました');
            }
        }
        else if (fileExtension.toLowerCase() === '.json') {
            // JSONファイルの処理
            console.log('JSONファイルを処理します:', filePath);
            const fileName: any = path.basename(filePath, fileExtension);
            try {
                // JSONファイルの内容を読み取る
                const jsonContent: any = fs.readFileSync(filePath, 'utf8');
                let jsonData = JSON.parse(jsonContent);
                // JSON構造を検証
                if (!jsonData) {
                    throw new Error('JSONファイルの解析に失敗しました。有効なJSONファイルを確認してください。');
                }
                console.log('元のJSONデータの構造:', Object.keys(jsonData));
                // トラブルシューティング形式かどうかを確認
                const isTroubleshootingFormat: any = jsonData.steps && Array.isArray(jsonData.steps);
                if (isTroubleshootingFormat) {
                    console.log('トラブルシューティング形式のJSONを検出しました。steps配列があります。');
                    // トラブルシューティング形式からガイド形式に変換
                    const convertedData = {
                        metadata: {
                            タイトル: jsonData.title || fileName || '応急処置フローデータ',
                            作成者: 'システム',
                            作成日: new Date().toISOString(),
                            修正日: new Date().toISOString(),
                            説明: jsonData.description || 'トラブルシューティングフローから生成された応急処置フローです',
                            原形式: 'troubleshooting'
                        },
                        slides: jsonData.steps.map((step, index) => ({
                            スライド番号: index + 1,
                            タイトル: step.title || `ステップ ${index + 1}`,
                            本文: [step.message || step.description || ''],
                            ノート: step.options ? `選択肢: ${step.options.map((opt) => opt.text).join(', ')}` : '',
                            画像テキスト: []
                        })),
                        original: jsonData // 元のJSONデータも保持
                    };
                    // 変換後のデータで置き換え
                    jsonData = convertedData;
                    console.log('トラブルシューティング形式からガイド形式に変換しました');
                }
                else {
                    // 標準的なガイド形式に変換
                    // 必要に応じて構造を構築（metadata、slidesがない場合は作成）
                    if (!jsonData.metadata) {
                        console.log('JSONにmetadataがないため、作成します');
                        jsonData.metadata = {
                            タイトル: jsonData.title || fileName || '応急処置フローデータ',
                            作成者: 'システム',
                            作成日: new Date().toISOString(),
                            修正日: new Date().toISOString(),
                            説明: jsonData.description || 'JSONファイルから生成された応急処置フローです'
                        };
                    }
                    if (!jsonData.slides || !Array.isArray(jsonData.slides)) {
                        console.log('JSONにslidesがないか配列ではないため、作成します');
                        // slidesを作成
                        jsonData.slides = [];
                        // stepsがあれば、それをslidesに変換
                        if (jsonData.steps && Array.isArray(jsonData.steps)) {
                            console.log('steps配列をslidesに変換します');
                            jsonData.slides = jsonData.steps.map((step, index) => ({
                                スライド番号: index + 1,
                                タイトル: step.title || `ステップ ${index + 1}`,
                                本文: [step.message || step.description || ''],
                                ノート: step.options ? `選択肢: ${step.options.map((opt) => opt.text).join(', ')}` : '',
                                画像テキスト: []
                            }));
                        }
                        else {
                            // データからシンプルなスライドを生成
                            const slideData = {
                                スライド番号: 1,
                                タイトル: jsonData.metadata?.タイトル || jsonData.title || fileName || 'JSONデータ',
                                本文: [jsonData.description || 'JSONデータから自動生成されたスライドです'],
                                ノート: 'JSONファイルから生成された内容です',
                                画像テキスト: []
                            };
                            jsonData.slides.push(slideData);
                        }
                    }
                }
                // 元のJSON形式を保存するためのトラブルシューティングディレクトリ
                const troubleshootingDir: any = path.join(__dirname, '../../knowledge-base/troubleshooting');
                // トラブルシューティングディレクトリが存在しない場合は作成
                if (!fs.existsSync(troubleshootingDir)) {
                    fs.mkdirSync(troubleshootingDir, { recursive: true });
                }
                // トラブルシューティング形式のJSONの場合、元の形式も保存
                if (isTroubleshootingFormat) {
                    const tsFilePath: any = path.join(troubleshootingDir, `${path.basename(fileName, '.json')}.json`);
                    fs.writeFileSync(tsFilePath, jsonContent);
                    console.log(`トラブルシューティング形式のJSONを保存しました: ${tsFilePath}`);
                }
                // 画像パスの修正（必要に応じて）
                jsonData.slides.forEach((slide) => {
                    if (slide.画像テキスト && Array.isArray(slide.画像テキスト)) {
                        slide.画像テキスト.forEach((imgText) => {
                            if (imgText.画像パス && imgText.画像パス.startsWith('/uploads/')) {
                                imgText.画像パス = imgText.画像パス.replace('/uploads/', '/knowledge-base/');
                            }
                        });
                    }
                });
                // メタデータの更新
                jsonData.metadata.作成日 = jsonData.metadata.作成日 || new Date().toISOString();
                jsonData.metadata.修正日 = new Date().toISOString();
                // 説明を更新し、「応急復旧」を「応急処置」に統一
                if (jsonData.metadata.説明 && jsonData.metadata.説明.includes('応急復旧')) {
                    jsonData.metadata.説明 = jsonData.metadata.説明.replace(/応急復旧/g, '応急処置');
                }
                // タイトルの「応急復旧」を「応急処置」に統一
                if (jsonData.metadata.タイトル && jsonData.metadata.タイトル.includes('応急復旧')) {
                    jsonData.metadata.タイトル = jsonData.metadata.タイトル.replace(/応急復旧/g, '応急処置');
                }
                // 新しいJSONファイルに保存
                const jsonFilePath: any = path.join(jsonDir, `${fileId}_metadata.json`);
                fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2));
                return {
                    id: fileId,
                    filePath: jsonFilePath,
                    fileName: path.basename(filePath),
                    title: jsonData.metadata.タイトル || fileName,
                    createdAt: new Date().toISOString(),
                    slideCount: jsonData.slides.length,
                    data: jsonData
                };
            }
            catch (error) {
                console.error('JSONファイル処理エラー:', error);
                throw new Error(`JSONファイルの処理に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
            }
        }
        else {
            throw new Error('サポートされていないファイル形式です');
        }
    }
    catch (error) {
        console.error('ファイル処理エラー:', error);
        throw error;
    }
}
// ファイルアップロードと処理のエンドポイント
router.post('/process', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'ファイルがアップロードされていません' });
        }
        const filePath: any = req.file.path;
        log(`ファイル処理: ${filePath}`);
        const result: any = await processFile(filePath);
        // knowledge-baseディレクトリにすでに直接保存されているため、コピー不要
        console.log(`ファイルはknowledge-baseディレクトリに直接処理されました: ${result.filePath}`);
        // 元のアップロードファイルを削除（データ抽出とJSON生成が完了したため）
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`元のアップロードファイルを削除しました: ${filePath}`);
            }
        }
        catch (cleanupError) {
            console.error(`ファイル削除エラー: ${cleanupError}`);
            // ファイル削除に失敗しても処理は続行
        }
        // 一時ディレクトリをクリーンアップ
        if (fs.existsSync(tempDir)) {
            cleanupTempDirectory(tempDir);
        }
        // メモリキャッシュがあれば削除
        if (typeof global !== 'undefined' && global.fileCache) {
            delete global.fileCache[filePath];
        }
        return res.json({
            success: true,
            message: 'ファイルが正常に処理されました',
            guideId: result.id,
            data: result
        });
    }
    catch (error) {
        console.error('ファイル処理エラー:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : '不明なエラーが発生しました'
        });
    }
});
// ガイドファイル一覧を取得するエンドポイント
router.get('/list', (_req, res) => {
    try {
        // メインのJSONディレクトリをチェック
        if (!fs.existsSync(jsonDir)) {
            fs.mkdirSync(jsonDir, { recursive: true });
            console.log(`jsonDirが存在しなかったため作成しました: ${jsonDir}`);
        }
        // メインのJSONディレクトリからファイルを取得
        const jsonFiles: any = fs.existsSync(jsonDir)
            ? fs.readdirSync(jsonDir).filter(file => file.endsWith('_metadata.json'))
            : [];
        console.log(`jsonDirから${jsonFiles.length}個のメタデータファイルを取得しました`);
        // トラブルシューティングディレクトリをチェック
        const troubleshootingDir: any = path.join(__dirname, '../../knowledge-base/troubleshooting');
        if (!fs.existsSync(troubleshootingDir)) {
            fs.mkdirSync(troubleshootingDir, { recursive: true });
            console.log(`troubleshootingDirが存在しなかったため作成しました: ${troubleshootingDir}`);
        }
        // トラブルシューティングディレクトリからファイルを取得
        const troubleshootingFiles: any = fs.existsSync(troubleshootingDir)
            ? fs.readdirSync(troubleshootingDir).filter(file => file.endsWith('.json'))
            : [];
        console.log(`troubleshootingDirから${troubleshootingFiles.length}個のJSONファイルを取得しました`);
        // ガイドリストの構築
        const guides = [];
        // メインJSONディレクトリからのガイド
        jsonFiles.forEach(file => {
            try {
                const filePath: any = path.join(jsonDir, file);
                const content: any = fs.readFileSync(filePath, 'utf8');
                const data: any = JSON.parse(content);
                const id: any = file.split('_')[0] + '_' + file.split('_')[1];
                guides.push({
                    id,
                    filePath,
                    fileName: file,
                    title: data.metadata?.タイトル || path.basename(file, '_metadata.json'),
                    createdAt: data.metadata?.作成日 || new Date().toISOString(),
                    slideCount: Array.isArray(data.slides) ? data.slides.length : 0,
                    source: 'regular'
                });
            }
            catch (err) {
                console.error(`ファイル ${file} の処理中にエラーが発生しました:`, err);
            }
        });
        // トラブルシューティングディレクトリからのガイド
        troubleshootingFiles.forEach(file => {
            try {
                const filePath: any = path.join(troubleshootingDir, file);
                const content: any = fs.readFileSync(filePath, 'utf8');
                const data: any = JSON.parse(content);
                // ファイル名からIDを取得（拡張子を除く）
                const id: any = path.basename(file, '.json');
                guides.push({
                    id: `ts_${id}`, // トラブルシューティングの識別子をつける
                    filePath,
                    fileName: file,
                    title: data.metadata?.タイトル || data.title || id,
                    createdAt: data.metadata?.作成日 || data.createdAt || new Date().toISOString(),
                    slideCount: Array.isArray(data.slides) ? data.slides.length : (Array.isArray(data.steps) ? data.steps.length : 0),
                    source: 'troubleshooting'
                });
            }
            catch (err) {
                console.error(`トラブルシューティングファイル ${file} の処理中にエラーが発生しました:`, err);
            }
        });
        // 作成日の新しい順にソート
        guides.sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        console.log(`合計${guides.length}個のガイドを取得しました`);
        res.json(guides);
    }
    catch (error) {
        console.error('ガイド一覧取得エラー:', error);
        res.status(500).json({ error: 'ガイド一覧の取得に失敗しました' });
    }
});
// 特定のガイド詳細データを取得するエンドポイント
router.get('/detail/:id', (req, res) => {
    try {
        const id: any = req.params.id;
        // トラブルシューティングファイルかどうかをチェック
        if (id.startsWith('ts_')) {
            // トラブルシューティングファイルの場合
            const troubleshootingDir: any = path.join(__dirname, '../../knowledge-base/troubleshooting');
            const tsId: any = id.replace('ts_', ''); // プレフィックスを削除
            const filePath: any = path.join(troubleshootingDir, `${tsId}.json`);
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'トラブルシューティングファイルが見つかりません' });
            }
            const content: any = fs.readFileSync(filePath, 'utf8');
            const jsonData: any = JSON.parse(content);
            // データ構造を標準化
            const data = {
                metadata: jsonData.metadata || {
                    タイトル: jsonData.title || tsId,
                    作成者: 'システム',
                    作成日: jsonData.createdAt || new Date().toISOString(),
                    修正日: new Date().toISOString(),
                    説明: jsonData.description || 'トラブルシューティングフロー'
                },
                slides: jsonData.slides || []
            };
            // stepsがあれば、slidesに変換
            if (jsonData.steps && Array.isArray(jsonData.steps) && data.slides.length === 0) {
                data.slides = jsonData.steps.map((step, index) => ({
                    スライド番号: index + 1,
                    タイトル: step.title || `ステップ ${index + 1}`,
                    本文: [step.description || ''],
                    ノート: step.note || '',
                    画像テキスト: step.imageUrl ? [{
                            画像パス: step.imageUrl,
                            テキスト: step.imageCaption || ''
                        }] : []
                }));
            }
            res.json({
                id,
                filePath,
                fileName: path.basename(filePath),
                data,
                source: 'troubleshooting'
            });
        }
        else {
            // 通常のガイドファイルの場合
            const files: any = fs.readdirSync(jsonDir)
                .filter(file => file.startsWith(id) && file.endsWith('_metadata.json'));
            if (files.length === 0) {
                return res.status(404).json({ error: 'ガイドが見つかりません' });
            }
            const filePath: any = path.join(jsonDir, files[0]);
            const content: any = fs.readFileSync(filePath, 'utf8');
            const data: any = JSON.parse(content);
            res.json({
                id,
                filePath,
                fileName: files[0],
                data,
                source: 'regular'
            });
        }
    }
    catch (error) {
        console.error('ガイド詳細取得エラー:', error);
        res.status(500).json({ error: 'ガイド詳細の取得に失敗しました' });
    }
});
// ガイドデータを更新するエンドポイント
router.post('/update/:id', (req, res) => {
    try {
        const id: any = req.params.id;
        const { data } = req.body;
        if (!data) {
            return res.status(400).json({ error: 'データが提供されていません' });
        }
        // トラブルシューティングファイルかどうかをチェック
        if (id.startsWith('ts_')) {
            // トラブルシューティングファイルの場合
            const troubleshootingDir: any = path.join(__dirname, '../../knowledge-base/troubleshooting');
            const tsId: any = id.replace('ts_', ''); // プレフィックスを削除
            const filePath: any = path.join(troubleshootingDir, `${tsId}.json`);
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'トラブルシューティングファイルが見つかりません' });
            }
            // 元のデータを読み込む
            const content: any = fs.readFileSync(filePath, 'utf8');
            const originalData: any = JSON.parse(content);
            // 元データを完全に置き換える新しいデータを構築
            const updatedTsData = {
                id: originalData.id || tsId,
                title: data.metadata?.タイトル || originalData.title || tsId,
                description: data.metadata?.説明 || originalData.description || '',
                triggerKeywords: originalData.triggerKeywords || [],
                steps: [],
                updatedAt: new Date().toISOString()
            };
            // スライドからステップに完全変換
            if (data.slides && Array.isArray(data.slides)) {
                updatedTsData.steps = data.slides.map((slide, index) => ({
                    id: slide.id || `step${index + 1}`,
                    title: slide.タイトル || `ステップ ${index + 1}`,
                    description: Array.isArray(slide.本文) ? slide.本文.join('\n') : (slide.本文 || ''),
                    message: Array.isArray(slide.本文) ? slide.本文.join('\n') : (slide.本文 || ''),
                    imageUrl: slide.imageUrl || '',
                    type: slide.type || 'step',
                    options: slide.options || []
                }));
            }
            else {
                // 既存のステップ構造を保持
                updatedTsData.steps = originalData.steps || [];
            }
            // 更新日時を設定
            updatedTsData.updatedAt = new Date().toISOString();
            // 既存ファイルを削除してから完全に新しいデータで置き換え
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            // 新しいデータで完全上書き
            fs.writeFileSync(filePath, JSON.stringify(updatedTsData, null, 2), 'utf8');
            // 通常のJSONとしても保存（バックアップ）
            if (data.metadata) {
                data.metadata.修正日 = new Date().toISOString();
            }
            // メモリキャッシュがあれば削除
            if (typeof global !== 'undefined' && global.fileCache) {
                delete global.fileCache[filePath];
            }
            // トラブルシューティングファイルの対応するメタデータファイルを取得
            const guideFileName = `ts_${tsId}_metadata.json`;
            const guideFilePath: any = path.join(jsonDir, guideFileName);
            // メタデータファイルが存在する場合は更新
            if (fs.existsSync(guideFilePath)) {
                fs.writeFileSync(guideFilePath, JSON.stringify(data, null, 2));
            }
            res.json({
                success: true,
                message: 'トラブルシューティングデータが更新されました',
                id
            });
        }
        else {
            // 通常のガイドファイルの場合
            const files: any = fs.readdirSync(jsonDir)
                .filter(file => file.startsWith(id) && file.endsWith('_metadata.json'));
            if (files.length === 0) {
                return res.status(404).json({ error: 'ガイドが見つかりません' });
            }
            const filePath: any = path.join(jsonDir, files[0]);
            // 更新日時を現在の日時に設定
            if (data.metadata) {
                data.metadata.修正日 = new Date().toISOString();
            }
            // ファイルに書き込み
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            res.json({
                success: true,
                message: 'ガイドデータが更新されました',
                id
            });
        }
    }
    catch (error) {
        console.error('ガイド更新エラー:', error);
        res.status(500).json({ error: 'ガイドの更新に失敗しました' });
    }
});
// ガイドデータを削除するエンドポイント
router.delete('/delete/:id', (req, res) => {
    try {
        const id: any = req.params.id;
        // トラブルシューティングファイルかどうかをチェック
        if (id.startsWith('ts_')) {
            // トラブルシューティングファイルの場合
            const troubleshootingDir: any = path.join(__dirname, '../../knowledge-base/troubleshooting');
            const tsId: any = id.replace('ts_', ''); // プレフィックスを削除
            const filePath: any = path.join(troubleshootingDir, `${tsId}.json`);
            if (fs.existsSync(filePath)) {
                // ファイルを削除
                fs.unlinkSync(filePath);
                console.log(`トラブルシューティングファイルを削除しました: ${filePath}`);
            }
            // 対応するメタデータファイルも削除
            const guideFileName = `ts_${tsId}_metadata.json`;
            const guideFilePath: any = path.join(jsonDir, guideFileName);
            if (fs.existsSync(guideFilePath)) {
                fs.unlinkSync(guideFilePath);
                console.log(`メタデータファイルを削除しました: ${guideFilePath}`);
            }
        }
        else {
            // 通常のガイドファイルの場合
            const files: any = fs.readdirSync(jsonDir)
                .filter(file => file.startsWith(id) && file.endsWith('_metadata.json'));
            if (files.length === 0) {
                return res.status(404).json({ error: 'ガイドが見つかりません' });
            }
            const filePath: any = path.join(jsonDir, files[0]);
            if (fs.existsSync(filePath)) {
                // ファイルを削除
                fs.unlinkSync(filePath);
                console.log(`ガイドファイルを削除しました: ${filePath}`);
            }
        }
        res.json({
            success: true,
            message: 'ガイドデータが削除されました',
            id
        });
    }
    catch (error) {
        console.error('ガイド削除エラー:', error);
        res.status(500).json({ error: 'ガイドの削除に失敗しました' });
    }
});
// チャットに応急処置ガイドを送信するエンドポイント
router.post('/send-to-chat/:guideId/:chatId', async (req, res) => {
    try {
        const { guideId, chatId } = req.params;
        // ガイドデータを取得
        const files: any = fs.readdirSync(jsonDir)
            .filter(file => file.startsWith(guideId) && file.endsWith('_metadata.json'));
        if (files.length === 0) {
            return res.status(404).json({ error: 'ガイドが見つかりません' });
        }
        const filePath: any = path.join(jsonDir, files[0]);
        const content: any = fs.readFileSync(filePath, 'utf8');
        const guideData: any = JSON.parse(content);
        // チャットにメッセージを送信するAPIを呼び出す
        const response: any = await fetch(`http://localhost:${process.env.PORT || 3000}/api/chats/${chatId}/messages/system`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: `応急処置フロー「${guideData.metadata.タイトル}」が共有されました。\n\n${guideData.metadata.説明}`,
                isUserMessage: false
            })
        });
        if (!response.ok) {
            throw new Error('チャットへのメッセージ送信に失敗しました');
        }
        const result: any = await response.json();
        res.json({
            success: true,
            message: '応急処置フローがチャットに送信されました',
            messageId: result.id
        });
    }
    catch (error) {
        console.error('フロー送信エラー:', error);
        res.status(500).json({ error: '応急処置フローのチャットへの送信に失敗しました' });
    }
});
export { router as emergencyGuideRouter };
