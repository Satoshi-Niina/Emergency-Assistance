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

  // 検索結果を表示したら検索処理を停止（点滅問題解決）
  useEffect(() => {
    if (results && results.length > 0) {
      // 検索結果が表示されたら、実行中の検索をキャンセルして点滅を防止
      try {
        cancelSearch();
        // 自動検索も完全無効化
        if (typeof window !== 'undefined') {
          (window as any)._fuseSearchDisabled = true;
        }
      } catch (error) {
        console.warn('検索キャンセル処理でエラー:', error);
      }
    }
  }, [results]);

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
    if (!originalPath) return '';

    // 既に正しいパスの場合はそのまま返す
    if (originalPath.startsWith('/knowledge-base/images/')) {
      return originalPath;
    }

    // ファイル名だけを抽出
    const fileName = originalPath.split('/').pop();
    if (!fileName) return originalPath;

    // knowledge-base/imagesパスに統一
    return `/knowledge-base/images/${fileName}`;
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

  // 画像読み込みエラーハンドラ（簡素化）
  const handleImageError = (imgElement: HTMLImageElement, result: SearchResult, retryCount = 0) => {
    try {
      if (retryCount === 0) {
        // 1回だけリトライ（knowledge-base/images/パスで）
        const fileName = (result.url || result.file || '').split('/').pop();
        const retryPath = fileName ? `/knowledge-base/images/${fileName}` : '';

        if (retryPath && retryPath !== imgElement.src) {
          imgElement.src = retryPath;
          imgElement.onerror = () => handleImageError(imgElement, result, 1);
          return;
        }
      }

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
        errorElement.innerHTML = `
          <div class="text-center p-4">
            <div class="text-gray-400 mb-2">📷</div>
            <div>画像を読み込めません</div>
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
                  ref={(img) => {
                    if (!img || !imageSrc) return;

                    // 重複処理を防ぐためのフラグチェック
                    if (img.dataset.initialized === 'true') {
                      return;
                    }

                    img.dataset.initialized = 'true';

                    // 既存のオブザーバーをクリーンアップ
                    if (img.dataset.observer) {
                      try {
                        const existingObserver = (img as any).__intersectionObserver;
                        if (existingObserver) {
                          existingObserver.disconnect();
                        }
                      } catch (error) {
                        console.warn('既存オブザーバーのクリーンアップエラー:', error);
                      }
                    }

                    // 画像の読み込み処理を設定（遅延読み込み）
                    const observer = new IntersectionObserver((entries) => {
                      entries.forEach(entry => {
                        if (entry.isIntersecting && img) {
                          try {
                            img.onload = () => handleImageLoad(img, result);
                            img.onerror = () => handleImageError(img, result);
                            img.src = imageSrc;
                            observer.unobserve(img);
                            observer.disconnect();
                          } catch (error) {
                            console.error('画像読み込み設定エラー:', error);
                          }
                        }
                      });
                    }, {
                      threshold: 0.1,
                      rootMargin: '50px'
                    });

                    try {
                      observer.observe(img);
                      (img as any).__intersectionObserver = observer;
                      img.dataset.observer = 'true';
                    } catch (error) {
                      console.error('IntersectionObserverエラー:', error);
                      // フォールバック: 直接画像を読み込み
                      img.src = imageSrc;
                    }
                  }}
                  alt={result.title || '関連画像'}
                  className="absolute inset-0 w-full h-full object-cover z-10 rounded-md"
                  loading="lazy"
                  onError={(e) => {
                    try {
                      console.error('画像の読み込みに失敗しました:', result.file || result.url);
                      e.currentTarget.style.display = 'none';
                    } catch (error) {
                      console.error('画像エラーハンドリングエラー:', error);
                    }
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