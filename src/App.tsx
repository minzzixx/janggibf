/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Side,
  Formation,
  Position,
  Move,
  setupBoard,
  getLegalMoves,
  applyMove,
  isInCheck,
  getAllLegalMoves,
  calculateScores,
  findBestAIMove,
  Board,
  Piece,
} from './engine/janggi.ts';
import { JanggiBoard } from './components/JanggiBoard.tsx';
import { PlayerCard } from './components/PlayerCard.tsx';
import { GameControls } from './components/GameControls.tsx';
import { FormationModal } from './components/FormationModal.tsx';
import { OnlineLobbyModal } from './components/OnlineLobbyModal.tsx';
import { InGameChat, ChatMessage } from './components/InGameChat.tsx';
import { RulesGuideModal } from './components/RulesGuideModal.tsx';
import { GameOverModal } from './components/GameOverModal.tsx';
import { sound } from './utils/sound.ts';
import {
  Globe,
  Bot,
  Users2,
  BookOpen,
  Settings,
  Sparkles,
  Wifi,
  WifiOff,
  Copy,
  Check,
} from 'lucide-react';

type GameMode = 'online' | 'ai' | 'pass_and_play';
type AIDifficulty = 'easy' | 'medium' | 'hard';

export default function App() {
  // Game Setup State
  const [mode, setMode] = useState<GameMode>('ai');
  const [mySide, setMySide] = useState<Side>('cho');
  const [myFormation, setMyFormation] = useState<Formation>('masang_masang');
  const [oppFormation, setOppFormation] = useState<Formation>('masang_masang');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('medium');

  // Player Names
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('janggi_player_name') || `대국자${Math.floor(100 + Math.random() * 900)}`;
  });
  const [opponentName, setOpponentName] = useState('인공지능 도전자');

  // Authoritative Janggi Game State
  const [board, setBoard] = useState<Board>(() => setupBoard('masang_masang', 'masang_masang'));
  const [currentTurn, setCurrentTurn] = useState<Side>('cho');
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [boardHistory, setBoardHistory] = useState<Board[]>([]);

  // Captured pieces
  const [choCaptured, setChoCaptured] = useState<Piece[]>([]);
  const [hanCaptured, setHanCaptured] = useState<Piece[]>([]);

  // Timers
  const [choTimeLeft, setChoTimeLeft] = useState(300);
  const [hanTimeLeft, setHanTimeLeft] = useState(300);

  // Game End State
  const [winner, setWinner] = useState<Side | 'DRAW' | null>(null);
  const [winReason, setWinReason] = useState<string | undefined>(undefined);
  const [showGameOverModal, setShowGameOverModal] = useState(false);

  // Preferences & Visuals
  const [flipped, setFlipped] = useState(false);
  const [showHangul, setShowHangul] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Modals & Panels
  const [showFormationModal, setShowFormationModal] = useState(false);
  const [showOnlineLobby, setShowOnlineLobby] = useState(false);
  const [showRulesGuide, setShowRulesGuide] = useState(false);
  const [showInGameChat, setShowInGameChat] = useState(false);

  // Online Multiplayer State
  const [wsConnected, setWsConnected] = useState(false);
  const [isSearchingMatch, setIsSearchingMatch] = useState(false);
  const [onlineRoomId, setOnlineRoomId] = useState<string | null>(null);
  const [onlineRoomName, setOnlineRoomName] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [codeCopied, setCodeCopied] = useState(false);

  // Consecutive passes for score resolution
  const consecutivePassesRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);

  // Save nickname
  const handleSetPlayerName = (name: string) => {
    setPlayerName(name);
    localStorage.setItem('janggi_player_name', name);
  };

  // Sound toggle
  const handleToggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
  };

  // Initialize or Reset Local Game
  const resetGame = useCallback(
    (newChoFormation: Formation = myFormation, newHanFormation: Formation = oppFormation) => {
      const initialBoard = setupBoard(newChoFormation, newHanFormation);
      setBoard(initialBoard);
      setCurrentTurn('cho');
      setSelectedPos(null);
      setValidMoves([]);
      setLastMove(null);
      setMoveHistory([]);
      setBoardHistory([initialBoard]);
      setChoCaptured([]);
      setHanCaptured([]);
      setChoTimeLeft(300);
      setHanTimeLeft(300);
      setWinner(null);
      setWinReason(undefined);
      setShowGameOverModal(false);
      consecutivePassesRef.current = 0;
      setIsAiThinking(false);

      if (mode === 'ai' && mySide === 'han') {
        setFlipped(true);
      } else {
        setFlipped(false);
      }
    },
    [mode, myFormation, oppFormation, mySide]
  );

  // Setup WebSocket connection for online multiplayer
  const connectWebSocket = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setWsConnected(true);
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleServerMessage(msg);
      } catch (err) {
        console.error('WS Parse error', err);
      }
    };

    wsRef.current = ws;
  }, []);

  const handleServerMessage = (msg: { type: string; [key: string]: unknown }) => {
    if (msg.type === 'QUICK_MATCH_WAITING') {
      setIsSearchingMatch(true);
    } else if (msg.type === 'QUICK_MATCH_CANCELLED') {
      setIsSearchingMatch(false);
    } else if (msg.type === 'ROOM_CREATED' || msg.type === 'ROOM_JOINED' || msg.type === 'QUICK_MATCH_FOUND') {
      setIsSearchingMatch(false);
      setShowOnlineLobby(false);
      const roomId = msg.roomId as string;
      const assignedSide = msg.side as Side | 'spectator';
      const room = msg.room as {
        id: string;
        name: string;
        board: Board;
        currentTurn: Side;
        cho: { name: string; formation: Formation } | null;
        han: { name: string; formation: Formation } | null;
      };

      setOnlineRoomId(roomId);
      setOnlineRoomName(room.name);
      setMode('online');
      setMySide(assignedSide === 'spectator' ? 'cho' : assignedSide);
      setFlipped(assignedSide === 'han');

      if (room.cho && room.han) {
        setOpponentName(assignedSide === 'cho' ? room.han.name : room.cho.name);
      }

      setBoard(room.board);
      setCurrentTurn(room.currentTurn);
      setMoveHistory([]);
      setChoCaptured([]);
      setHanCaptured([]);
      setWinner(null);
      setWinReason(undefined);
      sound.playPlace();
    } else if (msg.type === 'MATCH_STARTED') {
      setShowOnlineLobby(false);
      const room = msg.room as {
        board: Board;
        currentTurn: Side;
        cho: { name: string } | null;
        han: { name: string } | null;
      };
      setBoard(room.board);
      setCurrentTurn(room.currentTurn);
      setWinner(null);
      setWinReason(undefined);
      setShowGameOverModal(false);
      sound.playPlace();
    } else if (msg.type === 'MOVE_MADE') {
      const move = msg.move as Move;
      const room = msg.room as {
        board: Board;
        currentTurn: Side;
        winner: Side | 'DRAW' | null;
        winReason?: string;
      };

      setBoard(room.board);
      setCurrentTurn(room.currentTurn);
      setLastMove(move);
      setMoveHistory((prev) => [...prev, move]);

      // Sound
      if (move.captured) {
        sound.playCapture();
        if (move.piece.side === 'cho') {
          setChoCaptured((prev) => [...prev, move.captured!]);
        } else {
          setHanCaptured((prev) => [...prev, move.captured!]);
        }
      } else {
        sound.playPlace();
      }

      if (isInCheck(room.board, room.currentTurn)) {
        sound.playCheck();
      }

      if (room.winner) {
        setWinner(room.winner);
        setWinReason(room.winReason);
        setShowGameOverModal(true);
        sound.playVictory();
      }
    } else if (msg.type === 'PASS_MADE') {
      const room = msg.room as {
        currentTurn: Side;
        winner: Side | 'DRAW' | null;
        winReason?: string;
      };
      setCurrentTurn(room.currentTurn);
      sound.playSelect();

      if (room.winner) {
        setWinner(room.winner);
        setWinReason(room.winReason);
        setShowGameOverModal(true);
        sound.playVictory();
      }
    } else if (msg.type === 'MATCH_FINISHED') {
      const finalWinner = msg.winner as Side | 'DRAW';
      const reason = msg.reason as string;
      setWinner(finalWinner);
      setWinReason(reason);
      setShowGameOverModal(true);
      sound.playVictory();
    } else if (msg.type === 'CHAT_MESSAGE') {
      const chat = msg.message as ChatMessage;
      setChatMessages((prev) => [...prev, chat]);
      if (!showInGameChat && chat.sender !== playerName) {
        setUnreadChatCount((c) => c + 1);
        sound.playSelect();
      }
    } else if (msg.type === 'DRAW_OFFERED') {
      const offeredBy = msg.offeredBy as Side;
      if (offeredBy !== mySide) {
        const accept = window.confirm('상대방이 무승부를 제안했습니다. 수락하시겠습니까?');
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'DRAW_RESPONSE',
              roomId: onlineRoomId,
              accepted: accept,
            })
          );
        }
      }
    } else if (msg.type === 'DRAW_REJECTED') {
      alert('상대방이 무승부 제안을 거절하였습니다.');
    }
  };

  // Connect WS on mount
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  // Turn Countdown Timer
  useEffect(() => {
    if (winner) return;

    const interval = setInterval(() => {
      if (currentTurn === 'cho') {
        setChoTimeLeft((prev) => {
          if (prev <= 1) {
            // Timeout
            setWinner('han');
            setWinReason('초 시간 초과패 (한 승리)');
            setShowGameOverModal(true);
            return 0;
          }
          return prev - 1;
        });
      } else {
        setHanTimeLeft((prev) => {
          if (prev <= 1) {
            // Timeout
            setWinner('cho');
            setWinReason('한 시간 초과패 (초 승리)');
            setShowGameOverModal(true);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentTurn, winner]);

  // Execute Move
  const handleExecuteMove = useCallback(
    (move: Move) => {
      if (winner) return;

      // In Online mode, send to server
      if (mode === 'online') {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'MOVE',
              roomId: onlineRoomId,
              move,
            })
          );
        }
        setSelectedPos(null);
        setValidMoves([]);
        return;
      }

      // Local / AI execution
      const newBoard = applyMove(board, move);
      setBoardHistory((prev) => [...prev, board]);
      setBoard(newBoard);
      setLastMove(move);
      setMoveHistory((prev) => [...prev, move]);
      setSelectedPos(null);
      setValidMoves([]);
      consecutivePassesRef.current = 0;

      // Track captures
      if (move.captured) {
        sound.playCapture();
        if (move.piece.side === 'cho') {
          setChoCaptured((prev) => [...prev, move.captured!]);
        } else {
          setHanCaptured((prev) => [...prev, move.captured!]);
        }
      } else {
        sound.playPlace();
      }

      const nextTurn: Side = currentTurn === 'cho' ? 'han' : 'cho';
      setCurrentTurn(nextTurn);

      // Check for Check / Checkmate
      const isOppInCheck = isInCheck(newBoard, nextTurn);
      if (isOppInCheck) {
        sound.playCheck();
      }

      const nextLegalMoves = getAllLegalMoves(newBoard, nextTurn);
      if (nextLegalMoves.length === 0) {
        const win = currentTurn;
        setWinner(win);
        setWinReason(isOppInCheck ? '외통패 (체크메이트)' : '스테일메이트 (이동 불가)');
        setShowGameOverModal(true);
        sound.playVictory();
      }
    },
    [board, currentTurn, mode, onlineRoomId, winner]
  );

  // AI Turn Handling
  useEffect(() => {
    if (mode !== 'ai' || winner || isAiThinking) return;

    const aiSide: Side = mySide === 'cho' ? 'han' : 'cho';
    if (currentTurn !== aiSide) return;

    setIsAiThinking(true);
    const searchDepth = aiDifficulty === 'easy' ? 1 : aiDifficulty === 'medium' ? 2 : 3;

    const timer = setTimeout(() => {
      const { bestMove } = findBestAIMove(board, aiSide, searchDepth);
      setIsAiThinking(false);

      if (bestMove) {
        handleExecuteMove(bestMove);
      } else {
        // AI has no moves or passes
        handlePass();
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [board, currentTurn, mode, mySide, winner, aiDifficulty, isAiThinking, handleExecuteMove]);

  // Handle Board Position Selection
  const handleSelectPos = (pos: Position) => {
    if (winner || isAiThinking) return;

    if (mode === 'online' && currentTurn !== mySide) return;
    if (mode === 'ai' && currentTurn !== mySide) return;

    const piece = board[pos.r][pos.c];

    // If already selected, clicking another of own pieces selects that one
    if (piece && piece.side === currentTurn) {
      sound.playSelect();
      setSelectedPos(pos);
      const moves = getLegalMoves(board, pos);
      setValidMoves(moves);
    } else {
      setSelectedPos(null);
      setValidMoves([]);
    }
  };

  // Pass Turn (한수 쉼)
  const handlePass = () => {
    if (winner) return;

    if (mode === 'online') {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'PASS',
            roomId: onlineRoomId,
          })
        );
      }
      return;
    }

    if (isInCheck(board, currentTurn)) {
      alert('장군 상태에서는 한수를 쉴 수 없습니다!');
      return;
    }

    sound.playSelect();
    consecutivePassesRef.current++;
    const nextTurn: Side = currentTurn === 'cho' ? 'han' : 'cho';
    setCurrentTurn(nextTurn);
    setSelectedPos(null);
    setValidMoves([]);

    // Two consecutive passes -> evaluate game by Korean Association scoring
    if (consecutivePassesRef.current >= 2) {
      const scores = calculateScores(board);
      if (scores.cho > scores.han) {
        setWinner('cho');
        setWinReason(`연속 한수 쉼 점수 판정승 (초 ${scores.cho}점 vs 한 ${scores.han}점)`);
      } else if (scores.han > scores.cho) {
        setWinner('han');
        setWinReason(`연속 한수 쉼 점수 판정승 (한 ${scores.han}점 vs 초 ${scores.cho}점)`);
      } else {
        setWinner('DRAW');
        setWinReason('연속 한수 쉼 동점 무승부');
      }
      setShowGameOverModal(true);
      sound.playVictory();
    }
  };

  // Resign (기권)
  const handleResign = () => {
    if (winner) return;

    if (mode === 'online') {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'RESIGN',
            roomId: onlineRoomId,
          })
        );
      }
      return;
    }

    const win: Side = currentTurn === 'cho' ? 'han' : 'cho';
    setWinner(win);
    setWinReason(`${currentTurn === 'cho' ? '초' : '한'} 기권승`);
    setShowGameOverModal(true);
    sound.playVictory();
  };

  // Offer Draw (무승부 제안)
  const handleOfferDraw = () => {
    if (winner) return;

    if (mode === 'online') {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'DRAW_OFFER',
            roomId: onlineRoomId,
          })
        );
      }
      alert('상대방에게 무승부를 제안했습니다.');
      return;
    }

    // In AI mode, AI evaluates if position is balanced enough to accept
    if (mode === 'ai') {
      const scores = calculateScores(board);
      const diff = Math.abs(scores.cho - scores.han);
      if (diff <= 3) {
        setWinner('DRAW');
        setWinReason('인공지능 대국 합의 무승부');
        setShowGameOverModal(true);
        sound.playVictory();
      } else {
        alert('인공지능이 무승부 제안을 거절했습니다 (점수 우세).');
      }
      return;
    }

    // In 2-player pass and play
    const accept = window.confirm('상대 플레이어님, 무승부를 수락하시겠습니까?');
    if (accept) {
      setWinner('DRAW');
      setWinReason('양측 합의 무승부');
      setShowGameOverModal(true);
      sound.playVictory();
    }
  };

  // Undo (무르기)
  const handleUndo = () => {
    if (mode === 'online' || winner || boardHistory.length === 0) return;

    if (mode === 'ai') {
      // Revert 2 moves (AI move + user move)
      if (boardHistory.length >= 2) {
        const targetBoard = boardHistory[boardHistory.length - 2];
        setBoard(targetBoard);
        setBoardHistory((prev) => prev.slice(0, -2));
        setMoveHistory((prev) => prev.slice(0, -2));
        setSelectedPos(null);
        setValidMoves([]);
        sound.playSelect();
      }
    } else {
      // Pass & play: revert 1 move
      const targetBoard = boardHistory[boardHistory.length - 1];
      setBoard(targetBoard);
      setBoardHistory((prev) => prev.slice(0, -1));
      setMoveHistory((prev) => prev.slice(0, -1));
      setCurrentTurn((t) => (t === 'cho' ? 'han' : 'cho'));
      setSelectedPos(null);
      setValidMoves([]);
      sound.playSelect();
    }
  };

  // AI Hint (추천수)
  const handleHint = () => {
    if (mode !== 'ai' || currentTurn !== mySide || winner) return;

    const { bestMove } = findBestAIMove(board, mySide, 2);
    if (bestMove) {
      setSelectedPos(bestMove.from);
      setValidMoves([bestMove]);
      sound.playSelect();
    }
  };

  // Online Matchmaking handlers
  const handleStartQuickMatch = () => {
    connectWebSocket();
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'QUICK_MATCH',
          playerName,
          formation: myFormation,
        })
      );
      setIsSearchingMatch(true);
    }
  };

  const handleCancelQuickMatch = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'CANCEL_QUICK_MATCH' }));
      setIsSearchingMatch(false);
    }
  };

  const handleCreateRoom = (roomName: string) => {
    connectWebSocket();
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'CREATE_ROOM',
          playerName,
          formation: myFormation,
          roomName: roomName.trim() || `${playerName}의 대국실`,
        })
      );
    }
  };

  const handleJoinRoom = (roomId: string) => {
    connectWebSocket();
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'JOIN_ROOM',
          roomId,
          playerName,
          formation: myFormation,
        })
      );
    }
  };

  const handleSendMessage = (text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && onlineRoomId) {
      wsRef.current.send(
        JSON.stringify({
          type: 'CHAT',
          roomId: onlineRoomId,
          sender: playerName,
          text,
        })
      );
    }
  };

  const copyRoomCode = () => {
    if (onlineRoomId) {
      navigator.clipboard.writeText(onlineRoomId);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  // Current Scores & Checks
  const scores = calculateScores(board);
  const isInCheckCho = isInCheck(board, 'cho');
  const isInCheckHan = isInCheck(board, 'han');

  // Opponent & My Side assignments
  const isChoMe = mySide === 'cho';
  const topSide: Side = flipped ? 'cho' : 'han';
  const bottomSide: Side = flipped ? 'han' : 'cho';

  const topName = mode === 'online' ? (flipped ? playerName : opponentName) : flipped ? playerName : opponentName;
  const bottomName = mode === 'online' ? (flipped ? opponentName : playerName) : flipped ? opponentName : playerName;

  const topFormation = flipped ? myFormation : oppFormation;
  const bottomFormation = flipped ? oppFormation : myFormation;

  const topCaptured = topSide === 'cho' ? choCaptured : hanCaptured;
  const bottomCaptured = bottomSide === 'cho' ? choCaptured : hanCaptured;

  const isMyTurn = mode === 'pass_and_play' || currentTurn === mySide;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* 1. Header (Universal Top Bar Contract: 1-line Brand wordmark, 4 navigation links, 1 primary CTA) */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-4 sm:px-6 py-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shrink-0">
        {/* Zone 1: Single text wordmark */}
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <img
            src="/src/assets/images/janggi_app_emblem_1792546854894.jpg"
            alt="천하장기 엠블럼"
            referrerPolicy="no-referrer"
            className="w-7 h-7 rounded-full shadow-sm border border-amber-500/40"
          />
          <h1 className="text-base sm:text-lg font-bold font-serif tracking-tight text-amber-100 whitespace-nowrap">
            천하장기 <span className="text-xs font-sans text-amber-400 font-normal ml-1">天下將棋</span>
          </h1>
        </div>

        {/* Zone 2: 4 Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-400">
          <button
            type="button"
            onClick={() => {
              setMode('online');
              setShowOnlineLobby(true);
            }}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              mode === 'online' ? 'text-amber-400 font-bold' : ''
            }`}
          >
            온라인 대국
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('ai');
              setOpponentName(`인공지능 (${aiDifficulty === 'easy' ? '초급' : aiDifficulty === 'medium' ? '중급' : '고급'})`);
              resetGame();
            }}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              mode === 'ai' ? 'text-amber-400 font-bold' : ''
            }`}
          >
            AI 대국
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('pass_and_play');
              setOpponentName('2P 대국자');
              resetGame();
            }}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              mode === 'pass_and_play' ? 'text-amber-400 font-bold' : ''
            }`}
          >
            2인 대국
          </button>
          <button
            type="button"
            onClick={() => setShowRulesGuide(true)}
            className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            장기 규칙
          </button>
        </nav>

        {/* Zone 3: Primary Action CTA */}
        <div className="flex items-center gap-2 shrink-0">
          {mode === 'online' && onlineRoomId ? (
            <button
              type="button"
              onClick={copyRoomCode}
              className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0"
              title="초대 코드 복사"
            >
              {codeCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>방 코드: {onlineRoomId}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setShowOnlineLobby(true);
              }}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg shadow-sm shadow-amber-500/20 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>대국실 로비</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. Main Mobile Play Area */}
      <main className="flex-1 flex flex-col justify-between max-w-lg mx-auto w-full px-2 sm:px-4 py-2 pb-24 md:pb-6">
        {/* Top Info Banner / Connection Indicator */}
        <div className="flex items-center justify-between text-xs text-slate-400 px-2 py-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">
              {mode === 'online' ? '실시간 온라인' : mode === 'ai' ? `AI 대국 (${aiDifficulty === 'easy' ? '초급' : aiDifficulty === 'medium' ? '중급' : '고급'})` : '2인 로컬 대국'}
            </span>
            {isAiThinking && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold animate-pulse">
                <Sparkles className="w-3 h-3" />
                수읽기 중...
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowFormationModal(true)}
              className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold underline decoration-dotted"
            >
              상·마 포진 설정
            </button>
            {mode === 'online' && (
              <div className="flex items-center gap-1 text-[11px]">
                {wsConnected ? (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Wifi className="w-3 h-3" />
                    연결됨
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-rose-400">
                    <WifiOff className="w-3 h-3" />
                    재접속 중
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Top Player Card */}
        <PlayerCard
          side={topSide}
          name={topName}
          isCurrentTurn={currentTurn === topSide}
          isInCheck={topSide === 'cho' ? isInCheckCho : isInCheckHan}
          formation={topFormation}
          score={topSide === 'cho' ? scores.cho : scores.han}
          timeLeft={topSide === 'cho' ? choTimeLeft : hanTimeLeft}
          capturedPieces={topCaptured}
          isMe={mode === 'online' ? mySide === topSide : false}
        />

        {/* Korean Janggi Board */}
        <div className="my-1.5 flex items-center justify-center">
          <JanggiBoard
            board={board}
            selectedPos={selectedPos}
            validMoves={validMoves}
            lastMove={lastMove}
            isInCheckCho={isInCheckCho}
            isInCheckHan={isInCheckHan}
            flipped={flipped}
            showHangul={showHangul}
            interactive={!winner && !isAiThinking && (mode === 'pass_and_play' || currentTurn === mySide)}
            onSelectPos={handleSelectPos}
            onMakeMove={handleExecuteMove}
          />
        </div>

        {/* Bottom Player Card */}
        <PlayerCard
          side={bottomSide}
          name={bottomName}
          isCurrentTurn={currentTurn === bottomSide}
          isInCheck={bottomSide === 'cho' ? isInCheckCho : isInCheckHan}
          formation={bottomFormation}
          score={bottomSide === 'cho' ? scores.cho : scores.han}
          timeLeft={bottomSide === 'cho' ? choTimeLeft : hanTimeLeft}
          capturedPieces={bottomCaptured}
          isMe={mode === 'online' ? mySide === bottomSide : true}
        />

        {/* Game Controls Toolbar */}
        <div className="mt-2">
          <GameControls
            mode={mode}
            isMyTurn={isMyTurn}
            isInCheck={currentTurn === 'cho' ? isInCheckCho : isInCheckHan}
            isMuted={isMuted}
            showHangul={showHangul}
            chatUnreadCount={unreadChatCount}
            onPass={handlePass}
            onResign={handleResign}
            onOfferDraw={handleOfferDraw}
            onFlipBoard={() => setFlipped((f) => !f)}
            onToggleSound={handleToggleSound}
            onToggleHangul={() => setShowHangul((h) => !h)}
            onUndo={handleUndo}
            onHint={handleHint}
            onOpenChat={() => {
              setShowInGameChat(true);
              setUnreadChatCount(0);
            }}
            onOpenRules={() => setShowRulesGuide(true)}
          />
        </div>
      </main>

      {/* 3. Mobile Fixed Bottom Tab Bar (Navigation Anchor - Thumb Zone Ergonomics) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-4 items-center h-16 px-2">
        <button
          type="button"
          onClick={() => {
            setMode('online');
            setShowOnlineLobby(true);
          }}
          className={`flex flex-col items-center justify-center min-h-[44px] transition-colors ${
            mode === 'online' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">온라인</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMode('ai');
            setOpponentName(`인공지능 (${aiDifficulty === 'easy' ? '초급' : aiDifficulty === 'medium' ? '중급' : '고급'})`);
            resetGame();
          }}
          className={`flex flex-col items-center justify-center min-h-[44px] transition-colors ${
            mode === 'ai' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bot className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">AI 대국</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMode('pass_and_play');
            setOpponentName('2P 대국자');
            resetGame();
          }}
          className={`flex flex-col items-center justify-center min-h-[44px] transition-colors ${
            mode === 'pass_and_play' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users2 className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">2인 대국</span>
        </button>

        <button
          type="button"
          onClick={() => setShowRulesGuide(true)}
          className="flex flex-col items-center justify-center min-h-[44px] text-slate-400 hover:text-slate-200 transition-colors"
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">장기 룰</span>
        </button>
      </nav>

      {/* Modals */}
      {/* 1. Formation Selection Modal */}
      <FormationModal
        isOpen={showFormationModal}
        selectedFormation={myFormation}
        onSelect={(f) => {
          setMyFormation(f);
          if (mode !== 'online') {
            resetGame(f, oppFormation);
          }
        }}
        onClose={() => setShowFormationModal(false)}
      />

      {/* 2. Online Lobby Modal */}
      <OnlineLobbyModal
        isOpen={showOnlineLobby}
        playerName={playerName}
        formation={myFormation}
        isSearchingMatch={isSearchingMatch}
        onSetPlayerName={handleSetPlayerName}
        onOpenFormationModal={() => setShowFormationModal(true)}
        onStartQuickMatch={handleStartQuickMatch}
        onCancelQuickMatch={handleCancelQuickMatch}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onClose={() => setShowOnlineLobby(false)}
      />

      {/* 3. In-Game Chat Sheet */}
      <InGameChat
        isOpen={showInGameChat}
        messages={chatMessages}
        currentUserName={playerName}
        onSendMessage={handleSendMessage}
        onClose={() => setShowInGameChat(false)}
      />

      {/* 4. Rules & Move Guide Modal */}
      <RulesGuideModal
        isOpen={showRulesGuide}
        onClose={() => setShowRulesGuide(false)}
      />

      {/* 5. Game Over Modal */}
      <GameOverModal
        isOpen={showGameOverModal}
        winner={winner}
        winReason={winReason}
        mySide={mode === 'online' ? mySide : undefined}
        scores={scores}
        onRestart={() => resetGame()}
        onGoLobby={() => {
          setShowGameOverModal(false);
          setShowOnlineLobby(true);
        }}
      />
    </div>
  );
}
