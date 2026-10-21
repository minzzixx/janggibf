import React, { useState, useEffect } from 'react';
import { Users, Plus, KeyRound, Loader2, Play, RefreshCw, X, Eye } from 'lucide-react';
import { Formation, FORMATION_LABELS } from '../engine/janggi.ts';

interface RoomInfo {
  id: string;
  name: string;
  status: 'WAITING' | 'PLAYING' | 'FINISHED';
  choName: string;
  hanName: string;
  spectators: number;
}

interface OnlineLobbyModalProps {
  isOpen: boolean;
  playerName: string;
  formation: Formation;
  isSearchingMatch: boolean;
  onSetPlayerName: (name: string) => void;
  onOpenFormationModal: () => void;
  onStartQuickMatch: () => void;
  onCancelQuickMatch: () => void;
  onCreateRoom: (roomName: string) => void;
  onJoinRoom: (roomId: string) => void;
  onClose: () => void;
}

export const OnlineLobbyModal: React.FC<OnlineLobbyModalProps> = ({
  isOpen,
  playerName,
  formation,
  isSearchingMatch,
  onSetPlayerName,
  onOpenFormationModal,
  onStartQuickMatch,
  onCancelQuickMatch,
  onCreateRoom,
  onJoinRoom,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'quick' | 'create' | 'join' | 'rooms'>('quick');
  const [roomNameInput, setRoomNameInput] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [roomList, setRoomList] = useState<RoomInfo[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === 'rooms') {
      fetchRooms();
    }
  }, [isOpen, activeTab]);

  const fetchRooms = async () => {
    setIsLoadingRooms(true);
    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      setRoomList(data.rooms || []);
    } catch {
      // ignore
    } finally {
      setIsLoadingRooms(false);
    }
  };

  if (!isOpen) return null;

  const formationName = FORMATION_LABELS[formation].name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">온라인 대국장</h3>
              <p className="text-xs text-slate-400">전국 대국자와 실시간으로 장기를 겨뤄보세요</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile & Formation Quick Bar */}
        <div className="px-5 py-3 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">닉네임:</span>
            <input
              type="text"
              value={playerName}
              onChange={(e) => onSetPlayerName(e.target.value.substring(0, 10))}
              placeholder="대국자명"
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-semibold focus:outline-none focus:border-amber-500 w-28"
            />
          </div>

          <button
            type="button"
            onClick={onOpenFormationModal}
            className="px-3 py-1 rounded-lg bg-amber-950/40 border border-amber-600/60 text-amber-300 font-medium hover:bg-amber-900/50 transition-colors"
          >
            포진: <span className="font-bold">{formationName.split(' ')[0]}</span> (변경)
          </button>
        </div>

        {/* Tab Controls */}
        <div className="grid grid-cols-4 p-1.5 bg-slate-950 border-b border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('quick')}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'quick' ? 'bg-amber-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            빠른 매칭
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'create' ? 'bg-amber-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            방 만들기
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('join')}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'join' ? 'bg-amber-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            코드 입장
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rooms')}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'rooms' ? 'bg-amber-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            대국실 목록
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-5 flex-1 overflow-y-auto">
          {/* 1. Quick Match */}
          {activeTab === 'quick' && (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
              {isSearchingMatch ? (
                <>
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-amber-500/30 border-t-amber-500 animate-spin" />
                    <Loader2 className="w-7 h-7 text-amber-400 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-slate-100">상대 대국자를 찾는 중...</h4>
                    <p className="text-xs text-slate-400 mt-1">접속 중인 다른 유저와 자동으로 연결합니다</p>
                  </div>
                  <button
                    type="button"
                    onClick={onCancelQuickMatch}
                    className="px-6 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    매칭 취소
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Play className="w-8 h-8 fill-amber-400 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-slate-100">실시간 1:1 빠른 매칭</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      기본 5분 메인 타임 + 30초 초읽기 룰이 적용된 실시간 온라인 대국에 즉시 참가합니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onStartQuickMatch}
                    className="w-full max-w-xs h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 active:scale-95 transition-all"
                  >
                    대국 상대 찾기
                  </button>
                </>
              )}
            </div>
          )}

          {/* 2. Create Room */}
          {activeTab === 'create' && (
            <div className="space-y-4 py-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">대국방 이름</label>
                <input
                  type="text"
                  value={roomNameInput}
                  onChange={(e) => setRoomNameInput(e.target.value)}
                  placeholder={`${playerName}의 한판 승부`}
                  maxLength={25}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1.5 text-slate-400">
                <div className="flex justify-between">
                  <span>대국 룰</span>
                  <span className="text-slate-200 font-medium">대한장기협회 공식 룰</span>
                </div>
                <div className="flex justify-between">
                  <span>제한 시간</span>
                  <span className="text-slate-200 font-medium">5분 + 30초 초읽기</span>
                </div>
                <div className="flex justify-between">
                  <span>선공/후공</span>
                  <span className="text-slate-200 font-medium">방장: 초(선수) / 도전자: 한(후수+1.5덤)</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onCreateRoom(roomNameInput)}
                className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>대국방 개설하기</span>
              </button>
            </div>
          )}

          {/* 3. Join by Code */}
          {activeTab === 'join' && (
            <div className="space-y-4 py-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 mx-auto">
                <KeyRound className="w-7 h-7" />
              </div>

              <div>
                <h4 className="font-bold text-base text-slate-100">초대 코드 입력</h4>
                <p className="text-xs text-slate-400 mt-1">상대방에게 공유받은 5자리 영문 방 코드를 입력하세요</p>
              </div>

              <div className="max-w-xs mx-auto">
                <input
                  type="text"
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  placeholder="예: 7K2M9"
                  maxLength={6}
                  className="w-full h-12 text-center font-mono font-bold text-lg tracking-widest uppercase rounded-xl bg-slate-950 border border-slate-700 text-amber-400 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="button"
                disabled={!roomCodeInput.trim()}
                onClick={() => onJoinRoom(roomCodeInput.trim())}
                className="w-full max-w-xs mx-auto h-12 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 active:scale-95 transition-all"
              >
                대국실 입장
              </button>
            </div>
          )}

          {/* 4. Active Rooms */}
          {activeTab === 'rooms' && (
            <div className="space-y-3 py-1">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs text-slate-400">개설된 대국방 목록</span>
                <button
                  type="button"
                  onClick={fetchRooms}
                  disabled={isLoadingRooms}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRooms ? 'animate-spin' : ''}`} />
                  새로고침
                </button>
              </div>

              {roomList.length === 0 ? (
                <div className="py-10 text-center text-slate-500 text-xs">
                  현재 개설된 공개 대국방이 없습니다. 직접 방을 개설해보세요!
                </div>
              ) : (
                <div className="space-y-2">
                  {roomList.map((r) => (
                    <div
                      key={r.id}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-200">{r.name}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-amber-300 font-mono">
                            {r.id}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                          <span>초: {r.choName}</span>
                          <span>·</span>
                          <span>한: {r.hanName}</span>
                          {r.spectators > 0 && (
                            <span className="flex items-center gap-1 text-[11px] text-slate-500">
                              <Eye className="w-3 h-3" />
                              {r.spectators}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onJoinRoom(r.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                          r.status === 'WAITING'
                            ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {r.status === 'WAITING' ? '도전하기' : '관전하기'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
