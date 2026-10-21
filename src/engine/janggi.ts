/**
 * Complete Korean Janggi (장기) Game Engine
 * Implements standard Korean Janggi Association rules,
 * legal move generation, palace diagonals, check/checkmate detection,
 * piece values, and AI search evaluation.
 */

export type Side = 'cho' | 'han'; // 초 (楚, Green/Blue) moves first; 한 (漢, Red) moves second with +1.5 komi

export type PieceType = 'king' | 'cha' | 'po' | 'ma' | 'sang' | 'sa' | 'jol';

export interface Piece {
  id: string;
  type: PieceType;
  side: Side;
  hasMoved?: boolean;
}

export type Board = (Piece | null)[][]; // 10 rows (0..9) x 9 cols (0..8)

export interface Position {
  r: number; // 0 to 9
  c: number; // 0 to 8
}

export interface Move {
  from: Position;
  to: Position;
  piece: Piece;
  captured?: Piece | null;
  notation?: string;
  isCheck?: boolean;
}

export type Formation = 
  | 'masang_masang' // 마상마상 (왼마)
  | 'sangma_sangma' // 상마상마 (오른마)
  | 'masang_sangma' // 마상상마 (안상)
  | 'sangma_masang'; // 상마마상 (원앙마)

export const FORMATION_LABELS: Record<Formation, { name: string; desc: string }> = {
  masang_masang: { name: '마상마상 (왼마)', desc: '왼쪽 마, 오른쪽 상 배치 - 균형 잡힌 공격형' },
  sangma_sangma: { name: '상마상마 (오른마)', desc: '왼쪽 상, 오른쪽 마 배치 - 유연한 수비형' },
  sangma_masang: { name: '상마마상 (원앙마)', desc: '마가 중앙에 모이는 전통 원앙마 포진' },
  masang_sangma: { name: '마상상마 (안상)', desc: '상이 중앙에 모이는 안상 포진' },
};

// Official Korean Janggi piece point values
export const PIECE_VALUES: Record<PieceType, number> = {
  cha: 13,
  po: 7,
  ma: 5,
  sang: 3,
  sa: 3,
  jol: 2,
  king: 0,
};

export const HAN_KOMI = 1.5;

// Korean names for display
export const PIECE_NAMES: Record<Side, Record<PieceType, { hanja: string; hangul: string; short: string }>> = {
  cho: {
    king: { hanja: '楚', hangul: '초', short: '궁' },
    cha: { hanja: '車', hangul: '차', short: '차' },
    po: { hanja: '包', hangul: '포', short: '포' },
    ma: { hanja: '馬', hangul: '마', short: '마' },
    sang: { hanja: '象', hangul: '상', short: '상' },
    sa: { hanja: '士', hangul: '사', short: '사' },
    jol: { hanja: '卒', hangul: '졸', short: '졸' },
  },
  han: {
    king: { hanja: '漢', hangul: '한', short: '궁' },
    cha: { hanja: '車', hangul: '차', short: '차' },
    po: { hanja: '包', hangul: '포', short: '포' },
    ma: { hanja: '馬', hangul: '마', short: '마' },
    sang: { hanja: '象', hangul: '상', short: '상' },
    sa: { hanja: '士', hangul: '사', short: '사' },
    jol: { hanja: '兵', hangul: '병', short: '병' },
  },
};

export function isInsideBoard(r: number, c: number): boolean {
  return r >= 0 && r < 10 && c >= 0 && c < 9;
}

export function isHanPalace(r: number, c: number): boolean {
  return r >= 0 && r <= 2 && c >= 3 && c <= 5;
}

export function isChoPalace(r: number, c: number): boolean {
  return r >= 7 && r <= 9 && c >= 3 && c <= 5;
}

export function isPalace(r: number, c: number): boolean {
  return isHanPalace(r, c) || isChoPalace(r, c);
}

/**
 * Checks if a step from (r1, c1) to (r2, c2) follows the valid diagonal lines inside the palace.
 */
