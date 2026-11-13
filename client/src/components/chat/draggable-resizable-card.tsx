import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { GripHorizontal, RotateCcw } from 'lucide-react';

const STORAGE_KEY = 'emergency_assist_c_card_layout_v1';
const BOUNDARY_PADDING = 8;
const DEFAULT_MIN_WIDTH = 340;
const DEFAULT_MIN_HEIGHT = 280;

export interface CardLayoutState {
  offsetX: number;
  offsetY: number;
  width: number | null;
  height: number | null;
}

const DEFAULT_LAYOUT: CardLayoutState = {
  offsetX: 0,
  offsetY: 0,
  width: null,
  height: null,
};

function loadSavedLayout(): CardLayoutState {
  if (typeof window === 'undefined') return DEFAULT_LAYOUT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw);
    return {
      offsetX:
        typeof parsed?.offsetX === 'number' && Number.isFinite(parsed.offsetX)
          ? parsed.offsetX
          : 0,
      offsetY:
        typeof parsed?.offsetY === 'number' && Number.isFinite(parsed.offsetY)
          ? parsed.offsetY
          : 0,
      width:
        typeof parsed?.width === 'number' && Number.isFinite(parsed.width) && parsed.width > 0
          ? parsed.width
          : null,
      height:
        typeof parsed?.height === 'number' && Number.isFinite(parsed.height) && parsed.height > 0
          ? parsed.height
          : null,
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function saveLayoutToStorage(layout: CardLayoutState) {
  if (typeof window === 'undefined') return;
  try {
    const isDefault =
      Math.abs(layout.offsetX) < 0.5 &&
      Math.abs(layout.offsetY) < 0.5 &&
      layout.width === null &&
      layout.height === null;
    if (isDefault) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    }
  } catch {
    // localStorage利用不可環境ではメモリ状態のみで継続
  }
}

export interface DraggableResizableCardProps {
  boundaryRef: React.RefObject<HTMLDivElement>;
  activeKey?: string;
  children: React.ReactNode;
}

/**
 * C方式AIチャット最新質問カード用の共通移動・サイズ変更コンテナ
 * - 上部ヘッダーバーのドラッグで境界領域内を自由移動（マウス/タッチ/ペン・キーボード対応）
 * - 右下ハンドルで最小〜境界最大サイズ内で幅・高さをリサイズ（縮小時は内部スクロール可）
 * - localStorage に位置・サイズを保存し、質問切替・リロード後も維持（DB/履歴には保存しない）
 */
