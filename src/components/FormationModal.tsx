import React from 'react';
import { Formation, FORMATION_LABELS } from '../engine/janggi.ts';
import { Check } from 'lucide-react';

interface FormationModalProps {
  isOpen: boolean;
  selectedFormation: Formation;
  onSelect: (formation: Formation) => void;
  onClose: () => void;
}

export const FormationModal: React.FC<FormationModalProps> = ({
  isOpen,
  selectedFormation,
  onSelect,
  onClose,
}) => {
  if (!isOpen) return null;

  const formations: Formation[] = [
    'masang_masang',
    'sangma_sangma',
    'sangma_masang',
    'masang_sangma',
  ];

  // Visual layout for back rank piece placement for each formation
  const getPieceOrder = (f: Formation) => {
    switch (f) {
      case 'masang_masang':
        return ['차', '마', '상', '사', '궁', '사', '마', '상', '차'];
      case 'sangma_sangma':
        return ['차', '상', '마', '사', '궁', '사', '상', '마', '차'];
      case 'sangma_masang':
        return ['차', '상', '마', '사', '궁', '사', '마', '상', '차']; // 원앙마
      case 'masang_sangma':
        return ['차', '마', '상', '사', '궁', '사', '상', '마', '차']; // 안상
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-100">상·마 포진 차림 선택</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              대국 시작 전 기물의 초기 배치를 선택합니다
            </p>
          </div>
        </div>

        <div className="space-y-3 my-4">
          {formations.map((f) => {
            const isSelected = selectedFormation === f;
            const info = FORMATION_LABELS[f];
            const pieces = getPieceOrder(f);

            return (
              <button
                key={f}
                type="button"
                onClick={() => onSelect(f)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-amber-950/40 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                    : 'bg-slate-850/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                    {info.name}
                    {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                  </span>
                  <span className="text-xs text-slate-400">{info.desc}</span>
                </div>

                {/* Mini Visual Preview of the 9 positions on back rank */}
                <div className="mt-2.5 flex items-center justify-between gap-1 p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  {pieces.map((p, idx) => {
                    const isKeyPiece = idx === 1 || idx === 2 || idx === 6 || idx === 7;
                    return (
                      <span
                        key={idx}
                        className={`flex-1 text-center py-0.5 rounded text-[11px] font-serif font-bold ${
                          isKeyPiece
                            ? p === '마'
                              ? 'bg-emerald-900/60 text-emerald-300 ring-1 ring-emerald-500/40'
                              : 'bg-amber-900/60 text-amber-300 ring-1 ring-amber-500/40'
                            : 'text-slate-500'
                        }`}
                      >
                        {p}
                      </span>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all"
        >
          포진 설정 완료
        </button>
      </div>
    </div>
  );
};
