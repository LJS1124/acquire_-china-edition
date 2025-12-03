import React from 'react';
import { PlayerProfile, Room } from '../types';
import { Crown, CheckCircle2, Circle, LogOut, Play, Copy } from 'lucide-react';

interface RoomViewProps {
  room: Room;
  localPlayerId: string;
  onToggleReady: () => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

const RoomView: React.FC<RoomViewProps> = ({ room, localPlayerId, onToggleReady, onStartGame, onLeaveRoom }) => {
  const localPlayer = room.players.find(p => p.id === localPlayerId);
  const isHost = room.hostId === localPlayerId;
  const allReady = room.players.length >= 3 && room.players.every(p => p.isReady); // Min 3 players rule

  const copyRoomId = () => {
    navigator.clipboard.writeText(room.id);
    // Could add toast here
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0f1c] text-slate-100 p-4">
      <div className="max-w-4xl w-full bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[500px]">
        
        {/* Left Side: Room Info */}
        <div className="md:w-1/3 bg-slate-950 p-8 border-r border-slate-800 flex flex-col">
            <div className="mb-8">
                <h2 className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-2">房间号码</h2>
                <div 
                    onClick={copyRoomId}
                    className="text-4xl font-mono font-bold text-cyan-400 cursor-pointer hover:text-cyan-300 transition-colors flex items-center gap-2 group"
                    title="点击复制"
                >
                    {room.id}
                    <Copy size={16} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500" />
                </div>
            </div>

            <div className="flex-1">
                 <h2 className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-4">游戏设置</h2>
                 <ul className="space-y-3 text-sm text-slate-400">
                    <li className="flex justify-between border-b border-slate-800 pb-2">
                        <span>当前人数</span>
                        <span className="text-white">{room.players.length} / 6</span>
                    </li>
                    <li className="flex justify-between border-b border-slate-800 pb-2">
                        <span>最少人数</span>
                        <span className="text-white">3 人</span>
                    </li>
                    <li className="flex justify-between border-b border-slate-800 pb-2">
                        <span>模式</span>
                        <span className="text-indigo-400 font-bold">标准规则</span>
                    </li>
                 </ul>
            </div>

            <button 
                onClick={onLeaveRoom}
                className="mt-8 flex items-center justify-center gap-2 text-slate-500 hover:text-red-400 transition-colors text-sm font-bold"
            >
                <LogOut size={16} /> 离开房间
            </button>
        </div>

        {/* Right Side: Player List */}
        <div className="md:w-2/3 p-8 flex flex-col">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold font-tech">等待玩家加入...</h2>
                <div className="px-3 py-1 bg-indigo-900/50 rounded-full border border-indigo-700/50 text-indigo-300 text-xs font-bold animate-pulse">
                    Waiting for players
                </div>
             </div>

             <div className="grid grid-cols-1 gap-3 flex-1 overflow-y-auto mb-6">
                {room.players.map((p, index) => (
                    <div 
                        key={p.id}
                        className={`
                            flex items-center justify-between p-4 rounded-lg border transition-all
                            ${p.id === localPlayerId ? 'bg-indigo-900/20 border-indigo-500/50' : 'bg-slate-800/50 border-slate-700'}
                        `}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300">
                                {index + 1}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className={`font-bold ${p.id === localPlayerId ? 'text-white' : 'text-slate-300'}`}>
                                        {p.name}
                                    </span>
                                    {p.isHost && <Crown size={14} className="text-yellow-500" />}
                                    {p.id === localPlayerId && <span className="text-[10px] bg-slate-700 px-1 rounded text-slate-300">YOU</span>}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {p.isReady ? (
                                <span className="flex items-center gap-1 text-emerald-400 text-sm font-bold">
                                    <CheckCircle2 size={18} /> 已准备
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-slate-500 text-sm">
                                    <Circle size={18} /> 未准备
                                </span>
                            )}
                        </div>
                    </div>
                ))}
                
                {/* Empty Slots */}
                {Array.from({ length: 6 - room.players.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="p-4 rounded-lg border border-slate-800/50 border-dashed flex items-center justify-center text-slate-600 text-sm">
                        Waiting for connection...
                    </div>
                ))}
             </div>

             {/* Controls */}
             <div className="border-t border-slate-700 pt-6 flex justify-end gap-4">
                {!isHost && (
                    <button
                        onClick={onToggleReady}
                        className={`
                            px-8 py-3 rounded-lg font-bold flex items-center gap-2 transition-all
                            ${localPlayer?.isReady 
                                ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                                : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/50'}
                        `}
                    >
                        {localPlayer?.isReady ? '取消准备' : '准备就绪'}
                    </button>
                )}

                {isHost && (
                    <button
                        onClick={onStartGame}
                        disabled={!allReady}
                        className={`
                            px-8 py-3 rounded-lg font-bold flex items-center gap-2 transition-all
                            ${allReady 
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:scale-105 shadow-lg shadow-indigo-900/50' 
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'}
                        `}
                        title={room.players.length < 3 ? "至少需要3名玩家" : !allReady ? "等待所有玩家准备" : "开始游戏"}
                    >
                        <Play size={20} fill="currentColor" /> 开始游戏
                    </button>
                )}
             </div>
        </div>
      </div>
    </div>
  );
};

export default RoomView;
