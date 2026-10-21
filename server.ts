import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  Side,
  Formation,
  Move,
  setupBoard,
  applyMove,
  isInCheck,
  getAllLegalMoves,
  calculateScores,
  Board,
} from './src/engine/janggi.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

interface PlayerSession {
  ws: WebSocket;
  id: string;
  name: string;
  side?: Side;
  formation: Formation;
  timeLeft: number; // in seconds
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

interface Room {
  id: string;
  name: string;
  status: 'WAITING' | 'PLAYING' | 'FINISHED';
  cho: PlayerSession | null;
  han: PlayerSession | null;
  spectators: { ws: WebSocket; name: string }[];
  board: Board;
  currentTurn: Side;
  turnStartTime: number;
  byoYomi: number; // 30 seconds
  moveHistory: Move[];
  chatHistory: ChatMessage[];
  winner: Side | 'DRAW' | null;
  winReason?: string;
  drawOfferedBy: Side | null;
  consecutivePasses: number;
  scores: { cho: number; han: number };
}

const rooms = new Map<string, Room>();
const waitingMatchQueue: { ws: WebSocket; id: string; name: string; formation: Formation }[] = [];

// Helper to broadcast to everyone in room
function broadcastRoom(room: Room, message: Record<string, unknown>) {
  const payload = JSON.stringify(message);
  if (room.cho?.ws.readyState === WebSocket.OPEN) {
    room.cho.ws.send(payload);
  }
  if (room.han?.ws.readyState === WebSocket.OPEN) {
    room.han.ws.send(payload);
  }
  for (const s of room.spectators) {
    if (s.ws.readyState === WebSocket.OPEN) {
      s.ws.send(payload);
    }
  }
}

function getSanitizedRoomState(room: Room) {
  return {
    id: room.id,
    name: room.name,
    status: room.status,
    cho: room.cho
      ? { id: room.cho.id, name: room.cho.name, formation: room.cho.formation, timeLeft: room.cho.timeLeft }
      : null,
    han: room.han
      ? { id: room.han.id, name: room.han.name, formation: room.han.formation, timeLeft: room.han.timeLeft }
      : null,
    spectatorCount: room.spectators.length,
    board: room.board,
    currentTurn: room.currentTurn,
    moveHistory: room.moveHistory,
    chatHistory: room.chatHistory.slice(-30),
    winner: room.winner,
    winReason: room.winReason,
    drawOfferedBy: room.drawOfferedBy,
    scores: room.scores,
    isInCheckCho: isInCheck(room.board, 'cho'),
    isInCheckHan: isInCheck(room.board, 'han'),
  };
}

function startMatch(room: Room) {
  if (!room.cho || !room.han) return;
  room.status = 'PLAYING';
  room.currentTurn = 'cho';
  room.board = setupBoard(room.cho.formation, room.han.formation);
  room.moveHistory = [];
  room.winner = null;
  room.winReason = undefined;
  room.drawOfferedBy = null;
  room.consecutivePasses = 0;
  room.scores = calculateScores(room.board);
  room.cho.timeLeft = 300; // 5 minutes main time
  room.han.timeLeft = 300;
  room.turnStartTime = Date.now();

  broadcastRoom(room, {
    type: 'MATCH_STARTED',
    room: getSanitizedRoomState(room),
  });
}

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 5; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

// REST Endpoints
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', activeRooms: rooms.size, queued: waitingMatchQueue.length });
});

app.get('/api/rooms', (_req, res) => {
  const roomList = Array.from(rooms.values()).map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    choName: r.cho?.name || '대기 중',
    hanName: r.han?.name || '대기 중',
    spectators: r.spectators.length,
  }));
  res.json({ rooms: roomList });
});