export function isPalaceDiagonalStep(r1: number, c1: number, r2: number, c2: number): boolean {
  const dr = r2 - r1;
  const dc = c2 - c1;
  if (Math.abs(dr) !== 1 || Math.abs(dc) !== 1) return false;

  // Han Palace (0..2, 3..5), center is (1, 4)
  if (isHanPalace(r1, c1) && isHanPalace(r2, c2)) {
    // Only center (1,4) can connect diagonally to corners (0,3), (0,5), (2,3), (2,5)
    if ((r1 === 1 && c1 === 4) || (r2 === 1 && c2 === 4)) {
      return true;
    }
  }

  // Cho Palace (7..9, 3..5), center is (8, 4)
  if (isChoPalace(r1, c1) && isChoPalace(r2, c2)) {
    if ((r1 === 8 && c1 === 4) || (r2 === 8 && c2 === 4)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a 2-step diagonal slide across the palace center is along the diagonal.
 * (e.g. from corner through center to opposite corner)
 */
export function isPalaceDiagonalLine(r1: number, c1: number, r2: number, c2: number): boolean {
  if (Math.abs(r2 - r1) === 2 && Math.abs(c2 - c1) === 2) {
    const midR = (r1 + r2) / 2;
    const midC = (c1 + c2) / 2;
    if (midR === 1 && midC === 4 && isHanPalace(r1, c1) && isHanPalace(r2, c2)) return true;
    if (midR === 8 && midC === 4 && isChoPalace(r1, c1) && isChoPalace(r2, c2)) return true;
  }
  return false;
}

/**
 * Creates an empty 10x9 board.
 */
export function createEmptyBoard(): Board {
  const b: Board = [];
  for (let r = 0; r < 10; r++) {
    const row: (Piece | null)[] = [];
    for (let c = 0; c < 9; c++) {
      row.push(null);
    }
    b.push(row);
  }
  return b;
}

/**
 * Sets up initial board based on Cho and Han formations.
 */
export function setupBoard(choFormation: Formation = 'masang_masang', hanFormation: Formation = 'masang_masang'): Board {
  const b = createEmptyBoard();

  // Helper to place
  const place = (r: number, c: number, type: PieceType, side: Side, id: string) => {
    b[r][c] = { id, type, side };
  };

  // 1. Han (Top: rows 0..3)
  // Back rank (row 0)
  place(0, 0, 'cha', 'han', 'h_cha1');
  place(0, 8, 'cha', 'han', 'h_cha2');
  place(0, 3, 'sa', 'han', 'h_sa1');
  place(0, 5, 'sa', 'han', 'h_sa2');

  // Han Sang/Ma formation on cols 1, 2 and 6, 7
  if (hanFormation === 'masang_masang') {
    place(0, 1, 'ma', 'han', 'h_ma1');
    place(0, 2, 'sang', 'han', 'h_sang1');
    place(0, 6, 'ma', 'han', 'h_ma2');
    place(0, 7, 'sang', 'han', 'h_sang2');
  } else if (hanFormation === 'sangma_sangma') {
    place(0, 1, 'sang', 'han', 'h_sang1');
    place(0, 2, 'ma', 'han', 'h_ma1');
    place(0, 6, 'sang', 'han', 'h_sang2');
    place(0, 7, 'ma', 'han', 'h_ma2');
  } else if (hanFormation === 'sangma_masang') {
    // 원앙마: 상마마상
    place(0, 1, 'sang', 'han', 'h_sang1');
    place(0, 2, 'ma', 'han', 'h_ma1');
    place(0, 6, 'ma', 'han', 'h_ma2');
    place(0, 7, 'sang', 'han', 'h_sang2');
  } else {
    // 안상: 마상상마
    place(0, 1, 'ma', 'han', 'h_ma1');
    place(0, 2, 'sang', 'han', 'h_sang1');
    place(0, 6, 'sang', 'han', 'h_sang2');
    place(0, 7, 'ma', 'han', 'h_ma2');
  }

  // Han King (row 1, col 4)
  place(1, 4, 'king', 'han', 'h_king');

  // Han Cannons (row 2, cols 1, 7)
  place(2, 1, 'po', 'han', 'h_po1');
  place(2, 7, 'po', 'han', 'h_po2');

  // Han Pawns / 병 (row 3, cols 0, 2, 4, 6, 8)
  for (let c = 0; c < 9; c += 2) {
    place(3, c, 'jol', 'han', `h_jol_${c}`);
  }

  // 2. Cho (Bottom: rows 6..9)
  // Back rank (row 9)
  place(9, 0, 'cha', 'cho', 'c_cha1');
  place(9, 8, 'cha', 'cho', 'c_cha2');
  place(9, 3, 'sa', 'cho', 'c_sa1');
  place(9, 5, 'sa', 'cho', 'c_sa2');

  // Cho Sang/Ma formation on cols 1, 2 and 6, 7
  if (choFormation === 'masang_masang') {
    place(9, 1, 'ma', 'cho', 'c_ma1');
    place(9, 2, 'sang', 'cho', 'c_sang1');
    place(9, 6, 'ma', 'cho', 'c_ma2');
    place(9, 7, 'sang', 'cho', 'c_sang2');
  } else if (choFormation === 'sangma_sangma') {
    place(9, 1, 'sang', 'cho', 'c_sang1');
    place(9, 2, 'ma', 'cho', 'c_ma1');
    place(9, 6, 'sang', 'cho', 'c_sang2');
    place(9, 7, 'ma', 'cho', 'c_ma2');
  } else if (choFormation === 'sangma_masang') {
    // 원앙마: 상마마상
    place(9, 1, 'sang', 'cho', 'c_sang1');
    place(9, 2, 'ma', 'cho', 'c_ma1');
    place(9, 6, 'ma', 'cho', 'c_ma2');
    place(9, 7, 'sang', 'cho', 'c_sang2');
  } else {
    // 안상: 마상상마
    place(9, 1, 'ma', 'cho', 'c_ma1');
    place(9, 2, 'sang', 'cho', 'c_sang1');
    place(9, 6, 'sang', 'cho', 'c_sang2');
    place(9, 7, 'ma', 'cho', 'c_ma2');
  }

  // Cho King (row 8, col 4)
  place(8, 4, 'king', 'cho', 'c_king');

  // Cho Cannons (row 7, cols 1, 7)
  place(7, 1, 'po', 'cho', 'c_po1');
  place(7, 7, 'po', 'cho', 'c_po2');

  // Cho Pawns / 졸 (row 6, cols 0, 2, 4, 6, 8)
  for (let c = 0; c < 9; c += 2) {
    place(6, c, 'jol', 'cho', `c_jol_${c}`);
  }

  return b;
}

/**
 * Deep clones the board.
 */
export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((p) => (p ? { ...p } : null)));
}

/**
 * Finds the King position for a given side.
 */
export function findKing(board: Board, side: Side): Position | null {
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (p && p.type === 'king' && p.side === side) {
        return { r, c };
      }
    }
  }
  return null;
}