export default function DraggableResizableCard({
  boundaryRef,
  activeKey,
  children,
}: DraggableResizableCardProps) {
  const [layout, setLayout] = useState<CardLayoutState>(() => loadSavedLayout());
  const [boundaryLimits, setBoundaryLimits] = useState<{
    maxW: number | null;
    maxH: number | null;
  }>({ maxW: null, maxH: null });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const slotRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<CardLayoutState>(layout);
  layoutRef.current = layout;

  const isCustomized =
    Math.abs(layout.offsetX) >= 1 ||
    Math.abs(layout.offsetY) >= 1 ||
    layout.width !== null ||
    layout.height !== null;

  /**
   * 境界（chatScrollRef）の内側に収まるようサイズ・位置を補正する
   */
  const clampToBoundary = useCallback(
    (candidate: CardLayoutState): CardLayoutState => {
      const boundaryEl = boundaryRef.current;
      const slotEl = slotRef.current;
      const cardEl = cardRef.current;
      if (!boundaryEl || !slotEl || !cardEl) return candidate;

      const boundaryRect = boundaryEl.getBoundingClientRect();
      const slotRect = slotEl.getBoundingClientRect();
      const cardRect = cardEl.getBoundingClientRect();

      const boundaryW = boundaryEl.clientWidth || boundaryRect.width;
      const boundaryH = boundaryEl.clientHeight || boundaryRect.height;

      const maxWidth = Math.max(240, boundaryW - BOUNDARY_PADDING * 2);
      const maxHeight = Math.max(220, boundaryH - BOUNDARY_PADDING * 2);
      const minWidth = Math.min(DEFAULT_MIN_WIDTH, maxWidth);
      const minHeight = Math.min(DEFAULT_MIN_HEIGHT, maxHeight);

      let nextW = candidate.width;
      let nextH = candidate.height;

      if (nextW !== null) {
        nextW = Math.round(Math.min(maxWidth, Math.max(minWidth, nextW)));
      }
      if (nextH !== null) {
        nextH = Math.round(Math.min(maxHeight, Math.max(minHeight, nextH)));
      }

      const effectiveW = nextW !== null ? nextW : Math.min(cardRect.width || maxWidth, maxWidth);
      const effectiveH = nextH !== null ? nextH : cardRect.height || minHeight;

      // スロット自体の基準位置（未オフセット状態）からの許容オフセット範囲を計算
      // ※ cardRef には position:relative; left:offsetX; top:offsetY のみを適用するため、
      //    slotRef は常に基準位置を示す
      const slotLeftInBoundary = slotRect.left - boundaryRect.left;
      const slotTopInBoundary = slotRect.top - boundaryRect.top;

      // 未カスタマイズ時（offsetX=0, offsetY=0 かつサイズ未指定）は自然配置を優先し、
      // 幅がはみ出す場合のみ補正する
      let nextX = candidate.offsetX;
      let nextY = candidate.offsetY;

      const minOffsetX = BOUNDARY_PADDING - slotLeftInBoundary;
      const maxOffsetX = Math.max(
        minOffsetX,
        boundaryW - BOUNDARY_PADDING - effectiveW - slotLeftInBoundary
      );

      if (nextX !== 0 || nextW !== null) {
        nextX = Math.round(Math.min(maxOffsetX, Math.max(minOffsetX, nextX)));
      }

      const maxBottomY = boundaryH - BOUNDARY_PADDING - effectiveH - slotTopInBoundary;
      const minOffsetY = BOUNDARY_PADDING - slotTopInBoundary;

      if (nextY !== 0 || nextH !== null) {
        if (effectiveH <= boundaryH - BOUNDARY_PADDING * 2) {
          const clampedMaxY = Math.max(minOffsetY, maxBottomY);
          nextY = Math.round(Math.min(clampedMaxY, Math.max(minOffsetY, nextY)));
        } else {
          // 未リサイズかつ内容高さがビューポートを超える場合は上端からはみ出さない範囲で補正
          nextY = Math.round(Math.max(minOffsetY, Math.min(0, nextY)));
        }
      }

      return {
        offsetX: nextX,
        offsetY: nextY,
        width: nextW,
        height: nextH,
      };
    },
    [boundaryRef]
  );

  // localStorage への同期保存
  useEffect(() => {
    saveLayoutToStorage(layout);
  }, [layout]);

  // 画面リサイズ・境界変化・質問切替時に表示領域内へ自動補正＋最大サイズ境界を更新
  useEffect(() => {
    const syncClamp = () => {
      const boundaryEl = boundaryRef.current;
      if (boundaryEl) {
        const bw = boundaryEl.clientWidth || boundaryEl.getBoundingClientRect().width;
        const bh = boundaryEl.clientHeight || boundaryEl.getBoundingClientRect().height;
        const nextMaxW = bw > 0 ? Math.max(240, Math.floor(bw - BOUNDARY_PADDING * 2)) : null;
        const nextMaxH = bh > 0 ? Math.max(220, Math.floor(bh - BOUNDARY_PADDING * 2)) : null;
        setBoundaryLimits(prev =>
          prev.maxW === nextMaxW && prev.maxH === nextMaxH
            ? prev
            : { maxW: nextMaxW, maxH: nextMaxH }
        );
      }

      setLayout(prev => {
        const clamped = clampToBoundary(prev);
        if (
          clamped.offsetX === prev.offsetX &&
          clamped.offsetY === prev.offsetY &&
          clamped.width === prev.width &&
          clamped.height === prev.height
        ) {
          return prev;
        }
        return clamped;
      });
    };

    const rafId = window.requestAnimationFrame(syncClamp);
    window.addEventListener('resize', syncClamp);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(syncClamp);
      if (boundaryRef.current) observer.observe(boundaryRef.current);
      if (cardRef.current) observer.observe(cardRef.current);
    }

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', syncClamp);
      observer?.disconnect();
    };
  }, [boundaryRef, clampToBoundary, activeKey]);

  const handleReset = useCallback(() => {
    setLayout(DEFAULT_LAYOUT);
    saveLayoutToStorage(DEFAULT_LAYOUT);
  }, []);

  // ヘッダードラッグ移動（Pointer Events: マウス・タッチ・ペン統一対応）
  const handleDragPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    // ボタン等インタラクティブ要素上ではドラッグ開始しない
    if ((e.target as HTMLElement)?.closest('button, a, input, textarea, select')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget;
    const pointerId = e.pointerId;
    try {
      target.setPointerCapture(pointerId);
    } catch {}

    const startX = e.clientX;
    const startY = e.clientY;
    const startLayout = { ...layoutRef.current };
    setIsDragging(true);

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      setLayout(
        clampToBoundary({
          ...startLayout,
          offsetX: startLayout.offsetX + dx,
          offsetY: startLayout.offsetY + dy,
        })
      );
    };

    const cleanup = () => {
      setIsDragging(false);
      try {
        if (target.hasPointerCapture(pointerId)) {
          target.releasePointerCapture(pointerId);
        }
      } catch {}
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerEnd);
      window.removeEventListener('pointercancel', onPointerEnd);
    };

    const onPointerEnd = (endEvent: PointerEvent) => {
      if (endEvent.pointerId !== pointerId) return;
      cleanup();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerEnd);
    window.addEventListener('pointercancel', onPointerEnd);
  };

  // 右下リサイズハンドル（Pointer Events: マウス・タッチ・ペン統一対応）
  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    e.stopPropagation();

    const cardEl = cardRef.current;
    if (!cardEl) return;

    const target = e.currentTarget;
    const pointerId = e.pointerId;
    try {
      target.setPointerCapture(pointerId);
    } catch {}

    const startRect = cardEl.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = startRect.width;
    const startHeight = startRect.height;
    const startOffset = { ...layoutRef.current };
    setIsResizing(true);

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      setLayout(
        clampToBoundary({
          ...startOffset,
          width: startWidth + dx,
          height: startHeight + dy,
        })
      );
    };

    const cleanup = () => {
      setIsResizing(false);
      try {
        if (target.hasPointerCapture(pointerId)) {
          target.releasePointerCapture(pointerId);
        }
      } catch {}
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerEnd);
      window.removeEventListener('pointercancel', onPointerEnd);
    };

    const onPointerEnd = (endEvent: PointerEvent) => {
      if (endEvent.pointerId !== pointerId) return;
      cleanup();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerEnd);
    window.addEventListener('pointercancel', onPointerEnd);
  };

  // キーボード操作での移動・サイズ変更・初期リセット
  const handleDragKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const step = e.shiftKey ? 40 : 16;
    if (e.key === '0' || e.key === 'Home') {
      e.preventDefault();
      handleReset();
      return;
    }
    let dx = 0;
    let dy = 0;
    if (e.key === 'ArrowLeft') dx = -step;
    else if (e.key === 'ArrowRight') dx = step;
    else if (e.key === 'ArrowUp') dy = -step;
    else if (e.key === 'ArrowDown') dy = step;
    else return;

    e.preventDefault();
    setLayout(prev =>
      clampToBoundary({
        ...prev,
        offsetX: prev.offsetX + dx,
        offsetY: prev.offsetY + dy,
      })
    );
  };

  const handleResizeKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const step = e.shiftKey ? 40 : 16;
    if (e.key === '0' || e.key === 'Home') {
      e.preventDefault();
      handleReset();
      return;
    }
    const cardEl = cardRef.current;
    const curW = layoutRef.current.width ?? cardEl?.getBoundingClientRect().width ?? 600;
    const curH = layoutRef.current.height ?? cardEl?.getBoundingClientRect().height ?? 420;
    let dw = 0;
    let dh = 0;
    if (e.key === 'ArrowLeft') dw = -step;
    else if (e.key === 'ArrowRight') dw = step;
    else if (e.key === 'ArrowUp') dh = -step;
    else if (e.key === 'ArrowDown') dh = step;
    else return;

    e.preventDefault();
    setLayout(prev =>
      clampToBoundary({
        ...prev,
        width: curW + dw,
        height: curH + dh,
      })
    );
  };

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    left: `${layout.offsetX}px`,
    top: `${layout.offsetY}px`,
    maxWidth: boundaryLimits.maxW ? `${boundaryLimits.maxW}px` : 'none',
    maxHeight: boundaryLimits.maxH ? `${boundaryLimits.maxH}px` : undefined,
    ...(layout.width !== null ? { width: `${layout.width}px` } : {}),
    ...(layout.height !== null ? { height: `${layout.height}px` } : {}),
  };

  return (
    <div ref={slotRef} className='w-full max-w-4xl mx-auto'>
      <div
        ref={cardRef}
        data-testid='draggable-resizable-card'
        style={containerStyle}
        className={`relative rounded-xl border-2 border-blue-400 bg-white shadow-lg flex flex-col overflow-hidden transition-shadow ${
          isDragging || isResizing ? 'ring-2 ring-blue-500 shadow-2xl select-none' : ''
        } ${layout.width === null ? 'w-full' : ''}`}
      >
        {/* 1. カード上部 ドラッグ移動ヘッダー（ここだけ touch-action: none で移動操作を受け付け） */}
        <div
          data-testid='card-drag-handle'
          role='region'
          tabIndex={0}
          onPointerDown={handleDragPointerDown}
          onKeyDown={handleDragKeyDown}
          aria-label='質問カードをドラッグで移動（矢印キーで移動、0キーで位置とサイズを初期化）'
          className='shrink-0 flex items-center justify-between gap-2 px-3 py-2 bg-blue-50/95 border-b border-blue-200 cursor-grab active:cursor-grabbing select-none touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600'
        >
          <div className='flex-1 min-w-0 flex items-center gap-2 text-xs font-semibold text-blue-900 pointer-events-none'>
            <GripHorizontal className='w-5 h-5 text-blue-600 flex-shrink-0' />
            <span className='truncate'>ドラッグで移動</span>
            {isCustomized && (
              <span className='hidden sm:inline-block px-2 py-0.5 rounded-full bg-blue-100 border border-blue-300 text-blue-800 text-xs font-medium shrink-0'>
                調整中
              </span>
            )}
          </div>

          <Button
            type='button'
            variant='outline'
            size='sm'
            data-testid='card-reset-layout'
            onClick={e => {
              e.stopPropagation();
              handleReset();
            }}
            onPointerDown={e => e.stopPropagation()}
            aria-label='位置・サイズを初期状態に戻す'
            title='位置・サイズを初期状態に戻す（Enter / Space / ヘッダー選択中に0キー）'
            className='shrink-0 h-auto min-h-[32px] py-1 px-2.5 text-xs font-semibold border-blue-300 bg-white text-blue-800 hover:bg-blue-100 whitespace-nowrap'
          >
            <RotateCcw className='w-3.5 h-3.5 mr-1 flex-shrink-0' />
            <span>初期位置に戻す</span>
          </Button>
        </div>

        {/* 2. カード本体（通常時は全高、縮小時はカード内部のみ縦スクロール・iPadスクロールと非競合） */}
        <div
          data-testid='card-scroll-body'
          className='flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y pb-6'
        >
          {children}
        </div>

        {/* 3. 右下サイズ変更用ドラッグハンドル（マウス・タッチ・ペン・キーボード対応） */}
        <div
          data-testid='card-resize-handle'
          role='slider'
          tabIndex={0}
          aria-label='カードサイズ変更ハンドル（右下をドラッグ、または矢印キーでサイズ調整、0キーで初期化）'
          aria-valuetext={
            layout.width && layout.height
              ? `幅 ${layout.width}px 高さ ${layout.height}px`
              : '初期サイズ'
          }
          onPointerDown={handleResizePointerDown}
          onKeyDown={handleResizeKeyDown}
          title='ドラッグしてカードサイズを変更'
          className='absolute right-0 bottom-0 z-20 w-9 h-9 flex items-end justify-end p-1.5 cursor-nwse-resize select-none touch-none rounded-tl-lg bg-blue-100/80 hover:bg-blue-200/90 border-t border-l border-blue-300/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600'
        >
          <svg
            width='16'
            height='16'
            viewBox='0 0 16 16'
            fill='none'
            aria-hidden='true'
            className='text-blue-700 pointer-events-none'
          >
            <path
              d='M14 4L4 14M14 9L9 14M14 13L13 14'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