// WebSocket Handler
wss.on('connection', (ws: WebSocket) => {
  let currentRoomId: string | null = null;
  let playerSessionId = `user_${Math.random().toString(36).substring(2, 9)}`;

  ws.on('message', (data: string) => {
    try {
      const msg = JSON.parse(data.toString());

      // 1. CREATE_ROOM
      if (msg.type === 'CREATE_ROOM') {
        const roomId = generateRoomId();
        const roomName = msg.roomName || `${msg.playerName || '초심자'}의 대국방`;
        const formation: Formation = msg.formation || 'masang_masang';

        const newRoom: Room = {
          id: roomId,
          name: roomName,
          status: 'WAITING',
          cho: {
            ws,
            id: playerSessionId,
            name: msg.playerName || '플레이어 1',
            side: 'cho',
            formation,
            timeLeft: 300,
          },
          han: null,
          spectators: [],
          board: setupBoard(formation, 'masang_masang'),
          currentTurn: 'cho',
          turnStartTime: Date.now(),
          byoYomi: 30,
          moveHistory: [],
          chatHistory: [],
          winner: null,
          drawOfferedBy: null,
          consecutivePasses: 0,
          scores: { cho: 72, han: 73.5 },
        };

        rooms.set(roomId, newRoom);
        currentRoomId = roomId;

        ws.send(
          JSON.stringify({
            type: 'ROOM_CREATED',
            roomId,
            side: 'cho',
            room: getSanitizedRoomState(newRoom),
          })
        );
      }

      // 2. JOIN_ROOM
      else if (msg.type === 'JOIN_ROOM') {
        const roomId = (msg.roomId || '').trim().toUpperCase();
        const room = rooms.get(roomId);
        if (!room) {
          ws.send(JSON.stringify({ type: 'ERROR', message: '존재하지 않는 방 번호입니다.' }));
          return;
        }

        const playerName = msg.playerName || '도전자';
        const formation: Formation = msg.formation || 'masang_masang';

        if (!room.han && room.status === 'WAITING') {
          // Join as Han (Player 2)
          room.han = {
            ws,
            id: playerSessionId,
            name: playerName,
            side: 'han',
            formation,
            timeLeft: 300,
          };
          currentRoomId = roomId;

          ws.send(
            JSON.stringify({
              type: 'ROOM_JOINED',
              roomId,
              side: 'han',
              room: getSanitizedRoomState(room),
            })
          );

          startMatch(room);
        } else {
          // Join as Spectator
          room.spectators.push({ ws, name: playerName });
          currentRoomId = roomId;

          ws.send(
            JSON.stringify({
              type: 'ROOM_JOINED',
              roomId,
              side: 'spectator',
              room: getSanitizedRoomState(room),
            })
          );

          broadcastRoom(room, {
            type: 'SPECTATOR_JOINED',
            name: playerName,
            spectatorCount: room.spectators.length,
          });
        }
      }

      // 3. QUICK_MATCH
      else if (msg.type === 'QUICK_MATCH') {
        const playerName = msg.playerName || '대국자';
        const formation: Formation = msg.formation || 'masang_masang';

        // Check if there is someone in queue
        const opponentIdx = waitingMatchQueue.findIndex((p) => p.ws !== ws && p.ws.readyState === WebSocket.OPEN);

        if (opponentIdx !== -1) {
          const opponent = waitingMatchQueue.splice(opponentIdx, 1)[0];
          const roomId = generateRoomId();

          const room: Room = {
            id: roomId,
            name: `${opponent.name} vs ${playerName}`,
            status: 'PLAYING',
            cho: {
              ws: opponent.ws,
              id: opponent.id,
              name: opponent.name,
              side: 'cho',
              formation: opponent.formation,
              timeLeft: 300,
            },
            han: {
              ws,
              id: playerSessionId,
              name: playerName,
              side: 'han',
              formation,
              timeLeft: 300,
            },
            spectators: [],
            board: setupBoard(opponent.formation, formation),
            currentTurn: 'cho',
            turnStartTime: Date.now(),
            byoYomi: 30,
            moveHistory: [],
            chatHistory: [],
            winner: null,
            drawOfferedBy: null,
            consecutivePasses: 0,
            scores: { cho: 72, han: 73.5 },
          };

          rooms.set(roomId, room);
          currentRoomId = roomId;

          opponent.ws.send(
            JSON.stringify({
              type: 'QUICK_MATCH_FOUND',
              roomId,
              side: 'cho',
              room: getSanitizedRoomState(room),
            })
          );

          ws.send(
            JSON.stringify({
              type: 'QUICK_MATCH_FOUND',
              roomId,
              side: 'han',
              room: getSanitizedRoomState(room),
            })
          );

          startMatch(room);
        } else {
          // Push to queue
          waitingMatchQueue.push({
            ws,
            id: playerSessionId,
            name: playerName,
            formation,
          });
          ws.send(JSON.stringify({ type: 'QUICK_MATCH_WAITING' }));
        }
      }

      // 4. CANCEL_QUICK_MATCH
      else if (msg.type === 'CANCEL_QUICK_MATCH') {
        const idx = waitingMatchQueue.findIndex((p) => p.ws === ws);
        if (idx !== -1) {
          waitingMatchQueue.splice(idx, 1);
        }
        ws.send(JSON.stringify({ type: 'QUICK_MATCH_CANCELLED' }));
      }

      // 5. MOVE
      else if (msg.type === 'MOVE') {
        const roomId = msg.roomId || currentRoomId;
        const room = rooms.get(roomId);
        if (!room || room.status !== 'PLAYING') return;

        const move: Move = msg.move;
        const currentTurn = room.currentTurn;

        // Verify player is on turn
        const player = currentTurn === 'cho' ? room.cho : room.han;
        if (!player || player.ws !== ws) {
          ws.send(JSON.stringify({ type: 'ERROR', message: '자신의 차례가 아닙니다.' }));
          return;
        }

        // Apply move
        room.board = applyMove(room.board, move);
        room.moveHistory.push(move);
        room.consecutivePasses = 0;
        room.scores = calculateScores(room.board);

        // Switch turn
        const nextTurn: Side = currentTurn === 'cho' ? 'han' : 'cho';
        room.currentTurn = nextTurn;
        room.turnStartTime = Date.now();

        // Check if next turn has legal moves or is checkmate
        const inCheck = isInCheck(room.board, nextTurn);
        const legalMoves = getAllLegalMoves(room.board, nextTurn);

        if (legalMoves.length === 0) {
          room.status = 'FINISHED';
          room.winner = currentTurn;
          room.winReason = inCheck ? '외통패 (체크메이트)' : '스테일메이트 (이동 불가)';
        }

        broadcastRoom(room, {
          type: 'MOVE_MADE',
          move,
          room: getSanitizedRoomState(room),
        });
      }

      // 6. PASS (한수 쉼)
      else if (msg.type === 'PASS') {
        const roomId = msg.roomId || currentRoomId;
        const room = rooms.get(roomId);
        if (!room || room.status !== 'PLAYING') return;

        const currentTurn = room.currentTurn;
        const player = currentTurn === 'cho' ? room.cho : room.han;
        if (!player || player.ws !== ws) return;

        // Check if in check - cannot pass if King is in check!
        if (isInCheck(room.board, currentTurn)) {
          ws.send(JSON.stringify({ type: 'ERROR', message: '장군 상태에서는 한수를 쉴 수 없습니다.' }));
          return;
        }

        room.consecutivePasses++;
        const nextTurn: Side = currentTurn === 'cho' ? 'han' : 'cho';
        room.currentTurn = nextTurn;
        room.turnStartTime = Date.now();

        // If both passed consecutively -> Game over, resolve by official score!
        if (room.consecutivePasses >= 2) {
          room.status = 'FINISHED';
          if (room.scores.cho > room.scores.han) {
            room.winner = 'cho';
            room.winReason = `연속 한수 쉼에 의한 점수 승리 (초 ${room.scores.cho}점 vs 한 ${room.scores.han}점)`;
          } else if (room.scores.han > room.scores.cho) {
            room.winner = 'han';
            room.winReason = `연속 한수 쉼에 의한 점수 승리 (한 ${room.scores.han}점 vs 초 ${room.scores.cho}점)`;
          } else {
            room.winner = 'DRAW';
            room.winReason = '연속 한수 쉼 동점 무승부';
          }
        }

        broadcastRoom(room, {
          type: 'PASS_MADE',
          side: currentTurn,
          room: getSanitizedRoomState(room),
        });
      }

      // 7. RESIGN (기권)
      else if (msg.type === 'RESIGN') {
        const roomId = msg.roomId || currentRoomId;
        const room = rooms.get(roomId);
        if (!room || room.status !== 'PLAYING') return;

        let resigningSide: Side | null = null;
        if (room.cho?.ws === ws) resigningSide = 'cho';
        if (room.han?.ws === ws) resigningSide = 'han';

        if (resigningSide) {
          room.status = 'FINISHED';
          room.winner = resigningSide === 'cho' ? 'han' : 'cho';
          room.winReason = `${resigningSide === 'cho' ? '초' : '한'} 기권승`;

          broadcastRoom(room, {
            type: 'MATCH_FINISHED',
            winner: room.winner,
            reason: room.winReason,
            room: getSanitizedRoomState(room),
          });
        }
      }

      // 8. DRAW OFFER & RESPONSE
      else if (msg.type === 'DRAW_OFFER') {
        const roomId = msg.roomId || currentRoomId;
        const room = rooms.get(roomId);
        if (!room || room.status !== 'PLAYING') return;

        const offeringSide: Side | null = room.cho?.ws === ws ? 'cho' : room.han?.ws === ws ? 'han' : null;
        if (offeringSide) {
          room.drawOfferedBy = offeringSide;
          broadcastRoom(room, {
            type: 'DRAW_OFFERED',
            offeredBy: offeringSide,
          });
        }
      } else if (msg.type === 'DRAW_RESPONSE') {
        const roomId = msg.roomId || currentRoomId;
        const room = rooms.get(roomId);
        if (!room || room.status !== 'PLAYING' || !room.drawOfferedBy) return;

        if (msg.accepted) {
          room.status = 'FINISHED';
          room.winner = 'DRAW';
          room.winReason = '양측 합의 무승부';

          broadcastRoom(room, {
            type: 'MATCH_FINISHED',
            winner: 'DRAW',
            reason: room.winReason,
            room: getSanitizedRoomState(room),
          });
        } else {
          const rejecter = room.cho?.ws === ws ? 'cho' : 'han';
          room.drawOfferedBy = null;
          broadcastRoom(room, {
            type: 'DRAW_REJECTED',
            rejectedBy: rejecter,
          });
        }
      }

      // 9. CHAT
      else if (msg.type === 'CHAT') {
        const roomId = msg.roomId || currentRoomId;
        const room = rooms.get(roomId);
        if (!room) return;

        const chatMsg: ChatMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          sender: msg.sender || '대국자',
          text: (msg.text || '').substring(0, 100),
          timestamp: Date.now(),
        };

        room.chatHistory.push(chatMsg);
        broadcastRoom(room, {
          type: 'CHAT_MESSAGE',
          message: chatMsg,
        });
      }

      // 10. RESTART_GAME (in room)
      else if (msg.type === 'RESTART_GAME') {
        const roomId = msg.roomId || currentRoomId;
        const room = rooms.get(roomId);
        if (!room) return;

        // Swap sides
        const temp = room.cho;
        room.cho = room.han;
        room.han = temp;
        if (room.cho) room.cho.side = 'cho';
        if (room.han) room.han.side = 'han';

        startMatch(room);
      }
    } catch (e) {
      console.error('WS Error:', e);
    }
  });

  ws.on('close', () => {
    // Remove from matchmaking queue
    const qIdx = waitingMatchQueue.findIndex((p) => p.ws === ws);
    if (qIdx !== -1) {
      waitingMatchQueue.splice(qIdx, 1);
    }

    if (currentRoomId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        if (room.status === 'PLAYING') {
          // If a player leaves during match, the other wins by abandonment
          const leavingSide = room.cho?.ws === ws ? 'cho' : room.han?.ws === ws ? 'han' : null;
          if (leavingSide) {
            room.status = 'FINISHED';
            room.winner = leavingSide === 'cho' ? 'han' : 'cho';
            room.winReason = `${leavingSide === 'cho' ? '초' : '한'}의 연결 끊김 (부전승)`;
            broadcastRoom(room, {
              type: 'MATCH_FINISHED',
              winner: room.winner,
              reason: room.winReason,
              room: getSanitizedRoomState(room),
            });
          }
        }
        // Remove spectator
        room.spectators = room.spectators.filter((s) => s.ws !== ws);
      }
    }
  });
});

// Vite or Static file serving
async function setupVite() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }
}

setupVite().then(() => {
  server.listen(PORT, () => {
    console.log(`Korean Janggi Server running on http://localhost:${PORT}`);
  });
});