/**
 * Generates raw pseudo-legal moves for a piece at (r, c) without checking if King is left in check.
 */
export function getPseudoLegalMoves(board: Board, pos: Position): Position[] {
  const { r, c } = pos;
  const piece = board[r][c];
  if (!piece) return [];

  const moves: Position[] = [];
  const side = piece.side;

  const addIfValid = (nr: number, nc: number): boolean => {
    if (!isInsideBoard(nr, nc)) return false;
    const target = board[nr][nc];
    if (!target) {
      moves.push({ r: nr, c: nc });
      return true;
    }
    if (target.side !== side) {
      moves.push({ r: nr, c: nc });
    }
    return false; // occupied, cannot pass through
  };

  // 1. King (궁) and Guard (사)
  if (piece.type === 'king' || piece.type === 'sa') {
    const palaceCheck = side === 'han' ? isHanPalace : isChoPalace;
    // Orthogonal steps (up, down, left, right)
    const dirs = [
      [-1, 0], [1, 0], [0, -1], [0, 1]
    ];
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (palaceCheck(nr, nc)) {
        addIfValid(nr, nc);
      }
    }
    // Diagonal steps along palace diagonals
    const diagDirs = [
      [-1, -1], [-1, 1], [1, -1], [1, 1]
    ];
    for (const [dr, dc] of diagDirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (palaceCheck(nr, nc) && isPalaceDiagonalStep(r, c, nr, nc)) {
        addIfValid(nr, nc);
      }
    }
  }

  // 2. Chariot (차)
  else if (piece.type === 'cha') {
    // 4 orthogonal directions
    const orthDirs = [
      [-1, 0], [1, 0], [0, -1], [0, 1]
    ];
    for (const [dr, dc] of orthDirs) {
      let step = 1;
      while (true) {
        const nr = r + dr * step;
        const nc = c + dc * step;
        if (!isInsideBoard(nr, nc)) break;
        const target = board[nr][nc];
        if (!target) {
          moves.push({ r: nr, c: nc });
        } else {
          if (target.side !== side) {
            moves.push({ r: nr, c: nc });
          }
          break; // blocked
        }
        step++;
      }
    }

    // Palace diagonal movements for Cha
    // If in Han Palace
    if (isHanPalace(r, c)) {
      // From corner to center or opposite corner
      if (r === 0 && c === 3) {
        // Can move to (1,4), and if empty can continue to (2,5)
        addChaPalaceLine(board, side, moves, [{ r: 1, c: 4 }, { r: 2, c: 5 }]);
      } else if (r === 2 && c === 5) {
        addChaPalaceLine(board, side, moves, [{ r: 1, c: 4 }, { r: 0, c: 3 }]);
      } else if (r === 0 && c === 5) {
        addChaPalaceLine(board, side, moves, [{ r: 1, c: 4 }, { r: 2, c: 3 }]);
      } else if (r === 2 && c === 3) {
        addChaPalaceLine(board, side, moves, [{ r: 1, c: 4 }, { r: 0, c: 5 }]);
      } else if (r === 1 && c === 4) {
        // Center can move 1 step to any 4 corners
        addIfValid(0, 3);
        addIfValid(0, 5);
        addIfValid(2, 3);
        addIfValid(2, 5);
      }
    }
    // If in Cho Palace
    else if (isChoPalace(r, c)) {
      if (r === 7 && c === 3) {
        addChaPalaceLine(board, side, moves, [{ r: 8, c: 4 }, { r: 9, c: 5 }]);
      } else if (r === 9 && c === 5) {
        addChaPalaceLine(board, side, moves, [{ r: 8, c: 4 }, { r: 7, c: 3 }]);
      } else if (r === 7 && c === 5) {
        addChaPalaceLine(board, side, moves, [{ r: 8, c: 4 }, { r: 9, c: 3 }]);
      } else if (r === 9 && c === 3) {
        addChaPalaceLine(board, side, moves, [{ r: 8, c: 4 }, { r: 7, c: 5 }]);
      } else if (r === 8 && c === 4) {
        addIfValid(7, 3);
        addIfValid(7, 5);
        addIfValid(9, 3);
        addIfValid(9, 5);
      }
    }
  }

  // 3. Cannon (포)
  // Rules:
  // - Needs exactly 1 screen piece (다리) to jump over.
  // - Cannot jump over another Po! ("포는 포를 넘을 수 없다")
  // - Cannot capture another Po! ("포는 포를 잡을 수 없다")
  // - Can also jump diagonally in palace if exactly 1 non-Po screen is between.
  else if (piece.type === 'po') {
    const orthDirs = [
      [-1, 0], [1, 0], [0, -1], [0, 1]
    ];
    for (const [dr, dc] of orthDirs) {
      let screenFound = false;
      let step = 1;
      while (true) {
        const nr = r + dr * step;
        const nc = c + dc * step;
        if (!isInsideBoard(nr, nc)) break;

        const target = board[nr][nc];
        if (!screenFound) {
          if (target) {
            // Cannot use another Po as screen
            if (target.type === 'po') break;
            screenFound = true;
          }
        } else {
          // Beyond screen
          if (!target) {
            moves.push({ r: nr, c: nc });
          } else {
            // Can capture if enemy and NOT a Po
            if (target.side !== side && target.type !== 'po') {
              moves.push({ r: nr, c: nc });
            }
            break; // Stop in this direction
          }
        }
        step++;
      }
    }

    // Palace diagonal jumps for Po:
    // Han Palace:
    if (isHanPalace(r, c)) {
      checkPoPalaceDiag(board, side, moves, r, c, 1, 4, [
        { from: [0, 3], mid: [1, 4], to: [2, 5] },
        { from: [2, 5], mid: [1, 4], to: [0, 3] },
        { from: [0, 5], mid: [1, 4], to: [2, 3] },
        { from: [2, 3], mid: [1, 4], to: [0, 5] },
      ]);
    }
    // Cho Palace:
    else if (isChoPalace(r, c)) {
      checkPoPalaceDiag(board, side, moves, r, c, 8, 4, [
        { from: [7, 3], mid: [8, 4], to: [9, 5] },
        { from: [9, 5], mid: [8, 4], to: [7, 3] },
        { from: [7, 5], mid: [8, 4], to: [9, 3] },
        { from: [9, 3], mid: [8, 4], to: [7, 5] },
      ]);
    }
  }

  // 4. Horse (마)
  // 1 orthogonal step (must be empty), then 1 diagonal outward step
  else if (piece.type === 'ma') {
    const maSteps: [number, number, number, number][] = [
      // [eye_r, eye_c, dest_r, dest_c]
      [-1, 0, -2, -1],
      [-1, 0, -2, 1],
      [1, 0, 2, -1],
      [1, 0, 2, 1],
      [0, -1, -1, -2],
      [0, -1, 1, -2],
      [0, 1, -1, 2],
      [0, 1, 1, 2],
    ];

    for (const [er, ec, dr, dc] of maSteps) {
      const eyeR = r + er;
      const eyeC = c + ec;
      if (!isInsideBoard(eyeR, eyeC)) continue;
      // Eye must be empty (마의 멱)
      if (board[eyeR][eyeC] !== null) continue;

      const destR = r + dr;
      const destC = c + dc;
      if (!isInsideBoard(destR, destC)) continue;
      const target = board[destR][destC];
      if (!target || target.side !== side) {
        moves.push({ r: destR, c: destC });
      }
    }
  }

  // 5. Elephant (상)
  // 1 orthogonal step (must be empty), then 2 diagonal steps (intermediate diagonal step must also be empty)
  else if (piece.type === 'sang') {
    const sangSteps: [number, number, number, number, number, number][] = [
      // [er, ec, mdr, mdc, dr, dc]
      // Up
      [-1, 0, -2, -1, -3, -2],
      [-1, 0, -2, 1, -3, 2],
      // Down
      [1, 0, 2, -1, 3, -2],
      [1, 0, 2, 1, 3, 2],
      // Left
      [0, -1, -1, -2, -2, -3],
      [0, -1, 1, -2, 2, -3],
      // Right
      [0, 1, -1, 2, -2, 3],
      [0, 1, 1, 2, 2, 3],
    ];

    for (const [er, ec, mr, mc, dr, dc] of sangSteps) {
      const eyeR = r + er;
      const eyeC = c + ec;
      if (!isInsideBoard(eyeR, eyeC) || board[eyeR][eyeC] !== null) continue;

      const midR = r + mr;
      const midC = c + mc;
      if (!isInsideBoard(midR, midC) || board[midR][midC] !== null) continue;

      const destR = r + dr;
      const destC = c + dc;
      if (!isInsideBoard(destR, destC)) continue;
      const target = board[destR][destC];
      if (!target || target.side !== side) {
        moves.push({ r: destR, c: destC });
      }
    }
  }

  // 6. Soldier (졸/병)
  // Forward, Left, Right (Never backward).
  // Inside opponent's palace: can also move forward diagonally along palace diagonals!
  else if (piece.type === 'jol') {
    const forwardDir = side === 'cho' ? -1 : 1; // Cho moves up (-1), Han moves down (+1)

    // Forward
    addIfValid(r + forwardDir, c);
    // Left & Right
    addIfValid(r, c - 1);
    addIfValid(r, c + 1);

    // Diagonal forward inside enemy palace:
    if (side === 'cho' && isHanPalace(r, c)) {
      // Cho Jol moving inside Han Palace (forward is dr = -1)
      if (r === 2 && (c === 3 || c === 5)) {
        addIfValid(1, 4);
      } else if (r === 1 && c === 4) {
        addIfValid(0, 3);
        addIfValid(0, 5);
      }
    } else if (side === 'han' && isChoPalace(r, c)) {
      // Han Byung moving inside Cho Palace (forward is dr = +1)
      if (r === 7 && (c === 3 || c === 5)) {
        addIfValid(8, 4);
      } else if (r === 8 && c === 4) {
        addIfValid(9, 3);
        addIfValid(9, 5);
      }
    }
  }

  return moves;
}

