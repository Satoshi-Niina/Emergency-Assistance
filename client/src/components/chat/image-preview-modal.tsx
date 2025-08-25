import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, ChevronLeft, ChevronRight, Info } from "lucide-react";

// 逕ｻ蜒上ヱ繧ｹ繧剃ｿｮ豁｣縺吶ｋ繝倥Ν繝代・髢｢謨ｰ - PNG蠖｢蠑上↓邨ｱ荳
function fixImagePath(path: string | undefined): string {
  if (!path) return '';
  
  // 繝励Ο繝医さ繝ｫ繧貞性繧URL縺ｮ蝣ｴ蜷医・縺昴・縺ｾ縺ｾ霑斐☆ (螟夜Κ繝ｪ繝ｳ繧ｯ)
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // 縺吶〒縺ｫ knowledge-base 繝代せ繧呈戟縺｣縺ｦ縺・ｌ縺ｰ縺昴・縺ｾ縺ｾ霑斐☆
  if (path.includes('/knowledge-base/images/')) {
    return path; // 蜈・・諡｡蠑ｵ蟄舌ｒ邯ｭ謖・
  }
  
  // uploads 繝代せ縺九ｉ knowledge-base 繝代せ縺ｸ螟画鋤
  if (path.includes('/uploads/')) {
    return path.replace('/uploads/', '/knowledge-base/');
  }
  
  // 逕ｻ蜒上ヵ繧｡繧､繝ｫ縺ｮ諡｡蠑ｵ蟄舌ｒ謖√▽繝代せ縺ｯ繝輔ぃ繧､繝ｫ蜷阪□縺第歓蜃ｺ縺励※遏･隴倥・繝ｼ繧ｹ縺ｮ繝代せ縺ｫ螟画鋤
  if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.svg')) {
    const fileName = path.split('/').pop();
    if (fileName) {
      // SVG蠖｢蠑上・蝣ｴ蜷医・PNG蠖｢蠑上↓螟画鋤
      if (fileName.endsWith('.svg')) {
        const pngFileName = fileName.replace('.svg', '.png');
        return `/knowledge-base/images/${pngFileName}`;
      }
      
      // 莉悶・蠖｢蠑上・縺昴・縺ｾ縺ｾ
      return `/knowledge-base/images/${fileName}`;
    }
  }

  return path;
}

interface ImageMetaData {
  metadata?: {
    繧ｿ繧､繝医Ν?: string;
    菴懈・閠・: string;
    菴懈・譌･?: string;
    菫ｮ豁｣譌･?: string;
    隱ｬ譏・: string;
  };
  slides?: Array<{
    繧ｹ繝ｩ繧､繝臥分蜿ｷ?: number;
    繧ｿ繧､繝医Ν?: string | null;
    譛ｬ譁・: string[];
    繝弱・繝・: string | null;
    逕ｻ蜒上ユ繧ｭ繧ｹ繝・: Array<{
      逕ｻ蜒上ヱ繧ｹ?: string;
      繝・く繧ｹ繝・: string;
    }>;
  }>;
}

