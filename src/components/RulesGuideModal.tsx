import React, { useState } from 'react';
import { X, BookOpen, ShieldCheck, Award } from 'lucide-react';

interface RulesGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesGuideModal: React.FC<RulesGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'pieces' | 'scoring' | 'rules'>('pieces');

  if (!isOpen) return null;

  const piecesGuide = [
    {
      name: '궁 (King / General)',
      hanja: '楚 / 漢',
      points: '승패 결정 (0점)',
      desc: '궁성 안에서만 이동하며, 가로·세로 1칸 및 궁성 대각선 1칸을 이동합니다. 궁성을 벗어날 수 없습니다.',
    },
    {
      name: '차 (Chariot)',
      hanja: '車',
      points: '13점',
      desc: '가로·세로 장애물이 없을 때까지 원하는 거리만큼 직선 이동합니다. 궁성에 진입하면 궁성 대각선 라인을 따라 미끄러져 이동할 수 있습니다.',
    },
    {
      name: '포 (Cannon)',
      hanja: '包',
      points: '7점',
      desc: '반드시 다른 기물(다리) 딱 하나를 뛰어넘어야만 이동하거나 잡을 수 있습니다. [핵심 규칙] 포는 절대 다른 포를 다리로 삼거나 잡을 수 없습니다 ("포불월포, 포불식포"). 궁성 대각선 점프도 가능합니다.',
    },
    {
      name: '마 (Horse)',
      hanja: '馬',
      points: '5점',
      desc: '직선으로 1칸 나아간 뒤 대각선 바깥으로 1칸 뜁니다. 단, 첫 번째 직선 칸에 기물이 있으면 길이 막혀 이동할 수 없습니다 ("마의 멱").',
    },
    {
      name: '상 (Elephant)',
      hanja: '象',
      points: '3점',
      desc: '직선으로 1칸, 이어서 같은 방향 대각선으로 2칸 뜁니다 (총 3칸). 첫 직선 칸이나 중간 대각선 칸에 기물이 있으면 길이 막힙니다 ("상의 멱").',
    },
    {
      name: '사 (Guard)',
      hanja: '士',
      points: '3점',
      desc: '궁과 마찬가지로 궁성 안에서만 가로·세로 및 대각선 1칸씩 이동합니다.',
    },
    {
      name: '졸 / 병 (Soldier)',
      hanja: '卒 / 兵',
      points: '2점',
      desc: '앞으로 1칸 또는 좌우로 1칸 전진합니다. 뒤로는 절대 물러설 수 없습니다. 상대방 궁성에 들어가면 궁성 대각선 앞쪽으로도 진격할 수 있습니다.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">한국 장기 규칙 및 가이드</h3>
              <p className="text-xs text-slate-400">대한장기협회 공식 룰과 행마법</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-3 p-1.5 bg-slate-950 border-b border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('pieces')}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'pieces'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            기물 행마법
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('scoring')}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'scoring'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            점수제 (기물 가치)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'rules'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            대국 특수 규칙
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-3">
          {activeTab === 'pieces' && (
            <div className="space-y-3">
              {piecesGuide.map((p, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-black text-amber-400 text-base">{p.hanja}</span>
                      <span className="font-bold text-sm text-slate-100">{p.name}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-800 text-amber-300">
                      {p.points}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'scoring' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-600/40 text-xs leading-relaxed text-amber-200/90">
                <div className="font-bold text-sm text-amber-300 mb-1 flex items-center gap-1.5">
                  <Award className="w-4 h-4" />
                  <span>대한장기협회 공식 점수제 규정</span>
                </div>
                초(선수)는 총 72점, 한(후수)은 후공의 불리를 보정하기 위해 <strong className="text-amber-100">덤 1.5점</strong>을 받아 총 73.5점으로 시작합니다.
                대국 중 기물이 소진되거나 연속 한수 쉼으로 승패가 나지 않을 때 남은 기물 점수 합산으로 승패를 가립니다.
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block mb-1">차 (車)</span>
                  <span className="text-lg font-bold text-slate-100 font-mono">13점</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block mb-1">포 (包)</span>
                  <span className="text-lg font-bold text-slate-100 font-mono">7점</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block mb-1">마 (馬)</span>
                  <span className="text-lg font-bold text-slate-100 font-mono">5점</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block mb-1">상 (象)</span>
                  <span className="text-lg font-bold text-slate-100 font-mono">3점</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block mb-1">사 (士)</span>
                  <span className="text-lg font-bold text-slate-100 font-mono">3점</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block mb-1">졸 / 병 (卒/兵)</span>
                  <span className="text-lg font-bold text-slate-100 font-mono">2점</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <h4 className="font-bold text-sm text-slate-200 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  한수 쉼 (Pass)
                </h4>
                <p className="text-slate-400">
                  자신의 차례에 불리한 수밖에 없거나 둘 것이 없을 때 한 수를 쉴 수 있습니다. 단, 왕이 장군을 맞았을 때는 한수를 쉴 수 없으며 반드시 장군을 멍군해야 합니다.
                  양측이 연속으로 한 수를 쉬면 경기가 끝나며 점수로 판정합니다.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <h4 className="font-bold text-sm text-slate-200 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  빅장 (Bikjang)
                </h4>
                <p className="text-slate-400">
                  초와 한의 궁(왕)이 같은 세로선 상에 마주보고 있고 사이에 가로막는 기물이 전혀 없을 때를 '빅장'이라 부릅니다.
                  빅장 상태를 이용해 무승부를 요구하거나 피할 수 있습니다.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <h4 className="font-bold text-sm text-slate-200 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-rose-400" />
                  외통 (Checkmate)
                </h4>
                <p className="text-slate-400">
                  왕이 장군을 맞았을 때, 피할 곳도 없고 가로막거나 공격하는 기물을 잡을 수 없을 때 '외통'이라 하며 해당 플레이어의 패배로 종료됩니다.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
