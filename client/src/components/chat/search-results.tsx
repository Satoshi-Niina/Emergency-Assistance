import { FileText, MessageCircle } from "lucide-react";
import { useOrientation } from "../../hooks/use-orientation";
import { useIsMobile } from "../../hooks/use-mobile";
import { useEffect } from "react";
import { cancelSearch, reloadImageSearchData } from "../../lib/image-search.ts";

// 画像パスを修正するヘルパー関数 - PNG形式に統一
function fixImagePath(path: string | undefined): string {
  if (!path) return '';

  // knowledge-base/images/ パスを持っていれば変更しない
  if (path.includes('/knowledge-base/images/')) {
    // SVG拡張子の場合はPNGに変換
    if (path.endsWith('.svg')) {
      return path.replace('.svg', '.png');
    }
    return path;
  }

  // /uploads/images/ から始まる場合は /knowledge-base/images/ に変換
  if (path.includes('/uploads/images/')) {
    let newPath = path.replace('/uploads/images/', '/knowledge-base/images/');
    // SVG拡張子の場合はPNGに変換
    if (newPath.endsWith('.svg')) {
      return newPath.replace('.svg', '.png');
    }
    return newPath;
  }

  // /images/ から始まる場合は /knowledge-base/images/ に変換
  if (path.startsWith('/images/')) {
    let newPath = path.replace('/images/', '/knowledge-base/images/');
    // SVG拡張子の場合はPNGに変換
    if (newPath.endsWith('.svg')) {
      return newPath.replace('.svg', '.png');
    }
    return newPath;
  }

  // /uploads/ から始まるがサブフォルダが不明確な場合
  if (path.startsWith('/uploads/') && !path.includes('/uploads/data/') && !path.includes('/uploads/json/')) {
    const parts = path.split('/');
    const fileName = parts.pop(); // 最後の部分（ファイル名）を取得
    if (fileName) {
      // SVG拡張子の場合はPNGに変換
      if (fileName.endsWith('.svg')) {
        return `/knowledge-base/images/${fileName.replace('.svg', '.png')}`;
      }
      return `/knowledge-base/images/${fileName}`;
    }
  }

  // 単なるファイル名の場合（パスがない）
  if (!path.includes('/')) {
    // SVG拡張子の場合はPNGに変換
    if (path.endsWith('.svg')) {
      return `/knowledge-base/images/${path.replace('.svg', '.png')}`;
    }
    // 画像ファイルの場合はknowledge-baseフォルダに配置
    if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      return `/knowledge-base/images/${path}`;
    }
  }

  return path;
}

interface SearchResult {
  id: number | string;
  title: string;
  type?: string; // 'image' | 'text' | 'ai-response' | string
  url?: string;
  file?: string; // 画像ファイルパス
  pngFallbackUrl?: string; // 代替画像のURL（非推奨、互換性のために残す）
  content?: string;
  description?: string;
  category?: string;
  keywords?: string[];
  relevance?: number;
  timestamp?: Date;
  metadata_json?: string;
  all_slides?: string[];
  details?: string;
}

interface SearchResultsProps {
  results: SearchResult[];
  onClear: () => void;
}

