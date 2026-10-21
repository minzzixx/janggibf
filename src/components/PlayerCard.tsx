import React from 'react';
import { Side, Formation, Piece, FORMATION_LABELS, PIECE_NAMES } from '../engine/janggi.ts';

interface PlayerCardProps {
  side: Side;
  name: string;
  isCurrentTurn: boolean;
  isInCheck: boolean;
  formation: Formation;
  score: number;
  timeLeft: number; // in seconds
  capturedPieces: Piece[];
  isMe?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  side,
  name,
  isCurrentTurn,
  isInCheck,
  formation,
  score,
  timeLeft,
  capturedPieces,
  isMe = false,
}) => {
  const isCho = side === 'cho';

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formationInfo = FORMATION_LABELS[formation] || { name: '마상마상', desc: '' };

  // Group captured pieces for tidy display
  const pieceCounts: Record<string, number> = {};
  capturedPieces.forEach((p) => {
    const key = p.type;
    pieceCounts[key] = (pieceCounts[key] || 0) + 1;
  });

  return (
    <div
      className={`relative w-full max-w-[480px] mx-auto px-3.5 py-2.5 rounded-xl transition-all duration-200 border ${
        isCurrentTurn
          ? isCho
            ? 'bg-emerald-950/80 border-emerald-500/60 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/40'
            : 'bg-rose-950/80 border-rose-500/60 shadow-lg shadow-rose-950/30 ring-1 ring-rose-500/40'
          : 'bg-slate-900/70 border-slate-800'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Avatar & Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center font-serif font-black text-lg shrink-0 shadow-sm ${
              isCho
                ? 'bg-gradient-to-br from-emerald-600 to-emerald-800 text-white'
                : 'bg-gradient-to-br from-rose-600 to-rose-800 text-white'
            }`}
          >
            {isCho ? '楚' : '漢'}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-slate-100 truncate">
                {name}
              </span>
              {isMe && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-amber-300 font-medium shrink-0">
                  나
                </span>
              )}
              {isInCheck && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-600 text-white font-bold animate-pulse shrink-0">
                  장군!
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
              <span className="text-[11px] text-slate-300 font-medium">
                {formationInfo.name.split(' ')[0]}
              </span>
              <span className="text-slate-600">·</span>
              <span className="font-mono tabular-nums text-amber-400 font-bold">
                {score.toFixed(1)}점
              </span>
            </div>
          </div>
        </div>

        {/* Right: Timer & Turn Badge */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Captured mini icons */}
          <div className="hidden sm:flex items-center gap-1 opacity-80 text-xs">
            {Object.entries(pieceCounts).map(([type, count]) => {
              const oppSide = isCho ? 'han' : 'cho';
              const hanja = PIECE_NAMES[oppSide][type as keyof typeof PIECE_NAMES['cho']].short;
              return (
                <span
                  key={type}
                  className="px-1 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-medium"
                >
                  {hanja}{count > 1 ? `×${count}` : ''}
                </span>
              );
            })}
          </div>

          <div
            className={`px-3 py-1 rounded-lg font-mono font-bold text-sm tabular-nums border ${
              isCurrentTurn
                ? timeLeft <= 30
                  ? 'bg-rose-900/60 text-rose-300 border-rose-500 animate-pulse'
                  : isCho
                  ? 'bg-emerald-900/60 text-emerald-300 border-emerald-500'
                  : 'bg-rose-900/60 text-rose-300 border-rose-500'
                : 'bg-slate-800/80 text-slate-400 border-slate-700'
            }`}
          >
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>
    </div>
  );
};
