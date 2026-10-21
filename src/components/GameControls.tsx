import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  RefreshCw,
  HandMetal,
  Flag,
  Handshake,
  MessageSquare,
  BookOpen,
} from 'lucide-react';

interface GameControlsProps {
  mode: 'online' | 'ai' | 'pass_and_play';
  isMyTurn: boolean;
  isInCheck: boolean;
  isMuted: boolean;
  showHangul: boolean;
  chatUnreadCount?: number;
  onPass: () => void;
  onResign: () => void;
  onOfferDraw: () => void;
  onFlipBoard: () => void;
  onToggleSound: () => void;
  onToggleHangul: () => void;
  onUndo?: () => void;
  onHint?: () => void;
  onOpenChat?: () => void;
  onOpenRules?: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
  mode,
  isMyTurn,
  isInCheck,
  isMuted,
  showHangul,
  chatUnreadCount = 0,
  onPass,
  onResign,
  onOfferDraw,
  onFlipBoard,
  onToggleSound,
  onToggleHangul,
  onUndo,
  onHint,
  onOpenChat,
  onOpenRules,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState<'pass' | 'resign' | 'draw' | null>(null);

  return (
    <>
      <div className="w-full max-w-[480px] mx-auto px-1.5 py-1">
        {/* Primary In-Game Action Bar */}
        <div className="grid grid-cols-4 gap-2 mb-2">
          {/* 한수 쉼 (Pass) */}
          <button
            type="button"
            disabled={!isMyTurn || isInCheck}
            onClick={() => setShowConfirmModal('pass')}
            className={`h-11 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 border transition-all active:scale-95 ${
              isMyTurn && !isInCheck
                ? 'bg-amber-950/60 border-amber-600/70 text-amber-200 hover:bg-amber-900/60 shadow-md shadow-amber-950/40'
                : 'bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed opacity-60'
            }`}
          >
            <HandMetal className="w-4 h-4" />
            <span>한수 쉼</span>
          </button>

          {/* 무승부 신청 (Draw) */}
          <button
            type="button"
            onClick={() => setShowConfirmModal('draw')}
            className="h-11 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 border bg-slate-900/70 border-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-all active:scale-95"
          >
            <Handshake className="w-4 h-4" />
            <span>무승부</span>
          </button>

          {/* 기권 (Resign) */}
          <button
            type="button"
            onClick={() => setShowConfirmModal('resign')}
            className="h-11 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 border bg-slate-900/70 border-slate-800 text-rose-400 hover:bg-rose-950/40 hover:border-rose-800 transition-all active:scale-95"
          >
            <Flag className="w-4 h-4" />
            <span>기권</span>
          </button>

          {/* Chat or Rules */}
          {mode === 'online' ? (
            <button
              type="button"
              onClick={onOpenChat}
              className="relative h-11 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 border bg-slate-900/70 border-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-all active:scale-95"
            >
              <MessageSquare className="w-4 h-4" />
              <span>대화창</span>
              {chatUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center font-bold">
                  {chatUnreadCount}
                </span>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenRules}
              className="h-11 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 border bg-slate-900/70 border-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-all active:scale-95"
            >
              <BookOpen className="w-4 h-4" />
              <span>장기 룰</span>
            </button>
          )}
        </div>

        {/* Secondary Utility Controls */}
        <div className="flex items-center justify-between gap-1.5 px-1 py-1 text-slate-400">
          <div className="flex items-center gap-1">
            {/* Undo (for AI & Pass and Play) */}
            {mode !== 'online' && onUndo && (
              <button
                type="button"
                onClick={onUndo}
                className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs flex items-center gap-1 active:scale-95 transition-all"
                title="한 수 무르기"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>무르기</span>
              </button>
            )}

            {/* Hint (for AI mode) */}
            {mode === 'ai' && onHint && (
              <button
                type="button"
                onClick={onHint}
                className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs flex items-center gap-1 active:scale-95 transition-all"
                title="AI 추천수 보기"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>추천수</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Toggle Hanja / Hangul */}
            <button
              type="button"
              onClick={onToggleHangul}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 active:scale-95 transition-all"
              title="기물 표시 (한자/한글)"
            >
              {showHangul ? '한글' : '漢字'}
            </button>

            {/* Board Flip */}
            <button
              type="button"
              onClick={onFlipBoard}
              className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:bg-slate-800 text-slate-300 active:scale-95 transition-all"
              title="장기판 상하 반전"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={onToggleSound}
              className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:bg-slate-800 text-slate-300 active:scale-95 transition-all"
              title={isMuted ? '음소거 해제' : '음소거'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl text-slate-100">
            <h4 className="text-base font-bold text-slate-100 mb-1">
              {showConfirmModal === 'pass' && '한수를 쉬시겠습니까?'}
              {showConfirmModal === 'resign' && '대국을 기권하시겠습니까?'}
              {showConfirmModal === 'draw' && '상대방에게 무승부를 제안하시겠습니까?'}
            </h4>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              {showConfirmModal === 'pass' &&
                '차례를 넘깁니다. 양측이 연속으로 한수를 쉬면 공식 점수제로 승패가 결정됩니다.'}
              {showConfirmModal === 'resign' && '기권할 경우 상대방의 승리로 즉시 종료됩니다.'}
              {showConfirmModal === 'draw' && '상대방이 수락하면 경기가 무승부로 종료됩니다.'}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(null)}
                className="flex-1 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  if (showConfirmModal === 'pass') onPass();
                  if (showConfirmModal === 'resign') onResign();
                  if (showConfirmModal === 'draw') onOfferDraw();
                  setShowConfirmModal(null);
                }}
                className={`flex-1 h-10 rounded-xl text-xs font-bold text-white shadow-md ${
                  showConfirmModal === 'resign'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