export default function SearchResults({ results, onClear }: SearchResultsProps) {
  const orientation = useOrientation();
  const { isMobile } = useIsMobile();

  // 初期化は削除（重複防止）

  // 検索結果の表示管理 - 自動クリアを無効化
  useEffect(() => {
    if (results && results.length > 0) {
      console.log('🔍 検索結果表示開始 - 継続表示モード');
      
      // 実行中の検索をキャンセル
      try {
        cancelSearch();
        if (typeof window !== 'undefined') {
          (window as any)._fuseSearchDisabled = true;
        }
      } catch (error) {
        console.warn('検索キャンセルエラー:', error);
      }
      
      // 自動クリア機能を無効化 - 画像は手動でクリアするまで表示し続ける
      console.log('📌 画像検索結果を継続表示します（自動クリアなし）');
    }
  }, [results.length]); // results全体ではなくlengthのみ監視

  // デバイスに応じたレイアウトクラス
  // iPhoneの場合は特別なスタイルを適用
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

  // 画面方向に応じたスタイルの設定
  const isLandscape = orientation === 'landscape';

  // モバイル&横向きの場合は全画面表示、それ以外は通常表示
  const containerClass = isMobile && isLandscape
    ? "fixed inset-0 z-50 bg-transparent p-4 overflow-auto chat-controls-container"
    : "p-4";

  // 画像パスを修正する関数（knowledge-base/imagesに統一）
  const fixImagePath = (originalPath: string): string => {
    if (!originalPath) {
      console.warn('空の画像パスが渡されました');
      return '';
    }

    console.log('画像パス修正前:', originalPath);

    // 既に正しいパスの場合はそのまま返す
    if (originalPath.startsWith('/knowledge-base/images/')) {
      console.log('正しいパスのため変更なし:', originalPath);
      return originalPath;
    }

    // ファイル名だけを抽出
    const fileName = originalPath.split('/').pop();
    if (!fileName) {
      console.warn('ファイル名を抽出できませんでした:', originalPath);
      return originalPath;
    }

    // knowledge-base/imagesパスに統一
    const fixedPath = `/knowledge-base/images/${fileName}`;
    console.log('画像パス修正後:', fixedPath);
    return fixedPath;
  };

  // 画像のロード処理を改善
  const handleImageLoad = (imgElement: HTMLImageElement, result: SearchResult) => {
    try {
      // ローディングプレースホルダーを非表示
      const placeholder = imgElement.parentElement?.querySelector('.loading-placeholder');
      if (placeholder) {
        (placeholder as HTMLElement).style.display = 'none';
      }
    } catch (error) {
      console.error('画像ロード処理エラー:', error);
    }
  };

  // 画像読み込みエラーハンドラ（簡略版）
  const handleImageError = (imgElement: HTMLImageElement, result: SearchResult, retryCount = 0) => {
    try {
      const originalSrc = imgElement.src;
      const fileName = (result.url || result.file || '').split('/').pop() || '';
      
      console.error(`画像読み込みエラー (試行${retryCount + 1}):`, {
        src: originalSrc,
        fileName: fileName
      });

      // リトライ処理（1回のみ）
      if (retryCount < 1) {
        const retryPath = `/knowledge-base/images/${fileName}`;
        if (retryPath !== originalSrc) {
          console.log(`画像読み込み再試行:`, retryPath);
          imgElement.src = retryPath;
          imgElement.onerror = () => handleImageError(imgElement, result, retryCount + 1);
          return;
        }
      }

      // 再試行も失敗した場合
      showImageError(imgElement, result, fileName);
    } catch (error) {
      console.error('画像エラーハンドリング処理エラー:', error);
    }
  };

  // エラー表示の共通関数
  const showImageError = (imgElement: HTMLImageElement, result: SearchResult, fileName: string) => {
    // プレースホルダーを非表示
    const placeholder = imgElement.parentElement?.querySelector('.loading-placeholder');
    if (placeholder) {
      (placeholder as HTMLElement).style.display = 'none';
    }

    imgElement.style.display = 'none';

    const container = imgElement.parentElement;
    if (container && !container.querySelector('.image-error')) {
      const errorElement = document.createElement('div');
      errorElement.className = 'image-error flex items-center justify-center h-full w-full bg-gray-100 text-gray-500 text-sm rounded-md min-h-[150px]';
      errorElement.innerHTML = `
        <div class="text-center p-4">
          <div class="text-gray-400 mb-2">📷</div>
          <div class="font-medium">画像が見つかりません</div>
          <div class="text-xs mt-1 text-gray-400">${fileName}</div>
          <div class="text-xs mt-1">${result.title || 'タイトル不明'}</div>
        </div>
      `;
      container.appendChild(errorElement);
    }
  };

  // より柔軟な存在確認ロジック（複数のプロパティから画像パスを取得）
  const filteredResults = results.filter((result) => {
    // 複数のプロパティから画像パスを取得を試行
    const imagePath = result.url || result.file || result.src || result.pngFallback || '';
    
    console.log('🔍 画像パス取得試行:', {
      url: result.url,
      file: result.file, 
      src: result.src,
      pngFallback: result.pngFallback,
      finalPath: imagePath
    });
    
    if (!imagePath) {
      console.warn(`❌ すべてのプロパティから画像パスが取得できません:`, result);
      return false;
    }
    
    const fileName = imagePath.split('/').pop();
    
    // ファイル名が存在し、画像拡張子を持つ場合は表示する
    if (fileName && (fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg'))) {
      console.log(`✅ 画像ファイルを表示対象に追加: ${fileName} (パス: ${imagePath})`);
      return true;
    }
    
    if (!fileName) {
      console.warn(`❌ ファイル名が取得できません - パス: ${imagePath}`);
      return false;
    }
    
    console.warn(`❌ 画像ファイルとして認識されません: ${fileName}`);
    return false;
  });

  console.log(`表示する画像: ${filteredResults.length}件 (元: ${results.length}件)`);

  return (
    <div className={containerClass}>
      {/* 検索結果ヘッダー - デスクトップ・モバイル共通で表示 */}
      {filteredResults.length > 0 && (
        <div className="sticky top-0 bg-blue-600 text-white p-2 z-10 mb-3 rounded-t-md">
          <div className="flex justify-between items-center">
            <h2 className="font-medium text-lg">関連画像 ({filteredResults.length}件)</h2>
            <button 
              onClick={onClear}
              className="text-white hover:text-blue-200 px-2 py-1 rounded hover:bg-blue-500 transition-colors"
              title="画像をクリア"
            >
              ✕ クリア
            </button>
          </div>
        </div>
      )}

      {/* 存在確認済みの画像のみ表示 */}
      {filteredResults.length === 0 ? (
        <div className="text-center text-gray-500 p-4">
          <div className="text-gray-400 mb-2">📷</div>
          <div>表示可能な画像がありません</div>
        </div>
      ) : (
        /* サムネイル縦一列表示 */
        <div className="flex flex-col gap-4">
          {filteredResults.map((result) => {
          // 複数のプロパティから画像パスを取得
          const imagePath = result.url || result.file || result.src || result.pngFallback || '';
          const imageSrc = fixImagePath(imagePath);
          
          console.log('🖼️ 画像表示:', {
            resultId: result.id,
            originalPath: imagePath,
            fixedPath: imageSrc,
            title: result.title
          });

          const handleImageClick = (imageSrc: string, title: string) => {
            // 説明文を結合して表示
            const description = result.description || result.content || '';
            const detailedContent = [
              title,
              description,
              result.category ? `カテゴリ: ${result.category}` : '',
              result.keywords ? `キーワード: ${result.keywords.join(', ')}` : ''
            ].filter(Boolean).join('\n\n');

            window.dispatchEvent(new CustomEvent('preview-image', { 
              detail: { 
                url: imageSrc,
                title: title,
                content: detailedContent,
                metadata_json: result.metadata_json,
                all_slides: result.all_slides?.map(slide => fixImagePath(slide))
              } 
            }));
          };

          return (
            <div key={result.id} className="relative group">
              <div 
                className={`relative overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-105 ${
                  isMobile ? 'aspect-square' : 'aspect-[4/3]'
                }`}
                onClick={() => handleImageClick(imageSrc, result.title || '')}
              >
                {/* 画像読み込み中プレースホルダー - 常に表示 */}
                <div className="loading-placeholder absolute inset-0 flex items-center justify-center z-0 bg-gray-100 rounded-md">
                  <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
                </div>

                {/* 実際の画像 */}
                <img
                  src={imageSrc}
                  alt={result.title || '関連画像'}
                  className="absolute inset-0 w-full h-full object-cover z-10 rounded-md"
                  onLoad={(e) => {
                    const imgElement = e.currentTarget;
                    handleImageLoad(imgElement, result);
                    console.log('画像表示成功:', imageSrc);
                  }}
                  onError={(e) => {
                    const imgElement = e.currentTarget;
                    console.error('画像の読み込みに失敗しました:', imageSrc);
                    handleImageError(imgElement, result);
                  }}
                />
              </div>

              {/* タイトル表示（モバイル時のみ表示） */}
              {isMobile && (
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 rounded-b-md truncate z-20">
                  {result.title || 'タイトル不明'}
                </div>
              )}

              {/* デバッグ情報（開発時のみ） */}
              {process.env.NODE_ENV === 'development' && (
                <div className="absolute top-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 rounded-bl-md z-20 max-w-[100px] truncate">
                  {imageSrc.split('/').pop()}
                </div>
              )}
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
}