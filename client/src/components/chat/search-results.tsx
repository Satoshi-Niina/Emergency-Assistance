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
  
  // コンポーネントマウント時に画像検索データを再読み込み
  useEffect(() => {
    // 画像検索データの初期化を実行
    console.log('SearchResultsコンポーネントがマウントされました。画像検索データを初期化します。');
    fetch('/api/tech-support/init-image-search-data', { 
      method: 'POST',
      cache: 'no-store'
    })
    .then(response => {
      if (response.ok) {
        return response.json();
      }
      throw new Error('画像検索データの初期化に失敗しました');
    })
    .then(data => {
      console.log('画像検索データの初期化が完了しました:', data);
      // 初期化が成功したら、データを再読み込み
      reloadImageSearchData();
    })
    .catch(error => {
      console.error('画像検索データの初期化中にエラーが発生しました:', error);
    });
  }, []);

  // 検索結果を表示したら検索処理を停止（点滅問題解決）
  useEffect(() => {
    if (results && results.length > 0) {
      // 検索結果が表示されたら、実行中の検索をキャンセルして点滅を防止
      cancelSearch();
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
        {/* デバッグ情報 */}
        {results.length > 0 && (
          <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
            検索結果: {results.length}件
          </div>
        )}
        {results.map((result) => (
          <div 
            key={result.id} 
            className="thumbnail-item rounded-lg overflow-hidden bg-transparent shadow-sm w-full hover:bg-blue-50 transition-colors"
            onClick={() => {
              // イメージプレビューモーダルを表示
              window.dispatchEvent(new CustomEvent('preview-image', { 
                detail: { 
                  url: fixImagePath(result.url),
                  pngFallbackUrl: fixImagePath(result.pngFallbackUrl),
                  title: result.title,
                  content: result.content,
                  metadata_json: result.metadata_json,
                  all_slides: result.all_slides?.map(slide => fixImagePath(slide))
                } 
              }));
            }}
          >
            {result.url ? (
              // 画像サムネイル (テキストなしのカードスタイル)
              <div className="flex justify-center items-center w-full bg-transparent border border-blue-200 rounded-lg">
                <div className="relative w-full h-24 flex-shrink-0 overflow-hidden">
                  {/* バックアップ画像がある場合は先にロードして隠しておく（互換性のために残す） */}
                  {result.pngFallbackUrl && result.pngFallbackUrl.trim() !== '' && (
                    <img 
                      src={fixImagePath(result.pngFallbackUrl)}
                      alt="バックアップ画像"
                      className="hidden" 
                      style={{ display: 'none' }}
                      loading="eager"
                      decoding="async"
                    />
                  )}
                  
                  {/* 画像読み込み中のプレースホルダー - サムネイルサイズに最適化 */}
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                    <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                  </div>
                  
                  {/* メイン画像表示 - シンプルな表示ロジック */}
                  <img 
                    src={fixImagePath(result.url || '')} 
                    alt={result.title || "応急処置サポート"} 
                    className="w-full h-full object-contain bg-white p-1 z-10 relative"
                    style={{ minHeight: '96px', minWidth: '96px' }}
                    loading="eager"
                    decoding="async"
                    onError={(e) => {
                      const imgElement = e.currentTarget;
                      console.log(`画像読み込みエラー: ${imgElement.src}`);
                      
                      // シンプルなエラー表示
                      imgElement.style.display = 'none';
                      const container = imgElement.parentElement;
                      if (container && !container.querySelector('.error-message')) {
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'error-message flex items-center justify-center h-full w-full bg-gray-100 text-gray-500 text-sm';
                        errorDiv.textContent = '画像読み込み失敗';
                        container.appendChild(errorDiv);
                      }
                    }}
                    onLoad={(e) => {
                      const imgElement = e.currentTarget;
                      console.log(`画像読み込み成功: ${imgElement.src}`);
                      
                      // プレースホルダーを非表示
                      const container = imgElement.parentElement;
                      if (container) {
                        const placeholder = container.querySelector('.animate-spin');
                        if (placeholder && placeholder.parentElement) {
                          placeholder.parentElement.style.display = 'none';
                        }
                      }
                    }}
                  />
                  {/* 画像説明タイトルは非表示に変更（ユーザー要求により） */}
                </div>
              </div>
            ) : (
              // テキストコンテンツとドキュメント (横長スタイル)
              <div className="flex h-24 w-full bg-transparent border border-blue-200 rounded-lg">
                <div className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center bg-blue-50">
                  {result.type === 'ai-response' ? (
                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                      <span className="material-icons text-white">smart_toy</span>
                    </div>
                  ) : result.type === 'text' ? (
                    <MessageCircle className="h-12 w-12 text-blue-600" />
                  ) : (
                    <FileText className="h-12 w-12 text-blue-600" />
                  )}
                </div>
                <div className="flex-1 p-2 flex flex-col justify-center">
                  <h3 className="text-sm font-bold text-blue-700">{result.title || (result.type === 'ai-response' ? "AI応答" : "ドキュメント")}</h3>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