export default function ImagePreviewModal() {
  // 迥ｶ諷句､画焚
  const [isOpen, setIsOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [pngFallbackUrl, setPngFallbackUrl] = useState<string>("");
  const [metadataUrl, setMetadataUrl] = useState<string>("");
  const [allSlides, setAllSlides] = useState<string[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [metadataJson, setMetadataJson] = useState<ImageMetaData | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  // 隱ｬ譏取枚繝代ロ繝ｫ繧貞ｮ悟・縺ｫ髱櫁｡ｨ遉ｺ縺ｫ縺吶ｋ・亥ｸｸ縺ｫfalse・・
  const showInfo = false;
  const [title, setTitle] = useState<string>("逕ｻ蜒上・繝ｬ繝薙Η繝ｼ");
  const [content, setContent] = useState<string>("");
  
  // 繝｡繧ｿ繝・・繧ｿ繧定ｪｭ縺ｿ霎ｼ繧
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

  // 繧ｹ繝ｩ繧､繝峨ｒ螟画峩縺吶ｋ
  const changeSlide = (direction: 'next' | 'prev') => {
    if (!allSlides.length) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentSlideIndex + 1) % allSlides.length;
    } else {
      newIndex = (currentSlideIndex - 1 + allSlides.length) % allSlides.length;
    }
    
    setCurrentSlideIndex(newIndex);
    
    // 譁ｰ繧ｹ繝ｩ繧､繝蔚RL繧定ｨｭ螳・
    const newSlideUrl = allSlides[newIndex];
    setImageUrl(newSlideUrl);
    
    // PNG蠖｢蠑上・縺ｿ繧剃ｽｿ逕ｨ縺吶ｋ縺溘ａ縲√ヵ繧ｩ繝ｼ繝ｫ繝舌ャ繧ｯ縺ｯ險ｭ螳壹＠縺ｪ縺・
    setPngFallbackUrl("");
  };

  useEffect(() => {
    // 繝励Ξ繝薙Η繝ｼ逕ｻ蜒上う繝吶Φ繝医・繝ｪ繧ｹ繝翫・
    const handlePreviewImage = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        // URL繧定ｨｭ螳・
        if (customEvent.detail.url) {
          setImageUrl(customEvent.detail.url);
        }
        
        // PNG蠖｢蠑上・繝輔か繝ｼ繝ｫ繝舌ャ繧ｯURL繧定ｨｭ螳・
        if (customEvent.detail.pngFallbackUrl) {
          setPngFallbackUrl(customEvent.detail.pngFallbackUrl);
        } else {
          setPngFallbackUrl("");
        }
        
        // 繧ｿ繧､繝医Ν繧定ｨｭ螳・
        if (customEvent.detail.title) {
          setTitle(customEvent.detail.title);
        } else {
          setTitle("逕ｻ蜒上・繝ｬ繝薙Η繝ｼ");
        }
        
        // 繧ｳ繝ｳ繝・Φ繝・ｼ郁ｪｬ譏取枚・峨ｒ險ｭ螳・
        if (customEvent.detail.content) {
          setContent(customEvent.detail.content);
        } else {
          setContent("");
        }
        
        // 繝｡繧ｿ繝・・繧ｿJSON縺ｸ縺ｮ繝代せ繧定ｨｭ螳・
        if (customEvent.detail.metadata_json) {
          setMetadataUrl(customEvent.detail.metadata_json);
          loadMetadata(customEvent.detail.metadata_json);
        } else {
          setMetadataUrl("");
          setMetadataJson(null);
        }
        
        // 蜈ｨ繧ｹ繝ｩ繧､繝峨・驟榊・繧定ｨｭ螳・
        if (customEvent.detail.all_slides && Array.isArray(customEvent.detail.all_slides)) {
          setAllSlides(customEvent.detail.all_slides);
          // 迴ｾ蝨ｨ縺ｮ逕ｻ蜒上′繧ｹ繝ｩ繧､繝蛾・蛻励・縺ｩ縺薙↓縺ゅｋ縺玖ｦ九▽縺代ｋ
          const index = customEvent.detail.all_slides.findIndex(
            (url: string) => url === customEvent.detail.url
          );
          setCurrentSlideIndex(index >= 0 ? index : 0);
        } else {
          setAllSlides([]);
          setCurrentSlideIndex(0);
        }
        
        // 繝｢繝ｼ繝繝ｫ繧貞ｿ・★陦ｨ遉ｺ縺吶ｋ
        setIsOpen(true);
        
        // 諠・ｱ繝代ロ繝ｫ縺ｯ陦ｨ遉ｺ縺励↑縺・ｼ・etShowInfo繧貞炎髯､・・
      }
    };
    
    window.addEventListener('preview-image', handlePreviewImage);
    
    return () => {
      window.removeEventListener('preview-image', handlePreviewImage);
    };
  }, []);

  // 迴ｾ蝨ｨ縺ｮ繧ｹ繝ｩ繧､繝峨↓髢｢騾｣縺吶ｋ繧ｹ繝ｩ繧､繝画ュ蝣ｱ繧貞叙蠕・
  const getCurrentSlideInfo = () => {
    if (!metadataJson || !metadataJson.slides) return null;
    
    // 迴ｾ蝨ｨ縺ｮ繧ｹ繝ｩ繧､繝峨う繝ｳ繝・ャ繧ｯ繧ｹ縺ｫ荳閾ｴ縺吶ｋ繧ｹ繝ｩ繧､繝画ュ蝣ｱ繧呈爾縺・
    const currentSlideNumber = currentSlideIndex + 1; // 0-index縺九ｉ1-index縺ｫ螟画鋤
    return metadataJson.slides.find(
      slide => slide.繧ｹ繝ｩ繧､繝臥分蜿ｷ === currentSlideNumber
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
          <h2 id="dialog-title">{metadataJson?.metadata?.繧ｿ繧､繝医Ν || title}</h2>
          <p id="dialog-description">諡｡螟ｧ逕ｻ蜒上ン繝･繝ｼ繝ｯ繝ｼ</p>
          <p id="image-preview-description">逕ｻ蜒上・繝励Ξ繝薙Η繝ｼ陦ｨ遉ｺ縺ｨ髢｢騾｣諠・ｱ縺ｮ遒ｺ隱阪′縺ｧ縺阪∪縺・/p>
        </div>
        <div className="w-full flex justify-between items-center p-2 bg-blue-700 text-white">
          <h3 className="text-sm font-medium ml-2">
            {metadataJson?.metadata?.繧ｿ繧､繝医Ν || title} 
            {allSlides.length > 1 && ` - 繧ｹ繝ｩ繧､繝・${currentSlideIndex + 1}/${allSlides.length}`}
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
          {/* 蜑阪∈繝懊ち繝ｳ */}
          {allSlides.length > 1 && (
            <Button 
              className="absolute left-2 z-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full opacity-75 hover:opacity-100" 
              size="icon"
              onClick={() => changeSlide('prev')}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          
          {/* 隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ繝励Ξ繝ｼ繧ｹ繝帙Ν繝繝ｼ */}
          <div className="absolute inset-0 flex items-center justify-center z-0 bg-gray-50">
            <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
          </div>
          
          {/* 繝｡繧､繝ｳ逕ｻ蜒剰｡ｨ遉ｺ - 諡｡蠑ｵ蟄舌・縺昴・縺ｾ縺ｾ菴ｿ逕ｨ縲√お繝ｩ繝ｼ譎ゅ・閾ｪ蜍募・繧頑崛縺・*/}
          <img 
            src={fixImagePath(imageUrl || '')} 
            alt={currentSlideInfo?.繧ｿ繧､繝医Ν || title || "諡｡螟ｧ逕ｻ蜒・} 
            className="max-w-full max-h-[70vh] object-contain rounded-lg border border-blue-500 z-10 relative"
            loading="eager"
            decoding="async"
            onLoad={(e) => {
              // 隱ｭ縺ｿ霎ｼ縺ｿ螳御ｺ・凾縺ｫ繝励Ξ繝ｼ繧ｹ繝帙Ν繝繝ｼ繧帝撼陦ｨ遉ｺ縺ｫ
              const imgElement = e.currentTarget;
              imgElement.classList.add('loaded');
              
              // 隕ｪ隕∫ｴ繧貞叙蠕・
              const parent = imgElement.parentElement;
              if (parent) {
                // 隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ繝励Ξ繝ｼ繧ｹ繝帙Ν繝繝ｼ繧帝撼陦ｨ遉ｺ縺ｫ
                const placeholders = parent.querySelectorAll('.animate-spin');
                placeholders.forEach(ph => {
                  if (ph.parentElement) {
                    ph.parentElement.style.display = 'none';
                  }
                });
              }
            }}
            onError={(e) => {
              // 繧ｨ繝ｩ繝ｼ逋ｺ逕滓凾縺ｯ蛹・峡逧・↑繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ蜃ｦ逅・
              const imgElement = e.currentTarget;
              const originalSrc = imgElement.src || '';
              
              console.log('逕ｻ蜒剰｡ｨ遉ｺ繧ｨ繝ｩ繝ｼ:', originalSrc);
              
              try {
                // 1. 蟆ら畑繝輔か繝ｼ繝ｫ繝舌ャ繧ｯURL縺梧欠螳壹＆繧後※縺・ｋ蝣ｴ蜷・
                if (pngFallbackUrl && pngFallbackUrl.trim() !== '') {
                  console.log('謖・ｮ壹＆繧後◆繝輔か繝ｼ繝ｫ繝舌ャ繧ｯURL繧剃ｽｿ逕ｨ:', pngFallbackUrl);
                  imgElement.src = fixImagePath(pngFallbackUrl);
                  return;
                }
                
                // 2. 繝輔ぃ繧､繝ｫ諡｡蠑ｵ蟄舌↓蝓ｺ縺･縺上ヵ繧ｩ繝ｼ繝ｫ繝舌ャ繧ｯ
                // SVG逕ｻ蜒上・蝣ｴ蜷医・PNG縺ｫ繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ
                if (originalSrc.endsWith('.svg')) {
                  console.log('SVG->PNG縺ｮ繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ');
                  const pngPath = originalSrc.replace('.svg', '.png');
                  imgElement.src = pngPath;
                  return;
                }
                
                // JPEG/JPG蠖｢蠑上・蝣ｴ蜷医・PNG縺ｫ繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ
                if (originalSrc.endsWith('.jpeg') || originalSrc.endsWith('.jpg')) {
                  console.log('JPEG->PNG縺ｮ繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ');
                  const pngPath = originalSrc.replace(/\.(jpeg|jpg)$/, '.png');
                  imgElement.src = pngPath;
                  return;
                }
                
                // 3. 繝代せ縺ｮ菫ｮ豁｣繧定ｩｦ縺ｿ繧・
                // knowledge-base繝代せ縺悟性縺ｾ繧後※縺・↑縺・ｴ蜷・
                if (!originalSrc.includes('/knowledge-base/')) {
                  const fileName = originalSrc.split('/').pop();
                  if (fileName) {
                    console.log('繝代せ蠖｢蠑上お繝ｩ繝ｼ縲〔nowledge-base繝代せ縺ｫ菫ｮ豁｣');
                    imgElement.src = `/knowledge-base/images/${fileName}`;
                    return;
                  }
                }
                
                // 4. 驕ｸ謚槭＠縺溘せ繝ｩ繧､繝峨′1縺､縺ｧ縲∝・繧ｹ繝ｩ繧､繝峨Μ繧ｹ繝医′縺ゅｋ蝣ｴ蜷医・蛻･縺ｮ繧ｹ繝ｩ繧､繝峨ｒ隧ｦ縺・
                if (allSlides.length > 1) {
                  const nextIndex = (currentSlideIndex + 1) % allSlides.length;
                  console.log(`迴ｾ蝨ｨ縺ｮ繧ｹ繝ｩ繧､繝峨′陦ｨ遉ｺ縺ｧ縺阪↑縺・◆繧√∵ｬ｡縺ｮ繧ｹ繝ｩ繧､繝・${nextIndex})縺ｫ蛻・ｊ譖ｿ縺・);
                  changeSlide('next');
                  return;
                }
                
                // 5. 譛邨よ焔谿ｵ: 繧ｨ繝ｩ繝ｼ陦ｨ遉ｺ縺ｮ謠千､ｺ
                console.log('縺吶∋縺ｦ縺ｮ繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ隧ｦ陦後′螟ｱ謨励√お繝ｩ繝ｼ陦ｨ遉ｺ');
                
                // 繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ繧偵が繝ｼ繝舌・繝ｬ繧､陦ｨ遉ｺ
                const parent = imgElement.parentElement;
                if (parent) {
                  // imgElement繧帝撼陦ｨ遉ｺ
                  imgElement.style.opacity = '0.2';
                  
                  // 繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ繧定｡ｨ遉ｺ・域里蟄倥・蝣ｴ蜷医・菴懈・縺励↑縺・ｼ・
                  if (!parent.querySelector('.error-message')) {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'error-message absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 text-white p-4 rounded-lg z-20';
                    const titleP = document.createElement('p');
                    titleP.className = 'text-xl mb-2';
                    titleP.textContent = '逕ｻ蜒上ｒ隱ｭ縺ｿ霎ｼ繧√∪縺帙ｓ縺ｧ縺励◆';
                    
                    const fileNameP = document.createElement('p');
                    fileNameP.className = 'text-sm';
                    fileNameP.textContent = originalSrc.split('/').pop() || '';
                    
                    errorDiv.appendChild(titleP);
                    errorDiv.appendChild(fileNameP);
                    parent.appendChild(errorDiv);
                  }
                }
              } catch (error) {
                console.error('繧ｨ繝ｩ繝ｼ蜃ｦ逅・ｸｭ縺ｫ萓句､悶′逋ｺ逕・', error);
              }
            }}
          />
          
          {/* 谺｡縺ｸ繝懊ち繝ｳ */}
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
        
        {/* 諠・ｱ繝代ロ繝ｫ - 陦ｨ遉ｺ/髱櫁｡ｨ遉ｺ蛻・ｊ譖ｿ縺亥庄閭ｽ */}
        {showInfo && (
          <div className="w-full border-t border-blue-500 bg-gray-900 p-4 text-white">
            <Tabs defaultValue="slide" className="w-full">
              <TabsList className="mb-2">
                <TabsTrigger value="slide">繧ｹ繝ｩ繧､繝画ュ蝣ｱ</TabsTrigger>
                <TabsTrigger value="document">繝峨く繝･繝｡繝ｳ繝域ュ蝣ｱ</TabsTrigger>
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
                      {currentSlideInfo.繧ｿ繧､繝医Ν || `繧ｹ繝ｩ繧､繝・${currentSlideInfo.繧ｹ繝ｩ繧､繝臥分蜿ｷ}`}
                    </h4>
                    
                    {currentSlideInfo.譛ｬ譁・&& currentSlideInfo.譛ｬ譁・length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs text-blue-300">譛ｬ譁・</p>
                        <ul className="list-disc list-inside pl-2">
                          {currentSlideInfo.譛ｬ譁・map((text, idx) => (
                            <li key={idx} className="text-gray-200">{text}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {currentSlideInfo.繝弱・繝・&& (
                      <div className="mb-2">
                        <p className="text-xs text-blue-300">繝弱・繝・</p>
                        <p className="text-gray-200 whitespace-pre-wrap">{currentSlideInfo.繝弱・繝・</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400">繧ｹ繝ｩ繧､繝画ュ蝣ｱ縺ｯ縺ゅｊ縺ｾ縺帙ｓ</p>
                )}
              </TabsContent>
              
              <TabsContent value="document">
                {metadataJson?.metadata ? (
                  <div className="text-sm grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-blue-300">繧ｿ繧､繝医Ν:</p>
                      <p className="text-gray-200">{metadataJson.metadata.繧ｿ繧､繝医Ν || "縺ｪ縺・}</p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-300">菴懈・閠・</p>
                      <p className="text-gray-200">{metadataJson.metadata.菴懈・閠・|| "縺ｪ縺・}</p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-300">菴懈・譌･:</p>
                      <p className="text-gray-200">{metadataJson.metadata.菴懈・譌･ || "縺ｪ縺・}</p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-300">菫ｮ豁｣譌･:</p>
                      <p className="text-gray-200">{metadataJson.metadata.菫ｮ豁｣譌･ || "縺ｪ縺・}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-blue-300">隱ｬ譏・</p>
                      <p className="text-gray-200">{metadataJson.metadata.隱ｬ譏・|| "縺ｪ縺・}</p>
                    </div>
                  </div>
                ) : isLoadingMetadata ? (
                  <p className="text-gray-400">繝｡繧ｿ繝・・繧ｿ繧定ｪｭ縺ｿ霎ｼ縺ｿ荳ｭ...</p>
                ) : (
                  <p className="text-gray-400">繝峨く繝･繝｡繝ｳ繝域ュ蝣ｱ縺ｯ縺ゅｊ縺ｾ縺帙ｓ</p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
        
        {/* 繧ｹ繝ｩ繧､繝峨・繧ｵ繝繝阪う繝ｫ繝ｪ繧ｹ繝・*/}
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
                  
                  // PNG蠖｢蠑上・縺ｿ縺ｫ邨ｱ荳縺吶ｋ縺溘ａ繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ縺ｯ荳崎ｦ・
                  setPngFallbackUrl("");
                }}
              >
                <div className="relative h-16 w-24">
                  {/* 隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ繝励Ξ繝ｼ繧ｹ繝帙Ν繝繝ｼ */}
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-700 z-0">
                    <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                  </div>
                  
                  <img 
                    src={fixImagePath(slide)} 
                    alt={`繧ｹ繝ｩ繧､繝・${index + 1}`}
                    className="h-16 w-24 object-cover relative z-10"
                    loading="eager"
                    decoding="async"
                    onLoad={(e) => {
                      // 隱ｭ縺ｿ霎ｼ縺ｿ螳御ｺ・凾縺ｫ繝励Ξ繝ｼ繧ｹ繝帙Ν繝繝ｼ繧帝撼陦ｨ遉ｺ縺ｫ
                      const imgElement = e.currentTarget;
                      // 隕ｪ隕∫ｴ繧貞叙蠕・
                      const parent = imgElement.parentElement;
                      if (parent) {
                        // 隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ繝励Ξ繝ｼ繧ｹ繝帙Ν繝繝ｼ繧帝撼陦ｨ遉ｺ縺ｫ
                        const placeholders = parent.querySelectorAll('.animate-spin');
                        placeholders.forEach(ph => {
                          if (ph.parentElement) {
                            ph.parentElement.style.display = 'none';
                          }
                        });
                      }
                    }}
                    onError={(e) => {
                      // 繧ｵ繝繝阪う繝ｫ縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ蜃ｦ逅・
                      console.log(`繧ｵ繝繝阪う繝ｫ(${index})隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ`);
                      const imgElement = e.currentTarget;
                      imgElement.style.opacity = '0.3';
                      
                      // 繧ｨ繝ｩ繝ｼ陦ｨ遉ｺ繧定ｿｽ蜉
                      const parent = imgElement.parentElement;
                      if (parent) {
                        const errorOverlay = document.createElement('div');
                        errorOverlay.className = 'absolute inset-0 flex items-center justify-center z-20 bg-black bg-opacity-50 text-white text-xs';
                        errorOverlay.textContent = '隱ｭ霎ｼ繧ｨ繝ｩ繝ｼ';
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