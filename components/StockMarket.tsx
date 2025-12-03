import React from 'react';
import { GameState } from '../types';
import { getStockPrice, getBonuses } from '../constants';
import { Building2, ShieldCheck, Trophy, Activity, BarChart3, Coins } from 'lucide-react';
import CompanyLogo from './CompanyLogo';

interface StockMarketProps {
  gameState: GameState;
}

const StockMarket: React.FC<StockMarketProps> = ({ gameState }) => {
  const { companies, turnLog, winnerId } = gameState;

  return (
    <div className="bg-[#0b1120] border-r border-slate-800 flex flex-col h-full overflow-hidden w-80 flex-shrink-0 relative">
      
      {/* Title */}
      <div className="p-5 bg-gradient-to-b from-slate-900 to-[#0b1120] border-b border-slate-800">
        <h1 className="text-2xl font-tech text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 font-bold flex items-center gap-2">
            <Building2 className="text-indigo-400" /> 并购 <span className="text-[10px] bg-indigo-900/50 border border-indigo-700/50 text-indigo-300 px-1.5 py-0.5 rounded tracking-wider">CHINA</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1 pl-1 tracking-widest uppercase">战略与投资模拟系统</p>
      </div>

      {/* Company List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <BarChart3 size={14} /> 上市企业概况
        </h2>
        
        {(Object.values(companies) as import('../types').Company[]).map((company) => {
          const price = getStockPrice(company.tier, company.size);
          const bonuses = getBonuses(price);
          const isSafe = company.safe;
          const isActive = company.size > 0;
          
          return (
            <div 
              key={company.id} 
              className={`
                relative p-3 rounded border transition-all duration-300 overflow-hidden
                ${isActive ? 'bg-slate-800/60 border-slate-700 shadow-lg' : 'bg-slate-900/30 border-slate-800 opacity-50 grayscale'}
              `}
            >
              {/* Background Logo Watermark */}
              <div className="absolute right-[-10px] top-[-10px] opacity-5 pointer-events-none text-slate-400">
                  <CompanyLogo companyId={company.id} className="w-24 h-24" />
              </div>

              <div className="flex justify-between items-start mb-2 relative z-10">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-md shadow-inner flex items-center justify-center ${company.color} text-white`}>
                        <CompanyLogo companyId={company.id} className="w-5 h-5" />
                    </div>
                    <span className={`text-sm font-bold ${company.textColor} tracking-wide`}>{company.name}</span>
                </div>
                {isSafe && (
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-900 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                        <ShieldCheck size={12} /> 安全
                    </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 mb-2 relative z-10">
                <div className="bg-slate-950/50 p-1.5 rounded border border-slate-800 flex justify-between items-center">
                    <span className="text-slate-500 scale-90 origin-left">规模</span>
                    <span className="font-mono text-white">{company.size}</span>
                </div>
                <div className="bg-slate-950/50 p-1.5 rounded border border-slate-800 flex justify-between items-center">
                    <span className="text-slate-500 scale-90 origin-left">股价</span>
                    <span className="font-mono text-yellow-400 font-bold">¥{price}</span>
                </div>
              </div>

               {isActive && (
                   <div className="relative z-10 flex items-center justify-between text-[10px] text-slate-500 bg-slate-900/30 px-2 py-1 rounded border border-slate-800/50">
                        <div className="flex items-center gap-1">
                            <Coins size={10} className="text-indigo-400" />
                            <span>红利:</span>
                        </div>
                        <div className="flex gap-2 font-mono">
                            <span className="text-indigo-200">大:¥{bonuses.major}</span>
                            <span className="text-cyan-200">小:¥{bonuses.minor}</span>
                        </div>
                   </div>
               )}
            </div>
          );
        })}
      </div>

      {/* Game Log */}
      <div className="h-1/3 bg-[#080c16] border-t border-slate-800 p-4 flex flex-col shadow-[0_-5px_15px_rgba(0,0,0,0.3)] z-10">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Activity size={14} /> 系统日志
        </h2>
        <div className="flex-1 overflow-y-auto custom-scrollbar text-xs font-mono space-y-1.5 pr-1">
          {turnLog.slice().reverse().map((log, i) => (
            <div key={i} className="text-slate-400 border-l-2 border-slate-800 pl-2 py-0.5 leading-relaxed hover:bg-slate-900/50 transition-colors">
              <span className="text-slate-600 mr-2 opacity-70">[{String(turnLog.length - i).padStart(2, '0')}]</span> 
              <span className={i === 0 ? 'text-indigo-300 font-bold' : ''}>{log}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Winner Overlay (if game over) */}
      {winnerId !== null && (
        <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 z-50 animate-in fade-in duration-500">
           <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mb-6 animate-bounce">
                <Trophy size={48} className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
           </div>
           <h2 className="text-4xl font-bold text-white mb-2 font-tech">游戏结束!</h2>
           <p className="text-2xl text-indigo-300 mb-8">玩家 {winnerId} 获胜!</p>
           <button 
             onClick={() => window.location.reload()}
             className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg font-bold shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95"
           >
             再来一局
           </button>
        </div>
      )}

    </div>
  );
};

export default StockMarket;