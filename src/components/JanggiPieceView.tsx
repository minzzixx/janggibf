import React from 'react';
import { Piece, PIECE_NAMES } from '../engine/janggi.ts';

interface JanggiPieceViewProps {
  piece: Piece;
  isSelected?: boolean;
  isTarget?: boolean;
  isCheck?: boolean;
  showHangul?: boolean;
  size?: number; // pixel size
}

export const JanggiPieceView: React.FC<JanggiPieceViewProps> = ({
  piece,
  isSelected = false,
  isCheck = false,
  showHangul = false,
  size,
}) => {
  const isCho = piece.side === 'cho';
  const nameInfo = PIECE_NAMES[piece.side][piece.type];

  // Korean Janggi piece sizes traditionally vary slightly:
  // King is largest, Cha/Po/Ma/Sang are medium, Sa/Jol are smallest.
  const sizeMultiplier =
    piece.type === 'king' ? 1.08 : piece.type === 'sa' || piece.type === 'jol' ? 0.92 : 1.0;

  const displayText = showHangul ? nameInfo.short : nameInfo.hanja;

  return (
    <div
      className={`relative select-none flex items-center justify-center transition-transform duration-150 active:scale-95 ${
        isSelected ? 'scale-110 z-20' : 'z-10'
      }`}
      style={{
        width: size ? `${size * sizeMultiplier}px` : '88%',
        height: size ? `${size * sizeMultiplier}px` : '88%',
      }}
    >
      {/* Outer Octagonal Wooden Piece */}
      <div
        className={`w-full h-full flex items-center justify-center relative rounded-md shadow-md transition-all duration-150 ${
          isCho
            ? 'bg-gradient-to-br from-[#f5ecd7] via-[#eedec0] to-[#d6c19a] border border-[#a89069]'
            : 'bg-gradient-to-br from-[#f8eee0] via-[#f0ddc3] to-[#d9c09c] border border-[#a89069]'
        } ${isSelected ? 'ring-4 ring-amber-400 ring-offset-1 shadow-xl' : ''} ${
          isCheck ? 'animate-pulse ring-4 ring-rose-500 ring-offset-2' : ''
        }`}
        style={{
          clipPath:
            'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
          boxShadow: isSelected
            ? '0 10px 25px -5px rgba(217, 119, 6, 0.4), inset 0 2px 4px rgba(255,255,255,0.8), inset 0 -3px 4px rgba(0,0,0,0.25)'
            : '0 4px 6px -1px rgba(0, 0, 0, 0.3), inset 0 2px 3px rgba(255,255,255,0.7), inset 0 -2px 4px rgba(0,0,0,0.2)',
        }}
      >
        {/* Subtle Inner Ring */}
        <div
          className="absolute inset-[3px] rounded-sm pointer-events-none opacity-40 border border-[#8c734e]"
          style={{
            clipPath:
              'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
          }}
        />

        {/* Character Engraving */}
        <span
          className={`font-serif font-black tracking-tighter leading-none select-none transition-colors duration-150 ${
            isCho
              ? 'text-[#0e5a36] drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]'
              : 'text-[#9c1818] drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]'
          }`}
          style={{
            fontFamily: "'Noto Serif KR', 'Gowun Batang', serif",
            fontSize:
              piece.type === 'king'
                ? 'clamp(18px, 4.4vw, 28px)'
                : piece.type === 'sa' || piece.type === 'jol'
                ? 'clamp(14px, 3.4vw, 20px)'
                : 'clamp(16px, 3.8vw, 24px)',
          }}
        >
          {displayText}
        </span>

        {/* Small Hangul Subtitle for beginners if Hanja mode is active */}
        {!showHangul && (
          <span
            className={`absolute bottom-1 right-2 text-[8px] font-sans font-bold opacity-60 ${
              isCho ? 'text-[#0e5a36]' : 'text-[#9c1818]'
            }`}
          >
            {nameInfo.short}
          </span>
        )}
      </div>
    </div>
  );
};
