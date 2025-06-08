import { FileText, MessageCircle } from "lucide-react";
import { useOrientation } from "@/hooks/use-orientation";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect } from "react";
import { cancelSearch, reloadImageSearchData } from "@/lib/image-search";

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
  type: string; // 'image' | 'text' | 'ai-response' | string
  url?: string;
  pngFallbackUrl?: string; // 代替画像のURL（非推奨、互換性のために残す）
  content?: string;
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

  // 検索結果は単発表示のみ - 履歴監視完全停止
  useEffect(() => {
    if (results && results.length > 0) {
      console.log('🔍 検索結果表示開始 - 履歴監視なし');
      
      // 実行中の検索をキャンセル
      try {
        cancelSearch();
        if (typeof window !== 'undefined') {
          (window as any)._fuseSearchDisabled = true;
        }
      } catch (error) {
        console.warn('検索キャンセルエラー:', error);
      }
      
      // 短時間で自動クリア（ループ防止）
      const clearTimer = setTimeout(() => {
        console.log('🔍 検索結果を短時間でクリア（ループ防止）');
        onClear();
      }, 15000); // 15秒に短縮
      
      return () => clearTimeout(clearTimer);
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

  // 画像読み込みエラーハンドラ（強化版）
  const handleImageError = (imgElement: HTMLImageElement, result: SearchResult, retryCount = 0) => {
    try {
      const originalSrc = imgElement.src;
      console.error(`画像読み込みエラー (試行${retryCount + 1}):`, originalSrc);

      if (retryCount < 2) {
        let retryPath = '';
        const fileName = (result.url || result.file || '').split('/').pop();

        if (retryCount === 0 && fileName) {
          // 1回目: 直接knowledge-base/images/パスで再試行
          retryPath = `/knowledge-base/images/${fileName}`;
        } else if (retryCount === 1 && fileName) {
          // 2回目: ファイル存在確認をスキップして次の処理へ
          console.warn(`画像ファイルが見つかりません: ${fileName}`);
          // エラー表示に直接移行
          retryCount = 99; // 強制的にエラー表示へ
        }

        if (retryPath && retryPath !== originalSrc && retryCount < 2) {
          console.log(`画像読み込み再試行 ${retryCount + 1}:`, retryPath);
          imgElement.src = retryPath;
          imgElement.onerror = () => handleImageError(imgElement, result, retryCount + 1);
          return;
        }
      }

      // すべての再試行が失敗した場合の処理
      console.error('すべての画像読み込み試行が失敗しました:', {
        originalUrl: result.url || result.file,
        fileName: (result.url || result.file || '').split('/').pop(),
        title: result.title
      });

      // エラー表示
      const placeholder = imgElement.parentElement?.querySelector('.loading-placeholder');
      if (placeholder) {
        (placeholder as HTMLElement).style.display = 'none';
      }

      imgElement.style.display = 'none';

      const container = imgElement.parentElement;
      if (container && !container.querySelector('.image-error')) {
        const errorElement = document.createElement('div');
        errorElement.className = 'image-error flex items-center justify-center h-full w-full bg-gray-100 text-gray-500 text-sm rounded-md min-h-[150px]';
        const fileName = (result.url || result.file || '').split('/').pop() || 'ファイル名不明';
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
    } catch (error) {
      console.error('画像エラーハンドリング処理エラー:', error);
    }
  };

  return (
    <div className={containerClass}>
      {/* モバイル表示時のみタイトルを表示 */}
      {isMobile && (
        <div className="sticky top-0 bg-blue-600 text-white p-2 z-10 mb-3">
          <div className="flex justify-between items-center">
            <h2 className="font-medium text-lg">関係画像</h2>
            <button 
              onClick={onClear}
              className="text-white hover:text-blue-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* サムネイル縦一列表示 */}
      <div className="flex flex-col gap-4">
        {results.map((result) => {
          const imageSrc = fixImagePath(result.url || result.file || '');

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
    </div>
  );
}