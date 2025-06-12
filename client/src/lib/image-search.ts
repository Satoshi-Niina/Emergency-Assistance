import Fuse from 'fuse.js';
import { apiRequest } from './queryClient';

// 画像検索用の専用インターフェース定義
interface ImageSearchItem {
  id: string | number;
  file: string;  // PNG形式のパス（SVGは使用しない）
  title: string;
  category: string;
  keywords: string[];
  description: string;
  metadata?: any;
  all_slides?: string[];
  details?: string;
  searchText?: string;   // 検索用の追加テキストフィールド
}

// 画像検索用データ
let imageSearchData: ImageSearchItem[] = [];

// 画像検索専用JSONデータを読み込む
async function loadImageSearchData() {
  if (isLoading) {
    console.log('既に読み込み中のため、重複読み込みを防止します');
    return [];
  }

  if (isDataLoaded && imageSearchData.length > 0) {
    console.log('データは既に読み込み済みです');
    return imageSearchData;
  }

  isLoading = true;

  try {
    // 最初に既存の画像検索データを確認
    const existingDataResponse = await fetch(`/knowledge-base/data/image_search_data.json?t=${Date.now()}`);
    if (existingDataResponse.ok) {
      const existingData = await existingDataResponse.json();
      if (Array.isArray(existingData) && existingData.length > 0) {
        console.log(`既存の画像検索データを読み込みました: ${existingData.length}件`);
        imageSearchData = existingData;
        isDataLoaded = true;
        return imageSearchData;
      }
    }

    // 画像検索データが存在しない場合、初期化を試行
    console.log('画像検索データが見つからないため、初期化を実行します');
    
    try {
      const initResponse = await fetch('/api/tech-support/init-image-search-data', {
        method: 'POST'
      });

      if (initResponse.ok) {
        const initData = await initResponse.json();
        console.log('画像検索データを初期化しました:', initData);

        // 初期化後、再度データを読み込み
        const retryResponse = await fetch(`/knowledge-base/data/image_search_data.json?t=${Date.now()}`);
        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          if (Array.isArray(retryData) && retryData.length > 0) {
            console.log(`初期化後のデータ読み込み成功: ${retryData.length}件`);
            imageSearchData = retryData;
            isDataLoaded = true;
            return imageSearchData;
          }
        }
      }
    } catch (initError) {
      console.warn('画像検索データの初期化に失敗:', initError);
    }

    // フォールバック: 直接画像ファイルから検索データを生成
    console.log('フォールバック: 画像ファイルから検索データを生成します');
    const fallbackData = generateFallbackSearchData();
    if (fallbackData.length > 0) {
      imageSearchData = fallbackData;
      isDataLoaded = true;
      console.log(`フォールバック検索データを生成: ${fallbackData.length}件`);
      return imageSearchData;
    }

    // 最新のJSON ファイルを取得する（既存の処理）
    const timestamp = new Date().getTime();
    const dirResponse = await fetch(`/api/tech-support/list-json-files?t=${timestamp}`);
    let metadataFile = 'mc_1747961263575_metadata.json'; // デフォルトファイル

    if (dirResponse.ok) {
      const fileList = await dirResponse.json();
      if (Array.isArray(fileList) && fileList.length > 0) {
        metadataFile = fileList[0];
        if (process.env.NODE_ENV === 'development') {
          console.log(`最新のメタデータファイルを使用します: ${metadataFile}`);
        }
      }
    }

    // knowledge-baseからJSONファイルを読み込む
    let metadata;
    try {
      const response = await fetch(`/knowledge-base/json/${metadataFile}?t=${timestamp}`);
      if (!response.ok) {
        console.warn(`メタデータファイルが見つかりません: ${metadataFile}, ステータス: ${response.status}`);
        // ディレクトリから最新ファイルを再取得してリトライ
        if (dirResponse.ok) {
          const fileList = await dirResponse.json();
          if (Array.isArray(fileList) && fileList.length > 0) {
            metadataFile = fileList[0];
            console.log(`代替ファイルでリトライ: ${metadataFile}`);
            const retryResponse = await fetch(`/knowledge-base/json/${metadataFile}?t=${timestamp}`);
            if (retryResponse.ok) {
              metadata = await retryResponse.json();
            } else {
              console.error(`代替ファイルも読み込めませんでした: ${metadataFile}`);
              return [];
            }
          } else {
            return [];
          }
        } else {
          return [];
        }
      } else {
        metadata = await response.json();
      }
    } catch (error) {
      console.warn("メタデータJSONの読み込みに失敗しました:", error);
      return []; // エラー時は空の配列を返す
    }

    // 既存データをクリア
    imageSearchData = [];

    if (metadata && metadata.slides && Array.isArray(metadata.slides)) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`メタデータJSONを読み込みました: ${metadata.slides.length}件のスライド`);
      }

      // メタデータの検証とデータ品質チェック用カウンター
      let validSlideCount = 0;
      let invalidPathCount = 0;
      let missingTitleCount = 0;

      // スライドからImageSearchItem形式に変換（PNGファイルを優先）
      const slidesData = metadata.slides.map((slide: any) => {
        // 検証: スライド番号が存在するか確認
        if (!slide['スライド番号'] && slide['スライド番号'] !== 0) {
          console.warn(`スライド番号が欠落しているスライドがあります`);
          // 欠落している場合は代替IDを生成
          slide['スライド番号'] = `unknown_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        }

        // 画像パスを取得し、検証
        let imagePath = "";
        if (slide['画像テキスト'] && Array.isArray(slide['画像テキスト']) && slide['画像テキスト'].length > 0) {
          const imageText = slide['画像テキスト'][0];
          if (imageText && typeof imageText === 'object' && '画像パス' in imageText) {
            imagePath = imageText['画像パス'] || "";
          }
        }

        // 画像パスがない場合はログ
        if (!imagePath) {
          invalidPathCount++;
          console.warn(`スライド ${slide['スライド番号']} に有効な画像パスがありません`);
        }

        // 画像パスの参照を knowledge-base/images に統一
        if (imagePath) {
          // ファイル名だけを抽出
          const fileName = imagePath.split('/').pop();
          if (fileName) {
            // 知識ベースの画像ディレクトリに統一
            imagePath = `/knowledge-base/images/${fileName}`;
          }
        }

        // 画像を常にPNG形式に変換する
        if (imagePath && !imagePath.toLowerCase().endsWith('.png')) {
          // PNGパスに変換
          const basePath = imagePath.substring(0, imagePath.lastIndexOf('.') !== -1 ? 
                                              imagePath.lastIndexOf('.') : imagePath.length);
          imagePath = `${basePath}.png`;
        }

        // タイトルの検証
        const slideTitle = slide['タイトル'] || `スライド ${slide['スライド番号']}`;
        if (!slide['タイトル']) {
          missingTitleCount++;
        }

        // キーワードを生成（本文とタイトルから）- 検証付き
        const keywords = [];

        //// タイトルをキーワードに追加
        if (slideTitle && typeof slideTitle === 'string' && slideTitle.trim() !== '') {
          keywords.push(slideTitle.trim());
        }

        // 本文をキーワードに追加
        if (slide['本文'] && Array.isArray(slide['本文'])) {
          slide['本文'].forEach((text: any) => {
            if (text && typeof text === 'string' && text.trim() !== '') {
              keywords.push(text.trim());
            }
          });
        }

        // 検索を容易にするための追加の検索テキストフィールド
        const searchTextParts = [
          slideTitle,
          ...(slide['本文'] || []),
          "保守用車マニュアル", // カテゴリも検索できるように
          "エンジン", "車両", "設備", "機械", "部品", // 一般的な検索キーワードを追加
          "ブレーキ", "brake", "制動", "制動装置",
          "冷却", "ラジエーター", "radiator", "cooling",
          "ホイール", "wheel", "車輪", "タイヤ", "tire",
          "駆動", "動力", "power", "drive"
        ].filter(Boolean);

        // キーワードにも一般的な用語を追加
        const enhancedKeywords = [
          ...keywords,
          "エンジン", "車両", "設備", "機械", "部品", "保守", "点検",
          "ブレーキ", "brake", "制動", "制動装置",
          "冷却", "ラジエーター", "radiator", "cooling",
          "ホイール", "wheel", "車輪", "タイヤ", "tire",
          "駆動", "動力", "power", "drive"
        ];

        validSlideCount++;

        return {
          id: `slide_${slide['スライド番号']}`,
          file: imagePath,
          title: slideTitle,
          category: "保守用車マニュアル",
          keywords: enhancedKeywords,
          description: "", // テキスト表示を削除
          details: "", // テキスト表示を削除
          searchText: searchTextParts.join(' ') // 検索用の追加フィールド
        };
      });

      // 品質チェック結果をログ（開発環境のみ）
      if (process.env.NODE_ENV === 'development') {
        console.log(`スライド処理結果: 有効=${validSlideCount}, 無効なパス=${invalidPathCount}, タイトル欠落=${missingTitleCount}`);
      }

      // 有効な画像パスを持つスライドのみを追加し、データの整合性を確保
      slidesData
        .filter((item: any) => {
          const hasValidPath = item.file && typeof item.file === 'string' && item.file.length > 0;
          const hasValidTitle = item.title && typeof item.title === 'string';
          const hasValidKeywords = Array.isArray(item.keywords) && item.keywords.length > 0;

          return hasValidPath && hasValidTitle && hasValidKeywords;
        })
        .forEach((item: any) => imageSearchData.push(item));

      // 埋め込み画像もデータに追加 (PNGを優先) - 強化版
      if (metadata.embeddedImages && Array.isArray(metadata.embeddedImages)) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`${metadata.embeddedImages.length}件の埋め込み画像を処理します`);
        }

        // 画像処理の統計を追跡
        let validImageCount = 0;
        let invalidPathCount = 0;

        // 埋め込み画像の検証とマッピング
        const embeddedImages = metadata.embeddedImages
          // 有効な抽出パスを持つ画像のみフィルタリング
          .filter((img: any) => {
            const isValid = img && typeof img === 'object' && 
                           '抽出パス' in img && 
                           img['抽出パス'] && 
                           typeof img['抽出パス'] === 'string';

            if (!isValid) {
              invalidPathCount++;
            }

            return isValid;
          })
          .map((img: any, index: number) => {
            let imagePath = img['抽出パス'];

            // 画像パスの参照を knowledge-base ディレクトリに統一
            if (imagePath) {
              // ファイル名だけを抽出
              const fileName = imagePath.split('/').pop();
              if (fileName) {
                imagePath = `/knowledge-base/images/${fileName}`;
              }
            }

            // すべての画像形式をPNGに統一
            if (!imagePath.toLowerCase().endsWith('.png')) {
              const basePath = imagePath.substring(0, 
                imagePath.lastIndexOf('.') !== -1 ? 
                imagePath.lastIndexOf('.') : imagePath.length);
              const pngPath = `${basePath}.png`;
              imagePath = pngPath;
            }

            // メタデータから追加情報を抽出（あれば）
            let title = `部品画像 ${index+1}`;
            let category = "部品写真";
            let additionalKeywords: string[] = [];

            // 元のファイル名から情報を抽出
            if (img['元のファイル名'] && typeof img['元のファイル名'] === 'string') {
              const originalName = img['元のファイル名'];

              // ファイル名からより具体的なタイトルを生成
              if (originalName.includes('エンジン') || originalName.includes('engine')) {
                title = `エンジン部品 ${index+1}`;
                category = "エンジン部品";
                additionalKeywords.push("エンジン", "動力系", "駆動部");
              } else if (originalName.includes('冷却') || originalName.includes('ラジエーター')) {
                title = `冷却系統 ${index+1}`;
                category = "冷却系統";
                additionalKeywords.push("冷却", "ラジエーター", "水冷");
              } else if (originalName.includes('ブレーキ') || originalName.includes('brake')) {
                title = `ブレーキ部品 ${index+1}`;
                category = "ブレーキ系統";
                additionalKeywords.push("ブレーキ", "制動装置");
              } else if (originalName.includes('ホイール') || originalName.includes('wheel')) {
                title = `車輪部品 ${index+1}`;
                category = "足回り";
                additionalKeywords.push("ホイール", "車輪", "タイヤ");
              }
            }

            // 基本キーワードと追加キーワードを結合
            const keywords = [
              "保守用車", "部品", "写真", 
              "エンジン", "車両", "設備", "機械", "保守", "点検",
              "ブレーキ", "brake", "制動", "制動装置",
              "冷却", "ラジエーター", "radiator", "cooling",
              "ホイール", "wheel", "車輪", "タイヤ", "tire",
              "駆動", "動力", "power", "drive",
              ...additionalKeywords
            ];

            // 検索用の統合テキスト
            const searchText = [
              title, category, 
              ...keywords,
              "エンジン関連", "車両部品", "保守用機械",
              "ブレーキ系統", "制動系統", "冷却系統", "駆動系統"
            ].join(' ');

            validImageCount++;

            return {
              id: `img_${index+1}`,
              file: imagePath,
              title: title,
              category: category,
              keywords: keywords,
              description: "", // テキスト表示を削除
              details: "", // テキスト表示を削除
              searchText: searchText // 検索用の統合テキスト
            };
          });

        console.log(`埋め込み画像処理結果: 有効=${validImageCount}, 無効パス=${invalidPathCount}`);

        // 実際に存在する画像ファイルのリスト
        const existingImageFiles = [
          'mc_1747961263575_img_001.png',
          'mc_1747961263575_img_003.png', 
          'mc_1747961263575_img_004.png',
          'mc_1747961263575_img_005.png',
          'mc_1747961263575_img_006.png',
          'mc_1747961263575_img_012.png',
          'mc_1747961263575_img_013.png',
          'mc_1747961263575_img_016.png',
          'mc_1747961263575_img_017.png',
          'mc_1747961263575_img_018.png',
          'mc_1747961263575_img_019.png',
          'mc_1747961263575_img_020.png',
          'mc_1747961263575_img_021.png',
          'mc_1747961263575_img_022.png',
          'mc_1747961263575_img_026.png',
          'mc_1747961263575_img_027.png'
        ];

        // 有効な画像のみを追加（PNG形式に統一 + 実ファイル存在確認）
        embeddedImages
          .filter((item: any) => {
            // 有効なパスであることを確認
            const hasValidPath = item.file && 
                                typeof item.file === 'string' && 
                                item.file.length > 0 &&
                                item.file.toLowerCase().endsWith('.png');

            // 有効なタイトルがあることを確認
            const hasValidTitle = item.title && typeof item.title === 'string';

            // 有効なキーワードがあることを確認
            const hasValidKeywords = Array.isArray(item.keywords) && item.keywords.length > 0;

            // 実際に存在するファイルかどうかを確認
            const fileName = item.file ? item.file.split('/').pop() : '';
            const fileExists = fileName && existingImageFiles.includes(fileName);

            if (hasValidPath && hasValidTitle && hasValidKeywords && !fileExists) {
              console.warn(`画像ファイルが存在しないため除外: ${fileName}`);
            }

            return hasValidPath && hasValidTitle && hasValidKeywords && fileExists;
          })
          .forEach((item: any) => imageSearchData.push(item));
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`検索用データを準備完了: ${imageSearchData.length}件`);
      }

      // データ読み込み完了フラグを設定
      isDataLoaded = true;
    } else {
      throw new Error('メタデータのフォーマットが無効です');
    }
  } catch (error) {
    console.error("画像検索データの読み込みに失敗しました:", error);

    // エラーを報告し、サーバーに画像検索データの再生成をリクエスト
    try {
      const initResponse = await fetch('/api/tech-support/init-image-search-data', {
        method: 'POST'
      });

      if (initResponse.ok) {
        const initData = await initResponse.json();
        console.log("画像検索データを初期化しました:", initData);

        // knowledge-baseから再度データを読み込み
        try {
          // knowledge-base/dataディレクトリから読み込む（一元化）
          const kbReloadResponse = await fetch(`/knowledge-base/data/image_search_data.json?t=${Date.now()}`);
          if (kbReloadResponse.ok) {
            const reloadedData = await kbReloadResponse.json();
            if (Array.isArray(reloadedData)) {
              console.log(`再読み込みした画像検索データ: ${reloadedData.length}件`);
              imageSearchData = reloadedData;
              return;
            }
          } else {
            throw new Error('knowledge-baseのデータ読み込みに失敗しました');
          }
        } catch (error) {
          console.warn(`knowledge-base/dataからの読み込みに失敗しました:`, error);
          console.error(`画像検索データ読み込みに失敗しました:`, error);
        }
      }
    } catch (initError) {
      console.error("画像検索データの初期化に失敗:", initError);
    }

    // 直接knowledge-baseからJSONファイルを読み込む（エラーハンドリング用）
    console.log("knowledge-baseからJSONの読み込みを試みます");
    try {
      // knowledge-baseパスのみ使用（一元化）
      const knowledgeBasePath = '/knowledge-base/data/image_search_data.json';

      let directData = null;

      try {
        const directFetch = await fetch(`${knowledgeBasePath}?t=${Date.now()}`, { 
          cache: 'no-store',  // キャッシュを無視
          headers: { 'pragma': 'no-cache', 'cache-control': 'no-cache' }
        });

        if (directFetch.ok) {
          const fetchedData = await directFetch.json();
          if (Array.isArray(fetchedData) && fetchedData.length > 0) {
            console.log(`知識ベースから画像検索データを読み込みました: ${fetchedData.length}件`);
            directData = fetchedData;
          }
        }
      } catch (pathError) {
        console.warn(`知識ベースからの読み込みに失敗:`, pathError);
      }

      // いずれかのパスから読み込めたら使用
      if (directData) {
        imageSearchData = directData;
        return;
      } else {
        // 初期化APIを直接実行して再読み込みを試みる
        try {
          const reinitResp = await fetch('/api/tech-support/init-image-search-data', { 
            method: 'POST',
            cache: 'no-store'
          });

          if (reinitResp.ok) {
            const initData = await reinitResp.json();
            console.log('画像検索データを初期化しました:', initData);

            // 少し待機して再試行
            await new Promise(resolve => setTimeout(resolve, 500));

            // 初期化後は知識ベースから試行
            const retryPaths = [
              '/knowledge-base/data/image_search_data.json'
            ];

            let retryData = null;
            for (const retryPath of retryPaths) {
              try {
                const retryFetch = await fetch(`${retryPath}?t=${Date.now()}`, {
                  cache: 'no-store'
                });

                if (retryFetch.ok) {
                  const data = await retryFetch.json();
                  if (Array.isArray(data) && data.length > 0) {
                    console.log(`初期化後、パス ${retryPath} からの再読み込みに成功: ${data.length}件`);
                    retryData = data;
                    break;
                  }
                }
              } catch (retryErr) {
                console.warn(`初期化後の再読み込み失敗 (${retryPath}):`, retryErr);
              }
            }

            if (retryData) {
              console.log(`初期化後、${retryData.length}件のデータを読み込みました`);
              imageSearchData = retryData;
              return;
            }
          }
        } catch (reinitErr) {
          console.error('再初期化に失敗:', reinitErr);
        }

        throw new Error("どのパスからもデータを読み込めませんでした");
      }
    } catch (directError) {
      console.error("直接JSONからの読み込みに失敗:", directError);
    }

    // サンプルデータは使用せず、空の配列を返す（ユーザー要求により）
    console.log("サンプル画像データを表示しないように設定しました");
    imageSearchData = [];
  } finally {
    isLoading = false;
  }
}

// フォールバック検索データを生成する関数
function generateFallbackSearchData(): ImageSearchItem[] {
  // 実際に存在する画像ファイルのリスト
  const existingImageFiles = [
    'mc_1747961263575_img_001.png',
    'mc_1747961263575_img_003.png', 
    'mc_1747961263575_img_004.png',
    'mc_1747961263575_img_005.png',
    'mc_1747961263575_img_006.png',
    'mc_1747961263575_img_012.png',
    'mc_1747961263575_img_013.png',
    'mc_1747961263575_img_016.png',
    'mc_1747961263575_img_017.png',
    'mc_1747961263575_img_018.png',
    'mc_1747961263575_img_019.png',
    'mc_1747961263575_img_020.png',
    'mc_1747961263575_img_021.png',
    'mc_1747961263575_img_022.png',
    'mc_1747961263575_img_026.png',
    'mc_1747961263575_img_027.png'
  ];

  const fallbackData: ImageSearchItem[] = existingImageFiles.map((fileName, index) => {
    // ファイル名から推測される内容
    let title = `保守用車画像 ${index + 1}`;
    let category = "保守用車マニュアル";
    let additionalKeywords: string[] = [];

    // ファイル名の番号から内容を推測
    const imageNumber = fileName.match(/img_(\d+)/)?.[1];
    if (imageNumber) {
      const num = parseInt(imageNumber);
      if (num <= 5) {
        title = `エンジン部品 ${index + 1}`;
        category = "エンジン系統";
        additionalKeywords = ["エンジン", "動力", "駆動部"];
      } else if (num <= 15) {
        title = `冷却系統 ${index + 1}`;
        category = "冷却系統";
        additionalKeywords = ["冷却", "ラジエーター", "水冷"];
      } else if (num <= 25) {
        title = `ブレーキ系統 ${index + 1}`;
        category = "ブレーキ系統";
        additionalKeywords = ["ブレーキ", "制動装置", "制動"];
      } else {
        title = `車輪・足回り ${index + 1}`;
        category = "足回り";
        additionalKeywords = ["ホイール", "車輪", "タイヤ"];
      }
    }

    const keywords = [
      "保守用車", "マニュアル", "部品", "画像",
      "エンジン", "車両", "設備", "機械", "保守", "点検",
      "ブレーキ", "brake", "制動", "制動装置",
      "冷却", "ラジエーター", "radiator", "cooling",
      "ホイール", "wheel", "車輪", "タイヤ", "tire",
      "駆動", "動力", "power", "drive",
      ...additionalKeywords
    ];

    return {
      id: `fallback_img_${index + 1}`,
      file: `/knowledge-base/images/${fileName}`,
      title: title,
      category: category,
      keywords: keywords,
      description: `${title}の画像`,
      searchText: [title, category, ...keywords].join(' ')
    };
  });

  console.log(`フォールバック検索データを生成しました: ${fallbackData.length}件`);
  return fallbackData;
}

// データ読み込み制御フラグ
let isDataLoaded = false;
let isLoading = false;

// アプリケーション起動時に画像検索データを読み込み
if (!isDataLoaded && !isLoading) {
  loadImageSearchData();
}

// データを強制的に再読み込む関数を提供
export const reloadImageSearchData = () => {
  if (isLoading) {
    console.log('既に読み込み中のため、再読み込みをスキップします');
    return;
  }
  console.log('画像検索データを強制的に再読み込みします');
  isDataLoaded = false;
  loadImageSearchData();
};

// 重複リスナーを防ぐためのフラグ
let eventListenerAdded = false;

// 画像検索データが更新されたときにリロードするイベントリスナー（重複防止）
if (!eventListenerAdded && typeof window !== 'undefined') {
  window.addEventListener('image-search-data-updated', () => {
    if (!isLoading) {
      console.log('画像検索データの更新を検知しました。再読み込みします。');
      isDataLoaded = false;
      loadImageSearchData();
    }
  });
  eventListenerAdded = true;
}

// Fuse.js 画像検索用の設定
const fuseOptions = {
  includeScore: true,
  keys: [
    { name: 'title', weight: 0.6 },
    { name: 'category', weight: 0.4 },
    { name: 'description', weight: 0.3 },
    { name: 'keywords', weight: 1.0 }, // キーワードの重みを最高に
    { name: 'searchText', weight: 1.0 }, // 検索用テキストフィールドを最高の重みで追加
  ],
  threshold: 0.8, // 閾値をさらに緩くして、より多くの結果を含める
  ignoreLocation: true, // 単語の位置を無視して検索
  useExtendedSearch: false, // 拡張検索モードを無効にして基本検索
  minMatchCharLength: 1, // 最小1文字一致に変更
  distance: 1000, // 単語間距離制限を緩く
  findAllMatches: true, // すべての一致を見つける
  isCaseSensitive: false, // 大文字小文字を区別しない
  shouldSort: true, // 結果をスコア順にソート
  includeMatches: true, // マッチした部分を含める
};

// 画像検索用のFuseインスタンスを作成するヘルパー関数
function getFuseInstance() {
  return new Fuse(imageSearchData, fuseOptions);
}

// 最後の検索テキスト（連続検索における重複防止用）
let lastSearchText = '';
// 最後の検索結果（連続検索における点滅防止用）
let lastSearchResults: any[] = [];
// 検索中フラグ（同時に複数の検索が走らないようにするため）
let isSearching = false;
// 最後の検索時刻（短時間での重複検索を防止）
let lastSearchTime = 0;
// 検索間隔制限（ミリ秒）
const SEARCH_INTERVAL_LIMIT = 1000;

/**
 * 検索処理を強制的にキャンセルする関数
 * 検索結果が表示された後に呼び出して点滅を防止する
 */
export const cancelSearch = (): void => {
  isSearching = false;
  console.log('画像検索処理がキャンセルされました');
};

// 検索キャンセルイベントリスナー
if (typeof window !== 'undefined') {
  window.addEventListener('cancel-image-search', () => {
    console.log('検索キャンセルイベントを受信');
    cancelSearch();
  });
}

/**
 * 新規入力メッセージのみを対象とした画像検索
 * @param text 新規入力されたテキスト（履歴ではない）
 * @param isNewMessage 新規メッセージかどうかのフラグ
 * @returns 検索結果の配列
 */
export const searchByText = async (text: string, isNewMessage: boolean = false): Promise<any[]> => {
  // 新規メッセージ以外は完全にスキップ（履歴による無限ループ防止）
  if (!isNewMessage) {
    console.log('履歴メッセージの検索はスキップ - 新規入力のみ処理');
    return [];
  }

  // 自動検索完全無効化チェック
  if (typeof window !== 'undefined' && (window as any)._fuseSearchDisabled) {
    console.log('自動検索が無効化されているため、検索をスキップします');
    return [];
  }

  // 空のテキストや短いテキストはスキップ
  if (!text || text.trim().length < 2) {
    console.log('検索テキストが短すぎるため、検索をスキップします');
    return [];
  }

  const currentTime = Date.now();

  // 重複検索防止（より厳格に）
  if (isSearching) {
    console.log('既に検索中のため、新しい検索をスキップします');
    return [];
  }

  // 短時間での重複検索を防止
  if (currentTime - lastSearchTime < SEARCH_INTERVAL_LIMIT) {
    console.log('検索間隔が短すぎるため、検索をスキップします');
    return [];
  }

  // 同じテキストの重複検索を防止
  if (text === lastSearchText) {
    console.log('同じテキストの重複検索をスキップします:', text);
    return lastSearchResults;
  }

  lastSearchTime = currentTime;
  lastSearchText = text;

  try {
    isSearching = true;
    console.log('🔍 画像検索開始:', text);
    console.log('📊 現在の検索データ件数:', imageSearchData.length);

    // データが読み込まれていない場合のみ読み込み
    if (imageSearchData.length === 0 && !isLoading) {
      console.log('画像検索データが読み込まれていないため再ロード');
      await loadImageSearchData();

      // データが空の場合は早期リターン
      if (imageSearchData.length === 0) {
        console.warn('画像検索データが空です');
        lastSearchResults = [];
        return [];
      }

      console.log('📊 データ読み込み後の件数:', imageSearchData.length);
    }

    // データ読み込み中の場合は待機
    if (isLoading) {
      console.log('データ読み込み中のため検索をスキップします');
      return [];
    }

    // データの実際の内容をデバッグ
    if (imageSearchData.length > 0) {
      console.log('🔍 検索データサンプル:', {
        firstItem: imageSearchData[0],
        totalCount: imageSearchData.length,
        sampleTitles: imageSearchData.slice(0, 3).map(item => item.title),
        sampleKeywords: imageSearchData.slice(0, 3).map(item => item.keywords)
      });
    }

    // Fuseインスタンスを安全に取得
    let fuse;
    try {
      fuse = getFuseInstance();
      console.log('✅ Fuseインスタンス作成成功');
    } catch (fuseError) {
      console.error('Fuseインスタンスの作成に失敗:', fuseError);
      return [];
    }

    // キーワードを分割して検索
    const keywords = text.trim().split(/\s+/).filter(k => k.length > 1);
    let searchResults: any[] = [];

    if (keywords.length === 0) {
      console.log('有効なキーワードが見つからないため検索をスキップします');
      return [];
    }

    console.log('🔎 検索キーワード:', keywords);

    try {
      if (keywords.length > 1) {
        console.log(`複数キーワード検索: ${keywords.join(', ')}`);
        // 複数のキーワードがある場合、各キーワードで検索
        const resultMap = new Map<string | number, any>();

        for (const keyword of keywords) {
          try {
            console.log(`🔍 キーワード "${keyword}" で検索中...`);
            const results = fuse.search(keyword);
            console.log(`📊 キーワード "${keyword}" の検索結果: ${results.length}件`);
            
            results.forEach(result => {
              if (result && result.item && result.item.id) {
                const existingResult = resultMap.get(result.item.id);
                if (!existingResult || (existingResult.score && result.score && result.score < existingResult.score)) {
                  resultMap.set(result.item.id, result);
                }
              }
            });
          } catch (keywordError) {
            console.warn(`キーワード "${keyword}" の検索でエラー:`, keywordError);
          }
        }

        searchResults = Array.from(resultMap.values());
        console.log(`📊 複数キーワード統合結果: ${searchResults.length}件`);
      } else if (keywords.length === 1) {
        console.log(`単一キーワード検索: ${keywords[0]}`);
        searchResults = fuse.search(keywords[0]);
        console.log(`📊 単一キーワード検索結果: ${searchResults.length}件`);
      }

      // 検索結果の詳細をログ出力
      if (searchResults.length > 0) {
        console.log('🎯 検索結果詳細:', {
          count: searchResults.length,
          samples: searchResults.slice(0, 3).map(result => ({
            id: result.item?.id,
            title: result.item?.title,
            score: result.score,
            file: result.item?.file
          }))
        });
      } else {
        console.log('❌ 検索結果が見つかりませんでした');
        
        // デバッグ: 手動で一致するものがあるかチェック
        const manualCheck = imageSearchData.filter(item => {
          const titleMatch = item.title && item.title.includes(keywords[0]);
          const keywordMatch = item.keywords && item.keywords.some(k => k.includes(keywords[0]));
          const searchTextMatch = item.searchText && item.searchText.includes(keywords[0]);
          return titleMatch || keywordMatch || searchTextMatch;
        });
        
        console.log('🔍 手動チェック結果:', {
          keyword: keywords[0],
          manualMatches: manualCheck.length,
          samples: manualCheck.slice(0, 2).map(item => ({
            id: item.id,
            title: item.title,
            matchingKeywords: item.keywords?.filter(k => k.includes(keywords[0]))
          }))
        });
      }
    } catch (searchError) {
      console.error('Fuse検索処理でエラー:', searchError);
      return [];
    }

    // 結果を制限（パフォーマンス改善）
    const limitedResults = searchResults.slice(0, 15).filter(result => 
      result && result.item && result.item.id && result.item.file
    );

    console.log(`✅ 最終検索結果: ${limitedResults.length}件見つかりました（全${searchResults.length}件中）`);

    // 結果をキャッシュ
    lastSearchResults = limitedResults;

    return limitedResults;
  } catch (error) {
    console.error('❌ 画像検索エラー:', error);
    lastSearchResults = [];
    return []; // エラー時は空配列を返してクラッシュを防ぐ
  } finally {
    // 検索完了後、少し遅延してからフラグを解除
    setTimeout(() => {
      isSearching = false;
    }, 200);
  }
};