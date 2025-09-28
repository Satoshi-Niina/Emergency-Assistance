import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import multer from 'multer';
import AdmZip from 'adm-zip';

import { fileURLToPath } from 'url';
// 一時ファイルクリーンアチE�EユーチE��リチE��
function cleanupTempDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  try {
    const files: any = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath: any = path.join(dirPath, file);
      const stat: any = fs.statSync(filePath);
      if (stat.isDirectory()) {
        // 再帰皁E��チE��レクトリを削除
        cleanupTempDirectory(filePath);
        fs.rmdirSync(filePath);
      } else {
        // ファイルを削除
        fs.unlinkSync(filePath);
      }
    }
    console.console.log(`一時ディレクトリをクリーンアチE�Eしました: ${dirPath}`);
  } catch (error) {
    console.error(
      `一時ディレクトリのクリーンアチE�Eに失敗しました: ${dirPath}`,
      error
    );
  }
}
const router: any = Router();
// チE��レクトリ構造の設宁E
const knowledgeBaseDir: any = path.join(process.cwd(), 'knowledge-base');
const pptDir: any = path.join(knowledgeBaseDir, 'ppt');
const jsonDir: any = path.join(knowledgeBaseDir, 'json');
const imageDir: any = path.join(knowledgeBaseDir, 'images');
const tempDir: any = path.join(knowledgeBaseDir, 'temp');
// knowledge-baseに完�Eに一允E��されたため、uploadsチE��レクトリの参�Eは不要E
// チE�Eタの参�Eはすべてknowledge-baseチE��レクトリから行う
// チE��レクトリの存在確認と作�E�E�主にknowledge-base�E�E
[knowledgeBaseDir, pptDir, jsonDir, imageDir, tempDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});
// Multerの設宁E
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
  },
});
// ファイルフィルター�E�許可する拡張子！E
const fileFilter = (_req: any, file: any, cb) => {
  const allowedExtensions = ['.pptx', '.ppt', '.xlsx', '.xls', '.pdf', '.json'];
  const ext: any = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'サポ�EトされてぁE��ぁE��ァイル形式です。PowerPoint (.pptx, .ppt)、Excel (.xlsx, .xls)、PDF (.pdf)、また�E JSON (.json) ファイルのみアチE�Eロードできます、E
      )
    );
  }
};
const upload: any = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});
// 吁E��ファイル形式を処琁E��てJSONチE�Eタに変換する関数
async function processFile(filePath) {
  try {
    const fileId = `guide_${Date.now()}`;
    const fileExtension: any = path.extname(filePath);
    // PPTXファイルを解凍してXMLとして処琁E
    if (fileExtension.toLowerCase() === '.pptx') {
      const zip: any = new AdmZip(filePath);
      const extractDir: any = path.join(tempDir, fileId);
      // 一時ディレクトリが存在することを確誁E
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      if (!fs.existsSync(extractDir)) {
        fs.mkdirSync(extractDir, { recursive: true });
      }
      // ZIPとして展開
      zip.extractAllTo(extractDir, true);
      // スライドXMLファイルを探ぁE
      const slidesDir: any = path.join(extractDir, 'ppt', 'slides');
      const slideFiles: any = fs.existsSync(slidesDir)
        ? fs
            .readdirSync(slidesDir)
            .filter(file => file.startsWith('slide') && file.endsWith('.xml'))
        : [];
      // スライド�EチE��スト�E容を抽出
      const slides = [];
      for (let i = 0; i < slideFiles.length; i++) {
        const slideNumber: any = i + 1;
        const slideFilePath: any = path.join(slidesDir, slideFiles[i]);
        const slideContent: any = fs.readFileSync(slideFilePath, 'utf8');
        // 画像�E参�Eを探ぁE
        const imageRefs = [];
        const imageRegex = /r:embed="rId(\d+)"/g;
        let match;
        while ((match = imageRegex.exec(slideContent)) !== null) {
          imageRefs.push(match[1]);
        }
        // チE��スト�E容の抽出
        const textRegex = /<a:t>(.*?)<\/a:t>/g;
        const texts = [];
        while ((match = textRegex.exec(slideContent)) !== null) {
          if (match[1].trim()) {
            texts.push(match[1].trim());
          }
        }
        // ノ�Eト（スピ�Eカーノ�Eト）�E冁E��を取征E
        const noteFilePath: any = path.join(
          extractDir,
          'ppt',
          'notesSlides',
          `notesSlide${slideNumber}.xml`
        );
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
        // メチE��アファイルを探して保孁E
        const imageTexts = [];
        const mediaDir: any = path.join(extractDir, 'ppt', 'media');
        if (fs.existsSync(mediaDir)) {
          const mediaFiles: any = fs.readdirSync(mediaDir);
          // 吁E��像ファイルを�E琁E
          for (const mediaFile of mediaFiles) {
            const sourcePath: any = path.join(mediaDir, mediaFile);
            const targetFileName = `${fileId}_slide${slideNumber}_${mediaFile}`;
            const targetPath: any = path.join(imageDir, targetFileName);
            // 画像をコピ�E
            fs.copyFileSync(sourcePath, targetPath);
            // 画像パスの作�E�E�相対パス�E�E
            const relativePath = `/knowledge-base/images/${targetFileName}`;
            // 画像に関連するチE��ストを見つける�E�画像�E近くのチE��スト要素から�E�E
            const imageText: any =
              texts.length > 0 ? texts[0] : '画像�E説明がありません';
            imageTexts.push({
              画像パス: relativePath,
              チE��スチE imageText,
            });
          }
        }
        // スライドデータの構篁E
        slides.push({
          スライド番号: slideNumber,
          タイトル: texts.length > 0 ? texts[0] : `スライチE${slideNumber}`,
          本斁E texts.slice(1), // 先頭�E�タイトル�E�以外�EチE��スチE
          ノ�EチE noteContent,
          画像テキスチE imageTexts,
        });
      }
      // プレゼンチE�EションのメタチE�Eタを取征E
      const corePropsPath: any = path.join(extractDir, 'docProps', 'core.xml');
      let title = path.basename(filePath, fileExtension);
      let creator = '';
      let created = new Date().toISOString();
      let modified = new Date().toISOString();
      if (fs.existsSync(corePropsPath)) {
        const coreProps: any = fs.readFileSync(corePropsPath, 'utf8');
        // タイトルを取征E
        const titleMatch = /<dc:title>(.*?)<\/dc:title>/g.exec(coreProps);
        if (titleMatch && titleMatch[1]) {
          title = titleMatch[1];
        }
        // 作�E老E��取征E
        const creatorMatch = /<dc:creator>(.*?)<\/dc:creator>/g.exec(coreProps);
        if (creatorMatch && creatorMatch[1]) {
          creator = creatorMatch[1];
        }
        // 作�E日を取征E
        const createdMatch = /<dcterms:created>(.*?)<\/dcterms:created>/g.exec(
          coreProps
        );
        if (createdMatch && createdMatch[1]) {
          created = createdMatch[1];
        }
        // 更新日を取征E
        const modifiedMatch =
          /<dcterms:modified>(.*?)<\/dcterms:modified>/g.exec(coreProps);
        if (modifiedMatch && modifiedMatch[1]) {
          modified = modifiedMatch[1];
        }
      }
      // 一時ディレクトリを削除
      fs.rmSync(extractDir, { recursive: true, force: true });
      // 最終的なJSONオブジェクトを作�E
      const result = {
        metadata: {
          タイトル: title,
          作�E老E creator || 'Unknown',
          作�E日: created,
          修正日: modified,
          説昁E `PowerPointから生�Eされた応急復旧フロー、E{title}」です。接続番号: 123`,
        },
        slides,
      };
      // JSONファイルに保孁E
      const jsonFilePath: any = path.join(jsonDir, `${fileId}_metadata.json`);
      fs.writeFileSync(jsonFilePath, JSON.stringify(result, null, 2));
      return {
        id: fileId,
        filePath: jsonFilePath,
        fileName: path.basename(filePath),
        title,
        createdAt: new Date().toISOString(),
        slideCount: slides.length,
        data: result,
      };
    } else if (
      fileExtension.toLowerCase() === '.xlsx' ||
      fileExtension.toLowerCase() === '.xls'
    ) {
      // Excelファイルの処琁E
      const fileName: any = path.basename(filePath, fileExtension);
      const slides = [];
      try {
        // XLSXライブラリを使用してExcelファイルを�E琁E
        const XLSX = await import('xlsx');
        const workbook: any = XLSX.readFile(filePath);
        // シート名の一覧を取征E
        const sheetNames: any = workbook.SheetNames;
        // 吁E��ートを「スライド」として処琁E
        for (let i = 0; i < sheetNames.length; i++) {
          const sheetName: any = sheetNames[i];
          const worksheet: any = workbook.Sheets[sheetName];
          // シート�E冁E��をJSONに変換
          const sheetData: any = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
          });
          // 空のシートをスキチE�E
          if (sheetData.length === 0) continue;
          // チE��スト�E容を抽出�E�E行目をタイトル、残りを本斁E��見なす！E
          const title: any =
            Array.isArray(sheetData[0]) && sheetData[0].length > 0
              ? String(sheetData[0][0] || `シーチE${i + 1}`)
              : `シーチE${i + 1}`;
          // 本斁E��して残りの行を結合
          const bodyTexts = [];
          for (let j = 1; j < sheetData.length; j++) {
            if (Array.isArray(sheetData[j])) {
              const rowText: any = sheetData[j]
                .filter(cell => cell !== undefined && cell !== null)
                .map(cell => String(cell).trim())
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
            本斁E bodyTexts,
            ノ�EチE `Excelシート、E{sheetName}」から生成されました`,
            画像テキスチE [],
          });
        }
        // 最終的なJSONオブジェクトを作�E
        const result = {
          metadata: {
            タイトル: fileName,
            作�E老E 'Excel抽出',
            作�E日: new Date().toISOString(),
            修正日: new Date().toISOString(),
            説昁E `Excelファイル、E{fileName}」から生成された応急復旧フローです。接続番号: 123`,
          },
          slides,
        };
        // JSONファイルに保孁E
        const jsonFilePath: any = path.join(jsonDir, `${fileId}_metadata.json`);
        fs.writeFileSync(jsonFilePath, JSON.stringify(result, null, 2));
        return {
          id: fileId,
          filePath: jsonFilePath,
          fileName: path.basename(filePath),
          title: fileName,
          createdAt: new Date().toISOString(),
          slideCount: slides.length,
          data: result,
        };
      } catch (error) {
        console.error('Excelファイル処琁E��ラー:', error);
        throw new Error('Excelファイルの処琁E��失敗しました');
      }
    } else if (fileExtension.toLowerCase() === '.pdf') {
      // PDFファイルの処琁E
      const fileName: any = path.basename(filePath, fileExtension);
      // PDFファイル処琁E�E実裁E��例：テキスト抽出のみ�E�E
      // 実際のPDF処琁E�Epdfjs-distを使用しまぁE
      try {
        // PDFからのチE��スト抽出機�Eを仮実裁E
        // 実際の実裁E��は、より詳細なPDFの解析とチE��スト抽出が忁E��E
        const slides = [
          {
            スライド番号: 1,
            タイトル: fileName,
            本斁E ['PDFからチE��ストを抽出しました。接続番号: 123'],
            ノ�EチE 'PDFファイルから生�Eされた応急復旧フローでぁE,
            画像テキスチE [],
          },
        ];
        // 最終的なJSONオブジェクトを作�E
        const result = {
          metadata: {
            タイトル: fileName,
            作�E老E 'PDF抽出',
            作�E日: new Date().toISOString(),
            修正日: new Date().toISOString(),
            説昁E `PDFファイル、E{fileName}」から生成された応急処置フローです`,
          },
          slides,
        };
        // JSONファイルに保孁E
        const jsonFilePath: any = path.join(jsonDir, `${fileId}_metadata.json`);
        fs.writeFileSync(jsonFilePath, JSON.stringify(result, null, 2));
        return {
          id: fileId,
          filePath: jsonFilePath,
          fileName: path.basename(filePath),
          title: fileName,
          createdAt: new Date().toISOString(),
          slideCount: slides.length,
          data: result,
        };
      } catch (error) {
        console.error('PDFファイル処琁E��ラー:', error);
        throw new Error('PDFファイルの処琁E��失敗しました');
      }
    } else if (fileExtension.toLowerCase() === '.json') {
      // JSONファイルの処琁E
      console.console.log('JSONファイルを�E琁E��まぁE', filePath);
      const fileName: any = path.basename(filePath, fileExtension);
      try {
        // JSONファイルの冁E��を読み取る
        const jsonContent: any = fs.readFileSync(filePath, 'utf8');
        let jsonData = JSON.parse(jsonContent);
        // JSON構造を検証
        if (!jsonData) {
          throw new Error(
            'JSONファイルの解析に失敗しました。有効なJSONファイルを確認してください、E
          );
        }
        console.console.log('允E�EJSONチE�Eタの構造:', Object.keys(jsonData));
        // トラブルシューチE��ング形式かどぁE��を確誁E
        const isTroubleshootingFormat: any =
          jsonData.steps && Array.isArray(jsonData.steps);
        if (isTroubleshootingFormat) {
          console.console.log(
            'トラブルシューチE��ング形式�EJSONを検�Eしました。steps配�Eがあります、E
          );
          // トラブルシューチE��ング形式からガイド形式に変換
          const convertedData = {
            metadata: {
              タイトル: jsonData.title || fileName || '応急処置フローチE�Eタ',
              作�E老E 'シスチE��',
              作�E日: new Date().toISOString(),
              修正日: new Date().toISOString(),
              説昁E
                jsonData.description ||
                'トラブルシューチE��ングフローから生�Eされた応急処置フローでぁE,
              原形弁E 'troubleshooting',
            },
            slides: jsonData.steps.map((step, index) => ({
              スライド番号: index + 1,
              タイトル: step.title || `スチE��チE${index + 1}`,
              本斁E [step.message || step.description || ''],
              ノ�EチE step.options
                ? `選択肢: ${step.options.map(opt => opt.text).join(', ')}`
                : '',
              画像テキスチE [],
            })),
            original: jsonData, // 允E�EJSONチE�Eタも保持
          };
          // 変換後�EチE�Eタで置き換ぁE
          jsonData = convertedData;
          console.console.log('トラブルシューチE��ング形式からガイド形式に変換しました');
        } else {
          // 標準的なガイド形式に変換
          // 忁E��に応じて構造を構築！Eetadata、slidesがなぁE��合�E作�E�E�E
          if (!jsonData.metadata) {
            console.console.log('JSONにmetadataがなぁE��め、作�EしまぁE);
            jsonData.metadata = {
              タイトル: jsonData.title || fileName || '応急処置フローチE�Eタ',
              作�E老E 'シスチE��',
              作�E日: new Date().toISOString(),
              修正日: new Date().toISOString(),
              説昁E
                jsonData.description ||
                'JSONファイルから生�Eされた応急処置フローでぁE,
            };
          }
          if (!jsonData.slides || !Array.isArray(jsonData.slides)) {
            console.console.log('JSONにslidesがなぁE��配�EではなぁE��め、作�EしまぁE);
            // slidesを作�E
            jsonData.slides = [];
            // stepsがあれ�E、それをslidesに変換
            if (jsonData.steps && Array.isArray(jsonData.steps)) {
              console.console.log('steps配�Eをslidesに変換しまぁE);
              jsonData.slides = jsonData.steps.map((step, index) => ({
                スライド番号: index + 1,
                タイトル: step.title || `スチE��チE${index + 1}`,
                本斁E [step.message || step.description || ''],
                ノ�EチE step.options
                  ? `選択肢: ${step.options.map(opt => opt.text).join(', ')}`
                  : '',
                画像テキスチE [],
              }));
            } else {
              // チE�Eタからシンプルなスライドを生�E
              const slideData = {
                スライド番号: 1,
                タイトル:
                  jsonData.metadata?.タイトル ||
                  jsonData.title ||
                  fileName ||
                  'JSONチE�Eタ',
                本斁E [
                  jsonData.description ||
                    'JSONチE�Eタから自動生成されたスライドでぁE,
                ],
                ノ�EチE 'JSONファイルから生�Eされた�E容でぁE,
                画像テキスチE [],
              };
              jsonData.slides.push(slideData);
            }
          }
        }
        // 允E�EJSON形式を保存するため�EトラブルシューチE��ングチE��レクトリ
        const troubleshootingDir: any = path.join(
          process.cwd(),
          'knowledge-base/troubleshooting'
        );
        // トラブルシューチE��ングチE��レクトリが存在しなぁE��合�E作�E
        if (!fs.existsSync(troubleshootingDir)) {
          fs.mkdirSync(troubleshootingDir, { recursive: true });
        }
        // トラブルシューチE��ング形式�EJSONの場合、�Eの形式も保孁E
        if (isTroubleshootingFormat) {
          const tsFilePath: any = path.join(
            troubleshootingDir,
            `${path.basename(fileName, '.json')}.json`
          );
          fs.writeFileSync(tsFilePath, jsonContent);
          console.console.log(
            `トラブルシューチE��ング形式�EJSONを保存しました: ${tsFilePath}`
          );
        }
        // 画像パスの修正�E�忁E��に応じて�E�E
        jsonData.slides.forEach(slide => {
          if (slide.画像テキスチE&& Array.isArray(slide.画像テキスチE) {
            slide.画像テキスチEforEach(imgText => {
              if (
                imgText.画像パス &&
                imgText.画像パス.startsWith('/uploads/')
              ) {
                imgText.画像パス = imgText.画像パス.replace(
                  '/uploads/',
                  '/knowledge-base/'
                );
              }
            });
          }
        });
        // メタチE�Eタの更新
        jsonData.metadata.作�E日 =
          jsonData.metadata.作�E日 || new Date().toISOString();
        jsonData.metadata.修正日 = new Date().toISOString();
        // 説明を更新し、「応急復旧」を「応急処置」に統一
        if (
          jsonData.metadata.説昁E&&
          jsonData.metadata.説昁Eincludes('応急復旧')
        ) {
          jsonData.metadata.説昁E= jsonData.metadata.説昁Ereplace(
            /応急復旧/g,
            '応急処置'
          );
        }
        // タイトルの「応急復旧」を「応急処置」に統一
        if (
          jsonData.metadata.タイトル &&
          jsonData.metadata.タイトル.includes('応急復旧')
        ) {
          jsonData.metadata.タイトル = jsonData.metadata.タイトル.replace(
            /応急復旧/g,
            '応急処置'
          );
        }
        // 新しいJSONファイルに保孁E
        const jsonFilePath: any = path.join(jsonDir, `${fileId}_metadata.json`);
        fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2));
        return {
          id: fileId,
          filePath: jsonFilePath,
          fileName: path.basename(filePath),
          title: jsonData.metadata.タイトル || fileName,
          createdAt: new Date().toISOString(),
          slideCount: jsonData.slides.length,
          data: jsonData,
        };
      } catch (error) {
        console.error('JSONファイル処琁E��ラー:', error);
        throw new Error(
          `JSONファイルの処琁E��失敗しました: ${error instanceof Error ? error.message : '不�Eなエラー'}`
        );
      }
    } else {
      throw new Error('サポ�EトされてぁE��ぁE��ァイル形式でぁE);
    }
  } catch (error) {
    console.error('ファイル処琁E��ラー:', error);
    throw error;
  }
}
// ファイルアチE�Eロードと処琁E�Eエンド�EインチE
router.post('/process', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({
          success: false,
          error: 'ファイルがアチE�EロードされてぁE��せん',
        });
    }
    const filePath: any = req.file.path;
    console.log(`ファイル処琁E ${filePath}`);
    const result: any = await processFile(filePath);
    // knowledge-baseチE��レクトリにすでに直接保存されてぁE��ため、コピ�E不要E
    console.console.log(
      `ファイルはknowledge-baseチE��レクトリに直接処琁E��れました: ${result.filePath}`
    );
    // 允E�EアチE�Eロードファイルを削除�E�データ抽出とJSON生�Eが完亁E��たためE��E
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.console.log(`允E�EアチE�Eロードファイルを削除しました: ${filePath}`);
      }
    } catch (cleanupError) {
      console.error(`ファイル削除エラー: ${cleanupError}`);
      // ファイル削除に失敗しても�E琁E�E続衁E
    }
    // 一時ディレクトリをクリーンアチE�E
    if (fs.existsSync(tempDir)) {
      cleanupTempDirectory(tempDir);
    }
    // メモリキャチE��ュがあれ�E削除
    if (typeof global !== 'undefined' && global.fileCache) {
      delete global.fileCache[filePath];
    }
    return res.json({
      success: true,
      message: 'ファイルが正常に処琁E��れました',
      guideId: result.id,
      data: result,
    });
  } catch (error) {
    console.error('ファイル処琁E��ラー:', error);
    return res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : '不�Eなエラーが発生しました',
    });
  }
});
// ガイドファイル一覧を取得するエンド�EインチE
router.get('/list', (_req, res) => {
  try {
    console.console.log('ガイド一覧を取得しまぁE..');

    // Content-Typeを�E示皁E��設宁E
    res.setHeader('Content-Type', 'application/json');

    // 知識�EースチE��レクトリからファイルを読み取る
    if (!fs.existsSync(jsonDir)) {
      return res.status(404).json({ error: 'チE��レクトリが見つかりません' });
    }
    // キャチE��ュバスチE��ングのためにファイル一覧を�Eスキャン
    const allFiles: any = fs.readdirSync(jsonDir);
    console.console.log('全ファイル一覧:', allFiles);
    // 特定�Eファイルを除外するため�EブラチE��リスチE
    const blacklist = ['guide_1744876404679_metadata.json'];
    // メタチE�Eタファイルのみをフィルタリング�E�かつブラチE��リストを除外！E
    const files: any = allFiles.filter(
      file => file.endsWith('_metadata.json') && !blacklist.includes(file)
    );
    console.console.log('フィルタリング後�EメタチE�Eタファイル一覧:', files);
    const guides: any = files.map(file => {
      try {
        const filePath: any = path.join(jsonDir, file);
        const content: any = fs.readFileSync(filePath, 'utf8');
        const data: any = JSON.parse(content);
        const id: any = file.split('_')[0] + '_' + file.split('_')[1];
        return {
          id,
          filePath,
          fileName: file,
          title:
            data.metadata?.タイトル || 
            data.title || 
            data.metadata?.title ||
            path.basename(file, '_metadata.json'),
          createdAt: data.metadata?.作�E日 || new Date().toISOString(),
          slideCount: Array.isArray(data.slides) ? data.slides.length : 0,
          source: 'regular',
        };
      } catch (err) {
        console.error(`ファイル処琁E��ラー: ${file}`, err);
        // エラーの場合�E最低限の惁E��を返す
        const id: any = file.split('_')[0] + '_' + file.split('_')[1];
        return {
          id,
          filePath: path.join(jsonDir, file),
          fileName: `エラーファイル_${id}`,
          title: `エラーファイル_${id}`,
          createdAt: new Date().toISOString(),
          slideCount: 0,
        };
      }
    });
    // リスト取得前の最終状態チェチE���E�完�EにファイルシスチE��と同期するため�E�E
    console.console.log('応急ガイド一覧をレスポンス送信前に最終検証:');
    console.console.log('- JSONチE��レクトリの冁E��:', fs.readdirSync(jsonDir));
    console.console.log('- 返却するガイド数:', guides.length);
    console.console.log('- ガイドID一覧:', guides.map(g => g.id).join(', '));
    // ヘッダーの追加でキャチE��ュを無効匁E
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    // レスポンスを返す
    res.json(guides);
  } catch (error) {
    console.error('ガイド一覧取得エラー:', error);
    res.status(500).json({ error: 'ガイド一覧の取得に失敗しました' });
  }
});
// 特定�Eガイド詳細チE�Eタを取得するエンド�EインチE
router.get('/detail/:id', (_req, res) => {
  try {
    const id: any = req.params.id;
    // トラブルシューチE��ングファイルかどぁE��をチェチE��
    if (id.startsWith('ts_')) {
      // トラブルシューチE��ングファイルの場吁E
      const troubleshootingDir: any = path.join(
        process.cwd(),
        'knowledge-base/troubleshooting'
      );
      const tsId: any = id.replace('ts_', ''); // プレフィチE��スを削除
      const filePath: any = path.join(troubleshootingDir, `${tsId}.json`);
      if (!fs.existsSync(filePath)) {
        return res
          .status(404)
          .json({ error: 'トラブルシューチE��ングファイルが見つかりません' });
      }
      const content: any = fs.readFileSync(filePath, 'utf8');
      const jsonData: any = JSON.parse(content);
      // チE�Eタ構造を標準化
      const data = {
        metadata: jsonData.metadata || {
          タイトル: jsonData.title || tsId,
          作�E老E 'シスチE��',
          作�E日: jsonData.createdAt || new Date().toISOString(),
          修正日: new Date().toISOString(),
          説昁E jsonData.description || 'トラブルシューチE��ングフロー',
        },
        slides: jsonData.slides || [],
      };
      // stepsがあれ�E、slidesに変換
      if (
        jsonData.steps &&
        Array.isArray(jsonData.steps) &&
        data.slides.length === 0
      ) {
        data.slides = jsonData.steps.map((step, index) => ({
          スライド番号: index + 1,
          タイトル: step.title || `スチE��チE${index + 1}`,
          本斁E [step.description || ''],
          ノ�EチE step.note || '',
          画像テキスチE step.imageUrl
            ? [
                {
                  画像パス: step.imageUrl,
                  チE��スチE step.imageCaption || '',
                },
              ]
            : [],
        }));
      }
      res.json({
        id,
        filePath,
        fileName: path.basename(filePath),
        data,
        source: 'troubleshooting',
      });
    } else {
      // 通常のガイドファイルの場吁E
      const files: any = fs
        .readdirSync(jsonDir)
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
        source: 'regular',
      });
    }
  } catch (error) {
    console.error('ガイド詳細取得エラー:', error);
    res.status(500).json({ error: 'ガイド詳細の取得に失敗しました' });
  }
});
// ガイドデータを更新するエンド�EインチE
router.post('/update/:id', (_req, res) => {
  try {
    const id: any = req.params.id;
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'チE�Eタが提供されてぁE��せん' });
    }
    // トラブルシューチE��ングファイルかどぁE��をチェチE��
    if (id.startsWith('ts_')) {
      // トラブルシューチE��ングファイルの場吁E
      const troubleshootingDir: any = path.join(
        process.cwd(),
        'knowledge-base/troubleshooting'
      );
      const tsId: any = id.replace('ts_', ''); // プレフィチE��スを削除
      const filePath: any = path.join(troubleshootingDir, `${tsId}.json`);
      if (!fs.existsSync(filePath)) {
        return res
          .status(404)
          .json({ error: 'トラブルシューチE��ングファイルが見つかりません' });
      }
      // 允E�EチE�Eタを読み込む
      const content: any = fs.readFileSync(filePath, 'utf8');
      const originalData: any = JSON.parse(content);
      // 允E��ータを完�Eに置き換える新しいチE�Eタを構篁E
      const updatedTsData = {
        id: originalData.id || tsId,
        title: data.metadata?.タイトル || originalData.title || tsId,
        description: data.metadata?.説昁E|| originalData.description || '',
        triggerKeywords: originalData.triggerKeywords || [],
        steps: [],
        updatedAt: new Date().toISOString(),
      };
      // スライドからスチE��プに完�E変換
      if (data.slides && Array.isArray(data.slides)) {
        updatedTsData.steps = data.slides.map((slide, index) => ({
          id: slide.id || `step${index + 1}`,
          title: slide.タイトル || `スチE��チE${index + 1}`,
          description: Array.isArray(slide.本斁E
            ? slide.本斁Ejoin('\n')
            : slide.本斁E|| '',
          message: Array.isArray(slide.本斁E
            ? slide.本斁Ejoin('\n')
            : slide.本斁E|| '',
          imageUrl: slide.imageUrl || '',
          type: slide.type || 'step',
          options: slide.options || [],
        }));
      } else {
        // 既存�EスチE��プ構造を保持
        updatedTsData.steps = originalData.steps || [];
      }
      // 更新日時を設宁E
      updatedTsData.updatedAt = new Date().toISOString();
      // 既存ファイルを削除してから完�Eに新しいチE�Eタで置き換ぁE
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      // 新しいチE�Eタで完�E上書ぁE
      fs.writeFileSync(
        filePath,
        JSON.stringify(updatedTsData, null, 2),
        'utf8'
      );
      // 通常のJSONとしても保存（バチE��アチE�E�E�E
      if (data.metadata) {
        data.metadata.修正日 = new Date().toISOString();
      }
      // メモリキャチE��ュがあれ�E削除
      if (typeof global !== 'undefined' && global.fileCache) {
        delete global.fileCache[filePath];
      }
      // トラブルシューチE��ングファイルの対応するメタチE�Eタファイルを取征E
      const guideFileName = `ts_${tsId}_metadata.json`;
      const guideFilePath: any = path.join(jsonDir, guideFileName);
      // メタチE�Eタファイルが存在する場合�E更新
      if (fs.existsSync(guideFilePath)) {
        fs.writeFileSync(guideFilePath, JSON.stringify(data, null, 2));
      }
      res.json({
        success: true,
        message: 'トラブルシューチE��ングチE�Eタが更新されました',
        id,
      });
    } else {
      // 通常のガイドファイルの場吁E
      const files: any = fs
        .readdirSync(jsonDir)
        .filter(file => file.startsWith(id) && file.endsWith('_metadata.json'));
      if (files.length === 0) {
        return res.status(404).json({ error: 'ガイドが見つかりません' });
      }
      const filePath: any = path.join(jsonDir, files[0]);
      // 更新日時を現在の日時に設宁E
      if (data.metadata) {
        data.metadata.修正日 = new Date().toISOString();
      }
      // ファイルに書き込み
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      res.json({
        success: true,
        message: 'ガイドデータが更新されました',
        id,
      });
    }
  } catch (error) {
    console.error('ガイド更新エラー:', error);
    res.status(500).json({ error: 'ガイド�E更新に失敗しました' });
  }
});
// ガイドデータを削除するエンド�EインチE
router.delete('/delete/:id', (_req, res) => {
  try {
    const id: any = req.params.id;
    // トラブルシューチE��ングファイルかどぁE��をチェチE��
    if (id.startsWith('ts_')) {
      // トラブルシューチE��ングファイルの場吁E
      const troubleshootingDir: any = path.join(
        __dirname,
        '../../knowledge-base/troubleshooting'
      );
      const tsId: any = id.replace('ts_', ''); // プレフィチE��スを削除
      const filePath: any = path.join(troubleshootingDir, `${tsId}.json`);
      if (fs.existsSync(filePath)) {
        // ファイルを削除
        fs.unlinkSync(filePath);
        console.console.log(
          `トラブルシューチE��ングファイルを削除しました: ${filePath}`
        );
      }
      // 対応するメタチE�Eタファイルも削除
      const guideFileName = `ts_${tsId}_metadata.json`;
      const guideFilePath: any = path.join(jsonDir, guideFileName);
      if (fs.existsSync(guideFilePath)) {
        fs.unlinkSync(guideFilePath);
        console.console.log(`メタチE�Eタファイルを削除しました: ${guideFilePath}`);
      }
    } else {
      // 通常のガイドファイルの場吁E
      const files: any = fs
        .readdirSync(jsonDir)
        .filter(file => file.startsWith(id) && file.endsWith('_metadata.json'));
      if (files.length === 0) {
        return res.status(404).json({ error: 'ガイドが見つかりません' });
      }
      const filePath: any = path.join(jsonDir, files[0]);
      if (fs.existsSync(filePath)) {
        // ファイルを削除
        fs.unlinkSync(filePath);
        console.console.log(`ガイドファイルを削除しました: ${filePath}`);
      }
    }
    res.json({
      success: true,
      message: 'ガイドデータが削除されました',
      id,
    });
  } catch (error) {
    console.error('ガイド削除エラー:', error);
    res.status(500).json({ error: 'ガイド�E削除に失敗しました' });
  }
});
// チャチE��に応急処置ガイドを送信するエンド�EインチE
router.post('/send-to-chat/:guideId/:chatId', async (_req, res) => {
  try {
    const { guideId, chatId } = req.params;
    // ガイドデータを取征E
    const files: any = fs
      .readdirSync(jsonDir)
      .filter(
        file => file.startsWith(guideId) && file.endsWith('_metadata.json')
      );
    if (files.length === 0) {
      return res.status(404).json({ error: 'ガイドが見つかりません' });
    }
    const filePath: any = path.join(jsonDir, files[0]);
    const content: any = fs.readFileSync(filePath, 'utf8');
    const guideData: any = JSON.parse(content);
    // チャチE��にメチE��ージを送信するAPIを呼び出ぁE
    const response: any = await fetch(
      `http://localhost:${process.env.PORT || 3000}/api/chats/${chatId}/messages/system`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: `応急処置フロー、E{guideData.metadata.タイトル}」が共有されました、En\n${guideData.metadata.説明}`,
          isUserMessage: false,
        }),
      }
    );
    if (!response.ok) {
      throw new Error('チャチE��へのメチE��ージ送信に失敗しました');
    }
    const result: any = await response.json();
    res.json({
      success: true,
      message: '応急処置フローがチャチE��に送信されました',
      messageId: result.id,
    });
  } catch (error) {
    console.error('フロー送信エラー:', error);
    res
      .status(500)
      .json({ error: '応急処置フローのチャチE��への送信に失敗しました' });
  }
});

// エラーハンドリングミドルウェアを追加
router.use((err: any, _req: any, res: any, _next: any) => {
  console.error('応急処置ガイドエラー:', err);

  // Content-Typeを�E示皁E��設宁E
  res.setHeader('Content-Type', 'application/json');

  res.status(500).json({
    success: false,
    error: '応急処置ガイド�E処琁E��にエラーが発生しました',
    details: err.message || 'Unknown error',
    timestamp: new Date().toISOString(),
  });
});

// 404ハンドリング
router.use('*', (req: any, res: any) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({
    success: false,
    error: '応急処置ガイド�Eエンド�Eイントが見つかりません',
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

export default router;
