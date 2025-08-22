import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, ChevronLeft, ChevronRight, Info } from "lucide-react";

// 画像パスを修正するヘルパ�E関数 - PNG形式に統一
function fixImagePath(path: string | undefined): string {
  if (!path) return '';
  
  // プロトコルを含むURLの場合�Eそ�Eまま返す (外部リンク)
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // すでに knowledge-base パスを持ってぁE��ばそ�Eまま返す
  if (path.includes('/knowledge-base/images/')) {
    return path; // 允E�E拡張子を維持E
  }
  
  // uploads パスから knowledge-base パスへ変換
  if (path.includes('/uploads/')) {
    return path.replace('/uploads/', '/knowledge-base/');
  }
  
  // 画像ファイルの拡張子を持つパスはファイル名だけ抽出して知識�Eースのパスに変換
  if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.svg')) {
    const fileName = path.split('/').pop();
    if (fileName) {
      // SVG形式�E場合�EPNG形式に変換
      if (fileName.endsWith('.svg')) {
        const pngFileName = fileName.replace('.svg', '.png');
        return `/knowledge-base/images/${pngFileName}`;
      }
      
      // 他�E形式�Eそ�Eまま
      return `/knowledge-base/images/${fileName}`;
    }
  }

  return path;
}

interface ImageMetaData {
  metadata?: {
    タイトル?: string;
    作�E老E: string;
    作�E日?: string;
    修正日?: string;
    説昁E: string;
  };
  slides?: Array<{
    スライド番号?: number;
    タイトル?: string | null;
    本斁E: string[];
    ノ�EチE: string | null;
    画像テキスチE: Array<{
      画像パス?: string;
      チE��スチE: string;
    }>;
  }>;
}