function addChaPalaceLine(board: Board, side: Side, moves: Position[], path: Position[]) {
  for (const pos of path) {
    const target = board[pos.r][pos.c];
    if (!target) {
      moves.push(pos);
    } else {
      if (target.side !== side) {
        moves.push(pos);
      }
      break;
    }
  }
}

function checkPoPalaceDiag(
  board: Board,
  side: Side,
  moves: Position[],
  r: number,
  c: number,
  centerR: number,
  centerC: number,
  lines: { from: [number, number]; mid: [number, number]; to: [number, number] }[]
) {
  for (const line of lines) {
    if (r === line.from[0] && c === line.from[1]) {
      const midPiece = board[line.mid[0]][line.mid[1]];
      // Screen must exist and not be a Po
      if (midPiece && midPiece.type !== 'po') {
        const destPiece = board[line.to[0]][line.to[1]];
        if (!destPiece) {
          moves.push({ r: line.to[0], c: line.to[1] });
        } else if (destPiece.side !== side && destPiece.type !== 'po') {
          moves.push({ r: line.to[0], c: line.to[1] });
        }
      }
    }
  }
}

/**
 * Checks whether the given side's King is currently in Check (장군).
 */
export function isInCheck(board: Board, side: Side): boolean {
  const kingPos = findKing(board, side);
  if (!kingPos) return false;

  const opponentSide: Side = side === 'cho' ? 'han' : 'cho';

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = board[r][c];
      if (piece && piece.side === opponentSide) {
        const pseudoMoves = getPseudoLegalMoves(board, { r, c });
        for (const m of pseudoMoves) {
          if (m.r === kingPos.r && m.c === kingPos.c) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

/**
 * Checks whether the two Kings are facing each other with NO intervening pieces on the same column (Bikjang / 빅장).
 */
export function isBikjang(board: Board): boolean {
  const choKing = findKing(board, 'cho');
  const hanKing = findKing(board, 'han');
  if (!choKing || !hanKing) return false;

  if (choKing.c !== hanKing.c) return false;

  const col = choKing.c;
  const minR = Math.min(choKing.r, hanKing.r);
  const maxR = Math.max(choKing.r, hanKing.r);

  for (let r = minR + 1; r < maxR; r++) {
    if (board[r][col] !== null) {
      return false;
    }
  }
  return true;
}

/**
 * Generates strictly legal moves for a piece at (r, c), filtering out any moves that leave King in check.
 */
export function getLegalMoves(board: Board, pos: Position): Move[] {
  const piece = board[pos.r][pos.c];
  if (!piece) return [];

  const pseudoMoves = getPseudoLegalMoves(board, pos);
  const legal: Move[] = [];

  for (const to of pseudoMoves) {
    // Simulate move
    const captured = board[to.r][to.c];
    board[to.r][to.c] = piece;
    board[pos.r][pos.c] = null;

    const selfCheck = isInCheck(board, piece.side);

    // Rollback
    board[pos.r][pos.c] = piece;
    board[to.r][to.c] = captured;

    if (!selfCheck) {
      // Determine notation
      const notation = generateNotation(pos, to, piece, captured);
      legal.push({
        from: pos,
        to,
        piece,
        captured,
        notation,
      });
    }
  }

  return legal;
}

/**
 * Returns all legal moves for a given side across the entire board.
 */
export function getAllLegalMoves(board: Board, side: Side): Move[] {
  const allMoves: Move[] = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = board[r][c];
      if (piece && piece.side === side) {
        const moves = getLegalMoves(board, { r, c });
        allMoves.push(...moves);
      }
    }
  }
  return allMoves;
}

/**
 * Applies a move to the board (mutating or returning a new board).
 */
export function applyMove(board: Board, move: Move): Board {
  const newBoard = cloneBoard(board);
  const { from, to } = move;
  const piece = newBoard[from.r][from.c];
  if (!piece) return newBoard;

  newBoard[to.r][to.c] = { ...piece, hasMoved: true };
  newBoard[from.r][from.c] = null;

  return newBoard;
}

/**
 * Generates Korean Janggi move notation (e.g. "84궁->83궁", "90차->70차", "71포->21포(초 졸 포획)").
 */
export function generateNotation(from: Position, to: Position, piece: Piece, captured?: Piece | null): string {
  const nameInfo = PIECE_NAMES[piece.side][piece.type];
  // Korean coordinates: col is 1..9 (left to right from Cho's perspective, or standard 0..8 as 1..9), row is 1..10
  const fromCoord = `${from.c + 1}${10 - from.r}`;
  const toCoord = `${to.c + 1}${10 - to.r}`;

  let note = `${fromCoord}${nameInfo.short} → ${toCoord}`;
  if (captured) {
    const capInfo = PIECE_NAMES[captured.side][captured.type];
    note += ` [${capInfo.short} 획득]`;
  }
  return note;
}

/**
 * Calculates current official points according to Korean Janggi Association rules.
 * Cho base: sum of remaining pieces
 * Han base: sum of remaining pieces + 1.5 komi (덤)
 */
export function calculateScores(board: Board): { cho: number; han: number } {
  let cho = 0;
  let han = HAN_KOMI;

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = board[r][c];
      if (piece) {
        const pts = PIECE_VALUES[piece.type];
        if (piece.side === 'cho') {
          cho += pts;
        } else {
          han += pts;
        }
      }
    }
  }

  return { cho, han };
}

