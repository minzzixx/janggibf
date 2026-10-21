import React from 'react';
import { Board, Position, Move, Side, isInsideBoard } from '../engine/janggi.ts';
import { JanggiPieceView } from './JanggiPieceView.tsx';

interface JanggiBoardProps {
  board: Board;
  selectedPos: Position | null;
  validMoves: Move[];
  lastMove: Move | null;
  isInCheckCho: boolean;
  isInCheckHan: boolean;
  flipped?: boolean;
  showHangul?: boolean;
  interactive?: boolean;
  onSelectPos: (pos: Position) => void;
  onMakeMove: (move: Move) => void;
}

export const JanggiBoard: React.FC<JanggiBoardProps> = ({
  board,
  selectedPos,
  validMoves,
  lastMove,
  isInCheckCho,
  isInCheckHan,
  flipped = false,
  showHangul = false,
  interactive = true,
  onSelectPos,
  onMakeMove,
}) => {
  // Convert coordinate considering flipped view
  const toDisplay = (r: number, c: number): { dr: number; dc: number } => {
    if (flipped) {
      return { dr: 9 - r, dc: 8 - c };
    }
    return { dr: r, dc: c };
  };

  const toLogical = (dr: number, dc: number): { r: number; c: number } => {
    if (flipped) {
      return { r: 9 - dr, c: 8 - dc };
    }
    return { r: dr, c: dc };
  };

  const handleIntersectionClick = (logicalR: number, logicalC: number) => {
    if (!interactive) return;

    // Check if clicking a destination of a valid move
    const matchedMove = validMoves.find((m) => m.to.r === logicalR && m.to.c === logicalC);
    if (matchedMove) {
      onMakeMove(matchedMove);
      return;
    }

    // Otherwise select position
    onSelectPos({ r: logicalR, c: logicalC });
  };

  // Generate coordinate labels
  const colLabels = flipped ? ['9', '8', '7', '6', '5', '4', '3', '2', '1'] : ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const rowLabels = flipped ? ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] : ['10', '9', '8', '7', '6', '5', '4', '3', '2', '1'];

  // Star Points (화점) in logical coordinates
  const starPoints = [
    { r: 2, c: 1 }, { r: 2, c: 7 },
    { r: 3, c: 0 }, { r: 3, c: 2 }, { r: 3, c: 4 }, { r: 3, c: 6 }, { r: 3, c: 8 },
    { r: 6, c: 0 }, { r: 6, c: 2 }, { r: 6, c: 4 }, { r: 6, c: 6 }, { r: 6, c: 8 },
    { r: 7, c: 1 }, { r: 7, c: 7 },
  ];

  // Board dimensions in percentage
  // 9 columns: 8 gaps => col spacing = 100% / 8
  // 10 rows: 9 gaps => row spacing = 100% / 9
  const getXPercent = (c: number) => (c / 8) * 100;
  const getYPercent = (r: number) => (r / 9) * 100;

  return (
    <div className="w-full max-w-[480px] mx-auto select-none px-1.5 py-1">
      {/* Outer Wooden Border Frame */}
      <div
        className="relative rounded-2xl p-3 sm:p-4 shadow-2xl border-4 border-[#7a4f27] bg-[#d9a263]"
        style={{
          backgroundImage: "url('/src/assets/images/janggi_wood_texture_1792546854079.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          boxShadow: '0 20px 30px -10px rgba(45, 23, 7, 0.6), inset 0 2px 6px rgba(255, 255, 255, 0.4), inset 0 -4px 8px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Coordinate Top Bar */}
        <div className="flex justify-between items-center px-1 mb-1 text-[11px] font-mono font-bold text-[#5c3917] opacity-80">
          {colLabels.map((label, idx) => (
            <span key={`col-top-${idx}`} className="w-8 text-center">
              {label}
            </span>
          ))}
        </div>

        {/* Board Surface */}
        <div className="relative aspect-[8/9] w-full">
          {/* SVG Grid Lines & Palace Diagonals */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 800 900"
            preserveAspectRatio="none"
          >
            <defs>
              {/* Subtle line shadow for authentic carved wood groove look */}
              <filter id="groove" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0.5" dy="0.5" stdDeviation="0.4" floodColor="#ffe7b8" floodOpacity="0.5" />
              </filter>
            </defs>

            {/* Outer Boundary */}
            <rect
              x="0"
              y="0"
              width="800"
              height="900"
              fill="none"
              stroke="#4a2e12"
              strokeWidth="4"
            />

            {/* 10 Horizontal Lines */}
            {Array.from({ length: 10 }).map((_, i) => {
              const y = (i / 9) * 900;
              return (
                <line
                  key={`hline-${i}`}
                  x1="0"
                  y1={y}
                  x2="800"
                  y2={y}
                  stroke="#573615"
                  strokeWidth="2.5"
                />
              );
            })}

            {/* 9 Vertical Lines */}
            {Array.from({ length: 9 }).map((_, i) => {
              const x = (i / 8) * 800;
              return (
                <line
                  key={`vline-${i}`}
                  x1={x}
                  y1="0"
                  x2={x}
                  y2="900"
                  stroke="#573615"
                  strokeWidth="2.5"
                />
              );
            })}

            {/* Han Palace Diagonals (Top Palace in standard, or Bottom in flipped) */}
            {/* Top Palace: cols 3 to 5 (x: 300 to 500), rows 0 to 2 (y: 0 to 200) */}
            <line x1="300" y1="0" x2="500" y2="200" stroke="#573615" strokeWidth="2.5" />
            <line x1="500" y1="0" x2="300" y2="200" stroke="#573615" strokeWidth="2.5" />

            {/* Cho Palace Diagonals (Bottom Palace in standard, or Top in flipped) */}
            {/* Bottom Palace: cols 3 to 5 (x: 300 to 500), rows 7 to 9 (y: 700 to 900) */}
            <line x1="300" y1="700" x2="500" y2="900" stroke="#573615" strokeWidth="2.5" />
            <line x1="500" y1="700" x2="300" y2="900" stroke="#573615" strokeWidth="2.5" />

            {/* Star Points (화점) Cross Marks */}
            {starPoints.map((sp, idx) => {
              const disp = toDisplay(sp.r, sp.c);
              const x = (disp.dc / 8) * 800;
              const y = (disp.dr / 9) * 900;
              const len = 7;
              return (
                <g key={`star-${idx}`} stroke="#573615" strokeWidth="2">
                  <circle cx={x} cy={y} r="3" fill="#573615" />
                  {/* Subtle cross corners if not on board edge */}
                  {disp.dc > 0 && disp.dc < 8 && (
                    <>
                      <line x1={x - len} y1={y - len} x2={x - 3} y2={y - len} />
                      <line x1={x - len} y1={y - len} x2={x - len} y2={y - 3} />
                      <line x1={x + 3} y1={y - len} x2={x + len} y2={y - len} />
                      <line x1={x + len} y1={y - len} x2={x + len} y2={y - 3} />
                      <line x1={x - len} y1={y + len} x2={x - 3} y2={y + len} />
                      <line x1={x - len} y1={y + 3} x2={x - len} y2={y + len} />
                      <line x1={x + 3} y1={y + len} x2={x + len} y2={y + len} />
                      <line x1={x + len} y1={y + 3} x2={x + len} y2={y + len} />
                    </>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Interactive Intersections & Pieces Grid */}
          <div className="absolute inset-0">
            {Array.from({ length: 10 }).map((_, dr) => {
              return Array.from({ length: 9 }).map((_, dc) => {
                const { r, c } = toLogical(dr, dc);
                const piece = isInsideBoard(r, c) ? board[r][c] : null;

                const isSelected = selectedPos?.r === r && selectedPos?.c === c;
                const isTarget = validMoves.some((m) => m.to.r === r && m.to.c === c);

                const isLastFrom = lastMove?.from.r === r && lastMove?.from.c === c;
                const isLastTo = lastMove?.to.r === r && lastMove?.to.c === c;

                const isCheckKing =
                  piece?.type === 'king' &&
                  ((piece.side === 'cho' && isInCheckCho) || (piece.side === 'han' && isInCheckHan));

                const left = getXPercent(dc);
                const top = getYPercent(dr);

                return (
                  <div
                    key={`inter-${r}-${c}`}
                    onClick={() => handleIntersectionClick(r, c)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer transition-transform"
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      width: '11.1%',
                      height: '10%',
                      touchAction: 'manipulation',
                    }}
                  >
                    {/* Last Move Indicator Ring */}
                    {isLastFrom && (
                      <div className="absolute inset-1 rounded-full border-2 border-dashed border-amber-600/70 pointer-events-none animate-pulse" />
                    )}
                    {isLastTo && (
                      <div className="absolute inset-0 rounded-full border-2 border-amber-700 pointer-events-none" />
                    )}

                    {/* Valid Move Target Dot / Capture Ring */}
                    {isTarget && (
                      <div className="absolute z-20 pointer-events-none flex items-center justify-center">
                        {piece ? (
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-3 border-rose-500 bg-rose-500/20 animate-ping" />
                        ) : (
                          <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-600/90 shadow-md ring-2 ring-emerald-300 animate-pulse" />
                        )}
                      </div>
                    )}

                    {/* Janggi Piece */}
                    {piece && (
                      <JanggiPieceView
                        piece={piece}
                        isSelected={isSelected}
                        isCheck={isCheckKing}
                        showHangul={showHangul}
                      />
                    )}
                  </div>
                );
              });
            })}
          </div>
        </div>

        {/* Coordinate Bottom Bar */}
        <div className="flex justify-between items-center px-1 mt-1 text-[11px] font-mono font-bold text-[#5c3917] opacity-80">
          {colLabels.map((label, idx) => (
            <span key={`col-bottom-${idx}`} className="w-8 text-center">
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
