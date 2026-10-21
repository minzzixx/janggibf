import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Home, Award } from 'lucide-react';
import { Side } from '../engine/janggi.ts';

interface GameOverModalProps {
  isOpen: boolean;
  winner: Side | 'DRAW' | null;
  winReason?: string;
  mySide?: Side;
  scores: { cho: number; han: number };
  onRestart: () => void;
  onGoLobby: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  winner,
  winReason,
  mySide,
  scores,
  onRestart,
  onGoLobby,
}) => {
  useEffect(() => {
    if (isOpen && winner && (winner === mySide || !mySide)) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }
    }
  }, [isOpen, winner, mySide]);

  if (!isOpen || !winner) return null;

  const isDraw = winner === 'DRAW';
  const isWinner = winner === mySide;
  const isChoWinner = winner === 'cho';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center text-slate-100 animate-in zoom-in-95 duration-150">
        {/* Trophy / Emblem */}
        <div
          className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg ${
            isDraw
              ? 'bg-slate-800 text-slate-300 border border-slate-700'
              : isChoWinner
              ? 'bg-gradient-to-br from-emerald-600 to-emerald-800 text-white shadow-emerald-950/50'
              : 'bg-gradient-to-br from-rose-600 to-rose-800 text-white shadow-rose-950/50'
          }`}
        >
          {isDraw ? (
            <Award className="w-8 h-8" />
          ) : (
            <Trophy className="w-8 h-8" />
          )}
        </div>

        {/* Title */}
        <h3 className="text-xl font-black text-slate-100">
          {isDraw ? '무승부' : isChoWinner ? '초(楚) 승리!' : '한(漢) 승리!'}
        </h3>

        {/* Subtitle / Reason */}
        <p className="text-xs text-slate-400 mt-1 mb-5">
          {winReason || (isDraw ? '합의에 따른 무승부' : '상대 왕을 굴복시켰습니다')}
        </p>

        {/* Final Score Card */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 mb-6">
          <div className="text-[11px] font-semibold text-slate-400 mb-2">최종 기물 점수</div>
          <div className="flex items-center justify-around">
            <div className="text-center">
              <span className="text-xs font-bold text-emerald-400 block">초 (선수)</span>
              <span className="text-lg font-mono font-black tabular-nums text-slate-100">
                {scores.cho.toFixed(1)}
              </span>
            </div>
            <div className="text-slate-600 font-bold">VS</div>
            <div className="text-center">
              <span className="text-xs font-bold text-rose-400 block">한 (덤 1.5)</span>
              <span className="text-lg font-mono font-black tabular-nums text-slate-100">
                {scores.han.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={onRestart}
            className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>재도전 / 한판 더</span>
          </button>

          <button
            type="button"
            onClick={onGoLobby}
            className="w-full h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <Home className="w-4 h-4" />
            <span>로비로 나가기</span>
          </button>
        </div>
      </div>
    </div>
  );
};