export default function ImagePreviewModal() {
  // 状態変数
  const [isOpen, setIsOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [pngFallbackUrl, setPngFallbackUrl] = useState<string>("");
  const [metadataUrl, setMetadataUrl] = useState<string>("");
  const [allSlides, setAllSlides] = useState<string[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [metadataJson, setMetadataJson] = useState<ImageMetaData | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  // 説明文パネルを完�Eに非表示にする�E�常にfalse�E�E
  const showInfo = false;
  const [title, setTitle] = useState<string>("画像�Eレビュー");
  const [content, setContent] = useState<string>("");
  
  // メタチE�Eタを読み込む
  const loadMetadata = async (url: string) => {
    try {
      setIsLoadingMetadata(true);
      const response = await fetch(url);
      if (!response.ok) throw new Error('Metadata fetch failed');
      const data = await response.json();
      setMetadataJson(data);
    } catch (error) {
      console.error("Failed to load metadata:", error);
      setMetadataJson(null);
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  // スライドを変更する
  const changeSlide = (direction: 'next' | 'prev') => {
    if (!allSlides.length) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentSlideIndex + 1) % allSlides.length;
    } else {
      newIndex = (currentSlideIndex - 1 + allSlides.length) % allSlides.length;
    }
    
    setCurrentSlideIndex(newIndex);
    
    // 新スライドURLを設宁E
    const newSlideUrl = allSlides[newIndex];
    setImageUrl(newSlideUrl);
    
    // PNG形式�Eみを使用するため、フォールバックは設定しなぁE
    setPngFallbackUrl("");
  };

  useEffect(() => {
    // プレビュー画像イベント�Eリスナ�E
    const handlePreviewImage = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        // URLを設宁E
        if (customEvent.detail.url) {
          setImageUrl(customEvent.detail.url);
        }
        
        // PNG形式�EフォールバックURLを設宁E
        if (customEvent.detail.pngFallbackUrl) {
          setPngFallbackUrl(customEvent.detail.pngFallbackUrl);
        } else {
          setPngFallbackUrl("");
        }
        
        // タイトルを設宁E
        if (customEvent.detail.title) {
          setTitle(customEvent.detail.title);
        } else {
          setTitle("画像�Eレビュー");
        }
        
        // コンチE��チE��説明文�E�を設宁E
        if (customEvent.detail.content) {
          setContent(customEvent.detail.content);
        } else {
          setContent("");
        }
        
        // メタチE�EタJSONへのパスを設宁E
        if (customEvent.detail.metadata_json) {
          setMetadataUrl(customEvent.detail.metadata_json);
          loadMetadata(customEvent.detail.metadata_json);
        } else {
          setMetadataUrl("");
          setMetadataJson(null);
        }
        
        // 全スライド�E配�Eを設宁E
        if (customEvent.detail.all_slides && Array.isArray(customEvent.detail.all_slides)) {
          setAllSlides(customEvent.detail.all_slides);
          // 現在の画像がスライド�E列�Eどこにあるか見つける
          const index = customEvent.detail.all_slides.findIndex(
            (url: string) => url === customEvent.detail.url
          );
          setCurrentSlideIndex(index >= 0 ? index : 0);
        } else {
          setAllSlides([]);
          setCurrentSlideIndex(0);
        }
        
        // モーダルを忁E��表示する
        setIsOpen(true);
        
        // 惁E��パネルは表示しなぁE��EetShowInfoを削除�E�E
      }
    };
    
    window.addEventListener('preview-image', handlePreviewImage);
    
    return () => {
      window.removeEventListener('preview-image', handlePreviewImage);
    };
  }, []);

  // 現在のスライドに関連するスライド情報を取征E
  const getCurrentSlideInfo = () => {
    if (!metadataJson || !metadataJson.slides) return null;
    
    // 現在のスライドインチE��クスに一致するスライド情報を探ぁE
    const currentSlideNumber = currentSlideIndex + 1; // 0-indexから1-indexに変換
    return metadataJson.slides.find(
      slide => slide.スライド番号 === currentSlideNumber
    );
  };

  const currentSlideInfo = getCurrentSlideInfo();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent 
        className="max-w-5xl bg-black bg-opacity-90 border border-blue-400 flex flex-col items-center justify-center p-0 rounded-xl"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description image-preview-description"
      >
        <div className="sr-only">
          <h2 id="dialog-title">{metadataJson?.metadata?.タイトル || title}</h2>
          <p id="dialog-description">拡大画像ビューワー</p>
          <p id="image-preview-description">画像�Eプレビュー表示と関連惁E��の確認ができまぁE/p>
        </div>
        <div className="w-full flex justify-between items-center p-2 bg-blue-700 text-white">
          <h3 className="text-sm font-medium ml-2">
            {metadataJson?.metadata?.タイトル || title} 
            {allSlides.length > 1 && ` - スライチE${currentSlideIndex + 1}/${allSlides.length}`}
          </h3>
          <div className="flex items-center">
            <Button 
              className="text-white hover:bg-blue-600 rounded-full" 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        <div className="relative w-full max-h-[70vh] flex items-center justify-center p-2">
          {/* 前へボタン */}
          {allSlides.length > 1 && (
            <Button 
              className="absolute left-2 z-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full opacity-75 hover:opacity-100" 
              size="icon"
              onClick={() => changeSlide('prev')}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          
          {/* 読み込み中プレースホルダー */}
          <div className="absolute inset-0 flex items-center justify-center z-0 bg-gray-50">
            <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
          </div>
          
          {/* メイン画像表示 - 拡張子�Eそ�Eまま使用、エラー時�E自動�Eり替ぁE*/}
          <img 
            src={fixImagePath(imageUrl || '')} 
            alt={currentSlideInfo?.タイトル || title || "拡大画僁E} 
            className="max-w-full max-h-[70vh] object-contain rounded-lg border border-blue-500 z-10 relative"
            loading="eager"
            decoding="async"
            onLoad={(e) => {
              // 読み込み完亁E��にプレースホルダーを非表示に
              const imgElement = e.currentTarget;
              imgElement.classList.add('loaded');
              
              // 親要素を取征E
              const parent = imgElement.parentElement;
              if (parent) {
                // 読み込み中プレースホルダーを非表示に
                const placeholders = parent.querySelectorAll('.animate-spin');
                placeholders.forEach(ph => {
                  if (ph.parentElement) {
                    ph.parentElement.style.display = 'none';
                  }
                });
              }
            }}
            onError={(e) => {
              // エラー発生時は匁E��皁E��フォールバック処琁E
              const imgElement = e.currentTarget;
              const originalSrc = imgElement.src || '';
              
              console.log('画像表示エラー:', originalSrc);
              
              try {
                // 1. 専用フォールバックURLが指定されてぁE��場吁E
                if (pngFallbackUrl && pngFallbackUrl.trim() !== '') {
                  console.log('持E��されたフォールバックURLを使用:', pngFallbackUrl);
                  imgElement.src = fixImagePath(pngFallbackUrl);
                  return;
                }
                
                // 2. ファイル拡張子に基づくフォールバック
                // SVG画像�E場合�EPNGにフォールバック
                if (originalSrc.endsWith('.svg')) {
                  console.log('SVG->PNGのフォールバック');
                  const pngPath = originalSrc.replace('.svg', '.png');
                  imgElement.src = pngPath;
                  return;
                }
                
                // JPEG/JPG形式�E場合�EPNGにフォールバック
                if (originalSrc.endsWith('.jpeg') || originalSrc.endsWith('.jpg')) {
                  console.log('JPEG->PNGのフォールバック');
                  const pngPath = originalSrc.replace(/\.(jpeg|jpg)$/, '.png');
                  imgElement.src = pngPath;
                  return;
                }
                
                // 3. パスの修正を試みめE
                // knowledge-baseパスが含まれてぁE��ぁE��吁E
                if (!originalSrc.includes('/knowledge-base/')) {
                  const fileName = originalSrc.split('/').pop();
                  if (fileName) {
                    console.log('パス形式エラー、knowledge-baseパスに修正');
                    imgElement.src = `/knowledge-base/images/${fileName}`;
                    return;
                  }
                }
                
                // 4. 選択したスライドが1つで、�Eスライドリストがある場合�E別のスライドを試ぁE
                if (allSlides.length > 1) {
                  const nextIndex = (currentSlideIndex + 1) % allSlides.length;
                  console.log(`現在のスライドが表示できなぁE��め、次のスライチE${nextIndex})に刁E��替ぁE);
                  changeSlide('next');
                  return;
                }
                
                // 5. 最終手段: エラー表示の提示
                console.log('すべてのフォールバック試行が失敗、エラー表示');
                
                // エラーメチE��ージをオーバ�Eレイ表示
                const parent = imgElement.parentElement;
                if (parent) {
                  // imgElementを非表示
                  imgElement.style.opacity = '0.2';
                  
                  // エラーメチE��ージを表示�E�既存�E場合�E作�EしなぁE��E
                  if (!parent.querySelector('.error-message')) {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'error-message absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 text-white p-4 rounded-lg z-20';
                    const titleP = document.createElement('p');
                    titleP.className = 'text-xl mb-2';
                    titleP.textContent = '画像を読み込めませんでした';
                    
                    const fileNameP = document.createElement('p');
                    fileNameP.className = 'text-sm';
                    fileNameP.textContent = originalSrc.split('/').pop() || '';
                    
                    errorDiv.appendChild(titleP);
                    errorDiv.appendChild(fileNameP);
                    parent.appendChild(errorDiv);
                  }
                }
              } catch (error) {
                console.error('エラー処琁E��に例外が発甁E', error);
              }
            }}
          />
          
          {/* 次へボタン */}
          {allSlides.length > 1 && (
            <Button 
              className="absolute right-2 z-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full opacity-75 hover:opacity-100" 
              size="icon"
              onClick={() => changeSlide('next')}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}
        </div>
        
        {/* 惁E��パネル - 表示/非表示刁E��替え可能 */}
        {showInfo && (
          <div className="w-full border-t border-blue-500 bg-gray-900 p-4 text-white">
            <Tabs defaultValue="slide" className="w-full">
              <TabsList className="mb-2">
                <TabsTrigger value="slide">スライド情報</TabsTrigger>
                <TabsTrigger value="document">ドキュメント情報</TabsTrigger>
              </TabsList>
              
              <TabsContent value="slide">
                {content ? (
                  <div className="text-sm mb-3">
                    <h4 className="font-medium mb-2 text-blue-200">{title}</h4>
                    <div className="bg-gray-800 p-3 rounded border border-blue-800 mb-3">
                      <p className="text-gray-200 whitespace-pre-wrap">{content}</p>
                    </div>
                  </div>
                ) : currentSlideInfo ? (
                  <div className="text-sm">
                    <h4 className="font-medium mb-1">
                      {currentSlideInfo.タイトル || `スライチE${currentSlideInfo.スライド番号}`}
                    </h4>
                    
                    {currentSlideInfo.本斁E&& currentSlideInfo.本斁Elength > 0 && (
                      <div className="mb-2">
                        <p className="text-xs text-blue-300">本斁E</p>
                        <ul className="list-disc list-inside pl-2">
                          {currentSlideInfo.本斁Emap((text, idx) => (
                            <li key={idx} className="text-gray-200">{text}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {currentSlideInfo.ノ�EチE&& (
                      <div className="mb-2">
                        <p className="text-xs text-blue-300">ノ�EチE</p>
                        <p className="text-gray-200 whitespace-pre-wrap">{currentSlideInfo.ノ�EチE</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400">スライド情報はありません</p>
                )}
              </TabsContent>
              
              <TabsContent value="document">
                {metadataJson?.metadata ? (
                  <div className="text-sm grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-blue-300">タイトル:</p>
                      <p className="text-gray-200">{metadataJson.metadata.タイトル || "なぁE}</p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-300">作�E老E</p>
                      <p className="text-gray-200">{metadataJson.metadata.作�E老E|| "なぁE}</p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-300">作�E日:</p>
                      <p className="text-gray-200">{metadataJson.metadata.作�E日 || "なぁE}</p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-300">修正日:</p>
                      <p className="text-gray-200">{metadataJson.metadata.修正日 || "なぁE}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-blue-300">説昁E</p>
                      <p className="text-gray-200">{metadataJson.metadata.説昁E|| "なぁE}</p>
                    </div>
                  </div>
                ) : isLoadingMetadata ? (
                  <p className="text-gray-400">メタチE�Eタを読み込み中...</p>
                ) : (
                  <p className="text-gray-400">ドキュメント情報はありません</p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
        
        {/* スライド�EサムネイルリスチE*/}
        {allSlides.length > 1 && (
          <div className="w-full px-2 py-3 border-t border-blue-500 overflow-x-auto flex bg-gray-800">
            {allSlides.map((slide, index) => (
              <div 
                key={index}
                className={`flex-shrink-0 mx-1 cursor-pointer transition-all ${
                  index === currentSlideIndex 
                    ? 'border-2 border-blue-500 scale-105' 
                    : 'border border-gray-600 hover:border-blue-400'
                }`}
                onClick={() => {
                  setCurrentSlideIndex(index);
                  setImageUrl(slide);
                  
                  // PNG形式�Eみに統一するためフォールバックは不要E
                  setPngFallbackUrl("");
                }}
              >
                <div className="relative h-16 w-24">
                  {/* 読み込み中プレースホルダー */}
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-700 z-0">
                    <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                  </div>
                  
                  <img 
                    src={fixImagePath(slide)} 
                    alt={`スライチE${index + 1}`}
                    className="h-16 w-24 object-cover relative z-10"
                    loading="eager"
                    decoding="async"
                    onLoad={(e) => {
                      // 読み込み完亁E��にプレースホルダーを非表示に
                      const imgElement = e.currentTarget;
                      // 親要素を取征E
                      const parent = imgElement.parentElement;
                      if (parent) {
                        // 読み込み中プレースホルダーを非表示に
                        const placeholders = parent.querySelectorAll('.animate-spin');
                        placeholders.forEach(ph => {
                          if (ph.parentElement) {
                            ph.parentElement.style.display = 'none';
                          }
                        });
                      }
                    }}
                    onError={(e) => {
                      // サムネイルの読み込みエラー処琁E
                      console.log(`サムネイル(${index})読み込みエラー`);
                      const imgElement = e.currentTarget;
                      imgElement.style.opacity = '0.3';
                      
                      // エラー表示を追加
                      const parent = imgElement.parentElement;
                      if (parent) {
                        const errorOverlay = document.createElement('div');
                        errorOverlay.className = 'absolute inset-0 flex items-center justify-center z-20 bg-black bg-opacity-50 text-white text-xs';
                        errorOverlay.textContent = '読込エラー';
                        parent.appendChild(errorOverlay);
                      }
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