/**
 * Evaluates board position for AI search.
 * Positive favors Cho, negative favors Han.
 */
export function evaluateBoard(board: Board): number {
  let score = 0;

  // King safety & piece values
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const baseVal = PIECE_VALUES[piece.type] * 100;
      let posBonus = 0;

      // Positional incentives
      if (piece.type === 'jol') {
        // Forward advancing pawns are better
        const advance = piece.side === 'cho' ? (6 - r) : (r - 3);
        posBonus += advance * 8;
        // Central files (cols 3, 4, 5) bonus
        if (c >= 3 && c <= 5) posBonus += 10;
      } else if (piece.type === 'ma') {
        // Active centralized horses
        if (r >= 2 && r <= 7 && c >= 2 && c <= 6) posBonus += 15;
      } else if (piece.type === 'sang') {
        // Central forward elephants
        if (c >= 2 && c <= 6) posBonus += 10;
      } else if (piece.type === 'cha') {
        // Control of open files or enemy ranks
        if (piece.side === 'cho' && r <= 4) posBonus += 20;
        if (piece.side === 'han' && r >= 5) posBonus += 20;
      }

      const totalVal = baseVal + posBonus;
      if (piece.side === 'cho') {
        score += totalVal;
      } else {
        score -= totalVal;
      }
    }
  }

  // Adjust for Han Komi
  score -= HAN_KOMI * 100;

  return score;
}

