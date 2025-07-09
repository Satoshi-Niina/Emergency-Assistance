import Fuse from 'fuse.js';

// 型定義
interface ImageSearchData {
  id: string;
  file: string;
  title: string;
  category: string;
  keywords: string[];
  description: string;
  searchText?: string;
  pngFallback?: string;
}

interface SearchResult {
  item: ImageSearchData;
  score?: number;
}

// グローバル変数
let imageSearchData: ImageSearchData[] = [];
let fuse: Fuse<ImageSearchData> | null = null;
let isDataLoaded = false;
let isLoading = false;

// Fuseの設定
const fuseOptions: Fuse.IFuseOptions<ImageSearchData> = {
  keys: [
    { name: 'title', weight: 0.3 },
    { name: 'description', weight: 0.2 },
    { name: 'keywords', weight: 0.3 },
    { name: 'category', weight: 0.1 },
    { name: 'searchText', weight: 0.1 }
  ],
  threshold: 0.6,
  distance: 100,
  minMatchCharLength: 1,
  includeScore: true,
  ignoreLocation: true,
  useExtendedSearch: true
};

// 画像検索データの読み込み
async function loadImageSearchData(): Promise<void> {
  if (isLoading || isDataLoaded) return;

  isLoading = true;
  console.log('📊 画像検索データの読み込みを開始します');

  try {
    // APIベースURLを取得
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    
    // まずAPIからJSONを読み込み（認証付き）
    let response = await fetch(`${apiBaseUrl}/knowledge-base/data/image_search_data.json?t=${Date.now()}`, {
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'pragma': 'no-cache',
        'cache-control': 'no-cache'
      }
    });

    // APIから読み込めない場合は、初期化APIを呼び出し
    if (!response.ok) {
      console.log('APIから読み込めないため、初期化APIを呼び出します');
      const initResponse = await fetch(`${apiBaseUrl}/api/tech-support/init-image-search-data`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (initResponse.ok) {
        console.log('APIからの初期化が成功しました');
        // 再度APIから読み込み
        response = await fetch(`${apiBaseUrl}/knowledge-base/data/image_search_data.json?t=${Date.now()}`, {
          credentials: 'include',
          cache: 'no-store'
        });
      }
    }

    if (response.ok) {
      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        imageSearchData = data;

        // 各アイテムにsearchTextを追加
        imageSearchData = imageSearchData.map(item => ({
          ...item,
          searchText: [
            item.title,
            item.description,
            ...(item.keywords || []),
            item.category
          ].filter(Boolean).join(' ')
        }));

        // Fuseインスタンスを作成
        fuse = new Fuse(imageSearchData, fuseOptions);
        isDataLoaded = true;

        console.log(`✅ 画像検索データを読み込みました: ${imageSearchData.length}件`);
        console.log('🔍 Fuseインスタンスを作成しました');

        // テスト検索を実行
        const testResults = fuse.search('保守用車');
        console.log(`🧪 テスト検索結果: ${testResults.length}件`);

        return;
      }
    }

    throw new Error('データの読み込みに失敗しました');

  } catch (error) {
    console.error('❌ 画像検索データの読み込みに失敗:', error);
    imageSearchData = [];
    fuse = null;
    isDataLoaded = false;
  } finally {
    isLoading = false;
  }
}

// 画像検索関数
export async function searchImages(query: string): Promise<ImageSearchData[]> {
  console.log('🔍 画像検索開始:', query);

  // データが読み込まれていない場合は読み込み
  if (!isDataLoaded && !isLoading) {
    await loadImageSearchData();
  }

  // データ読み込み中の場合は少し待機
  if (isLoading) {
    console.log('⏳ データ読み込み中のため少し待機します...');
    let attempts = 0;
    while (isLoading && attempts < 50) { // 最大5秒待機
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
  }

  if (!fuse || !isDataLoaded || imageSearchData.length === 0) {
    console.log('❌ 検索データまたはFuseインスタンスが利用できません');
    console.log('データ状態:', { 
      fuseExists: !!fuse, 
      isDataLoaded, 
      dataCount: imageSearchData.length 
    });
    
    // データが読み込まれていない場合は再読み込みを試行
    if (!isDataLoaded) {
      console.log('🔄 データの再読み込みを試行します');
      await loadImageSearchData();
      
      // 再読み込み後に再度チェック
      if (fuse && imageSearchData.length > 0) {
        console.log('✅ 再読み込み後にデータが利用可能になりました');
      } else {
        return [];
      }
    } else {
      return [];
    }
  }

  if (!query || query.trim().length === 0) {
    console.log('⚠️ 検索クエリが空です');
    return [];
  }

  try {
    console.log(`🔍 Fuseで検索実行: "${query}"`);
    console.log('📊 検索対象データ数:', imageSearchData.length);

    // Fuseで検索実行
    const results = fuse.search(query);
    console.log(`🎯 Fuse検索結果: ${results.length}件`);

    if (results.length > 0) {
      results.forEach((result, index) => {
        console.log(`結果 ${index + 1}: ${result.item.title} (スコア: ${result.score})`);
      });
    }

    // 結果を返す
    const items = results.map(result => result.item).slice(0, 10);
    console.log(`✅ 最終返却データ: ${items.length}件`);

    return items;

  } catch (error) {
    console.error('❌ 検索中にエラーが発生:', error);
    return [];
  }
}

// 手動でのデータ再読み込み
export const reloadImageSearchData = async (): Promise<void> => {
  console.log('🔄 画像検索データを強制的に再読み込みします');
  isDataLoaded = false;
  isLoading = false;
  imageSearchData = [];
  fuse = null;
  await loadImageSearchData();
};

// 検索キャンセル用の変数
let searchAbortController: AbortController | null = null;

// 検索をキャンセルする関数
export const cancelSearch = (): void => {
  if (searchAbortController) {
    searchAbortController.abort();
    searchAbortController = null;
    console.log('検索キャンセルイベントを受信');
    console.log('画像検索処理がキャンセルされました');
  }
};

// 検索関数を更新して、テキストベース検索も追加
export const searchByText = async (query: string, isManualSearch: boolean = false): Promise<any[]> => {
  return await searchImages(query);
};

// 初期化関数
export const initializeImageSearch = async (): Promise<void> => {
  if (!isDataLoaded && !isLoading) {
    await loadImageSearchData();
  }
};

// アプリケーション起動時に初期化
initializeImageSearch();