import React, { useState } from 'react';
import { Users, Play, Radio, ArrowRight, Server, globe } from 'lucide-react';

interface LobbyProps {
  playerName: string;
  setPlayerName: (name: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
}

const Lobby: React.FC<LobbyProps> = ({ playerName, setPlayerName, onCreateRoom, onJoinRoom }) => {
  const [joinId, setJoinId] = useState('');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0f1c] text-slate-100 p-4 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-900/20 via-transparent to-cyan-900/20 pointer-events-none"></div>

        <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-md p-8 rounded-2xl border border-slate-700 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-10">
            <div className="text-center mb-10">
                <h1 className="text-4xl font-tech font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 mb-2">
                    ACQUIRE: CHINA
                </h1>
                <p className="text-slate-500 uppercase tracking-[0.3em] text-xs">在线对战大厅</p>
            </div>

            <div className="space-y-6">
                {/* Name Input */}
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">玩家昵称</label>
                    <input 
                        type="text" 
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="输入你的名字..."
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-center font-bold tracking-wide"
                        maxLength={12}
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 pt-4">
                    {/* Create Room */}
                    <button 
                        onClick={onCreateRoom}
                        disabled={!playerName.trim()}
                        className="group relative flex items-center justify-center gap-3 w-full bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white p-4 rounded-xl font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-900/50"
                    >
                        <Server size={20} />
                        创建新房间
                        <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRight size={16} />
                        </div>
                    </button>

                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-slate-700"></div>
                        <span className="flex-shrink-0 mx-4 text-slate-500 text-xs">OR</span>
                        <div className="flex-grow border-t border-slate-700"></div>
                    </div>

                    {/* Join Room */}
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={joinId}
                            onChange={(e) => setJoinId(e.target.value.toUpperCase())}
                            placeholder="输入房间号 ID"
                            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg p-3 text-white text-center font-mono uppercase focus:outline-none focus:border-cyan-500"
                            maxLength={8}
                        />
                        <button 
                            onClick={() => onJoinRoom(joinId)}
                            disabled={!playerName.trim() || !joinId.trim()}
                            className="bg-slate-700 hover:bg-slate-600 text-white px-6 rounded-lg font-bold transition-colors disabled:opacity-50"
                        >
                            加入
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="mt-8 text-center">
                <p className="text-[10px] text-slate-600 flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    多人服务器运行中 (Local Sim)
                </p>
            </div>
        </div>
    </div>
  );
};

export default Lobby;