/**
 * Simple Minimax with Alpha-Beta Pruning for AI bot play.
 */
export function findBestAIMove(
  board: Board,
  side: Side,
  depth: number = 2
): { bestMove: Move | null; score: number } {
  const isCho = side === 'cho';
  const legalMoves = getAllLegalMoves(board, side);
  if (legalMoves.length === 0) {
    return { bestMove: null, score: isCho ? -99999 : 99999 };
  }

  // Sort moves: prioritize captures for faster alpha-beta cutoff
  legalMoves.sort((a, b) => {
    const valA = a.captured ? PIECE_VALUES[a.captured.type] : 0;
    const valB = b.captured ? PIECE_VALUES[b.captured.type] : 0;
    return valB - valA;
  });

  let bestMove: Move | null = legalMoves[0];
  let bestScore = isCho ? -Infinity : Infinity;
  let alpha = -Infinity;
  let beta = Infinity;

  for (const move of legalMoves) {
    const nextBoard = applyMove(board, move);
    const score = minimax(nextBoard, depth - 1, alpha, beta, !isCho);

    if (isCho) {
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, bestScore);
    } else {
      if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
      beta = Math.min(beta, bestScore);
    }

    if (beta <= alpha) break;
  }

  return { bestMove, score: bestScore };
}

function minimax(board: Board, depth: number, alpha: number, beta: number, isChoTurn: boolean): number {
  if (depth === 0) {
    return evaluateBoard(board);
  }

  const currentSide: Side = isChoTurn ? 'cho' : 'han';
  const moves = getAllLegalMoves(board, currentSide);

  if (moves.length === 0) {
    // In checkmate or no moves
    return isChoTurn ? -90000 : 90000;
  }

  // Quick evaluation of captures first
  moves.sort((a, b) => {
    const valA = a.captured ? PIECE_VALUES[a.captured.type] : 0;
    const valB = b.captured ? PIECE_VALUES[b.captured.type] : 0;
    return valB - valA;
  });

  // Search top moves up to depth limit
  const limitMoves = moves.slice(0, 18);

  if (isChoTurn) {
    let maxEval = -Infinity;
    for (const move of limitMoves) {
      const nextBoard = applyMove(board, move);
      const evalScore = minimax(nextBoard, depth - 1, alpha, beta, false);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of limitMoves) {
      const nextBoard = applyMove(board, move);
      const evalScore = minimax(nextBoard, depth - 1, alpha, beta, true);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}
