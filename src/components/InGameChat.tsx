import React, { useState } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

interface InGameChatProps {
  isOpen: boolean;
  messages: ChatMessage[];
  currentUserName: string;
  onSendMessage: (text: string) => void;
  onClose: () => void;
}

export const InGameChat: React.FC<InGameChatProps> = ({
  isOpen,
  messages,
  currentUserName,
  onSendMessage,
  onClose,
}) => {
  const [inputText, setInputText] = useState('');

  if (!isOpen) return null;

  const quickPhrases = [
    '안녕하세요! 잘 부탁드립니다.',
    '한수 잘 배웠습니다.',
    '장군!',
    '멋진 묘수입니다!',
    '감사합니다.',
    '수고하셨습니다!',
  ];

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm sm:items-center sm:justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[600px] text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm text-slate-100">대국 대화 & 예절</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Phrases */}
        <div className="px-3 py-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {quickPhrases.map((phrase, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSendMessage(phrase)}
              className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] whitespace-nowrap shrink-0 transition-colors border border-slate-700/60"
            >
              {phrase}
            </button>
          ))}
        </div>

        {/* Messages List */}
        <div className="flex-1 p-3.5 space-y-2.5 overflow-y-auto min-h-[180px]">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 text-xs">
              <span>아직 주고받은 메시지가 없습니다.</span>
              <span className="mt-1 text-slate-600">위 빠른 인사말을 눌러 인사를 건네보세요.</span>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.sender === currentUserName;
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[10px] text-slate-500 mb-0.5 px-1">
                    {m.sender}
                  </span>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-xs ${
                      isMe
                        ? 'bg-amber-600 text-white rounded-br-none shadow-sm'
                        : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700/50'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 bg-slate-950 border-t border-slate-800 shrink-0 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="메시지를 입력하세요..."
            maxLength={80}
            className="flex-1 h-10 px-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="h-10 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 text-slate-950 disabled:text-slate-600 font-bold text-xs flex items-center justify-center transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
