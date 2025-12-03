import React from 'react';
import { GameState, GamePhase, CompanyId, Coordinates } from '../types';
import { getStockPrice } from '../constants';
import { Wallet, TrendingUp, Hand, SkipForward, User, AlertCircle, BookOpen, Check, X, Lock } from 'lucide-react';
import CompanyLogo from './CompanyLogo';

interface PlayerDashboardProps {
  gameState: GameState;
  localPlayerId: string;
  selectedTile: Coordinates | null;
  onSelectTile: (tile: Coordinates) => void;
  onConfirmPlacement: () => void;
  onCancelSelection: () => void;
  onBuyStock: (companyId: CompanyId) => void;
  onEndTurn: () => void;
  onOpenRules: () => void;
}

const PlayerDashboard: React.FC<PlayerDashboardProps> = ({ 
  gameState, 
  localPlayerId,
  selectedTile,
  onSelectTile, 
  onConfirmPlacement,
  onCancelSelection,
  onBuyStock,
  onEndTurn,
  onOpenRules
}) => {
  // Find "My" player data
  const myPlayer = gameState.players.find(p => p.id === localPlayerId);
  
  // Who is current?
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === localPlayerId;
  const { companies, phase, purchasedStockCount } = gameState;

  // Logic to check stock buying capability
  const canBuyStock = isMyTurn && phase === GamePhase.BUY_STOCKS && purchasedStockCount < 3;

  if (!myPlayer) return null;

  return (
    <div className={`bg-[#0f172a] border-t-2 ${isMyTurn ? 'border-indigo-500/80 shadow-[0_-5px_30px_rgba(99,102,241,0.2)]' : 'border-slate-800'} p-4 text-slate-200 transition-all duration-500`}>
      <div className="max-w-7xl mx-auto flex flex-col gap-5">
        
        {/* Header Stats */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative">
                <div className={`w-14 h-14 rounded-lg flex items-center justify-center text-indigo-400 shadow-inner border transition-colors ${isMyTurn ? 'bg-indigo-900/30 border-indigo-500' : 'bg-slate-800 border-slate-600'}`}>
                    <User size={28} />
                </div>
                <div className={`absolute -bottom-1 -right-1 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow ${isMyTurn ? 'bg-indigo-600' : 'bg-slate-600'}`}>
                    YOU
                </div>
            </div>
            
            {/* Info */}
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">{myPlayer.name}</h2>
              <div className="flex items-center gap-2 text-emerald-400 font-mono bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/50 mt-1 w-fit">
                <Wallet size={14} />
                <span className="text-lg font-bold">¥{myPlayer.cash.toLocaleString()}</span>
              </div>
            </div>
            
            {/* Turn Indicator for Multiplayer */}
            {!isMyTurn && (
                 <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded text-slate-400 border border-slate-700 ml-4 animate-pulse">
                     <Lock size={16} />
                     <span className="text-xs font-bold">等待 {currentPlayer.name} 行动...</span>
                 </div>
            )}
            
             <button
              onClick={onOpenRules}
              className="ml-4 flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded border border-slate-600 text-xs font-bold transition-colors"
            >
              <BookOpen size={14} /> 游戏规则
            </button>
          </div>
          
          {/* Phase Indicator & Controls */}
          <div className="flex items-center gap-4 ml-auto">
              <div className="flex flex-col items-end">
                 <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${phase === GamePhase.PLACE_TILE ? 'bg-yellow-400 animate-pulse' : 'bg-slate-600'}`}></div>
                    <div className={`w-2 h-2 rounded-full ${phase === GamePhase.RESOLVE_MERGE ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`}></div>
                    <div className={`w-2 h-2 rounded-full ${phase === GamePhase.BUY_STOCKS ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></div>
                 </div>
                 <div className={`px-5 py-2 rounded border transition-colors ${isMyTurn ? 'bg-slate-900 border-indigo-500/30' : 'bg-slate-900/50 border-slate-800'}`}>
                     <span className="text-slate-500 text-xs font-bold uppercase tracking-widest mr-3">当前阶段</span>
                     <span className={`font-bold font-tech tracking-wide text-sm ${isMyTurn ? 'text-white' : 'text-slate-500'}`}>
                        {phase === GamePhase.PLACE_TILE && "1. 放置板块"}
                        {phase === GamePhase.RESOLVE_MERGE && "2. 处理并购"}
                        {phase === GamePhase.BUY_STOCKS && "3. 购买股票"}
                        {phase === GamePhase.GAME_OVER && "游戏结束"}
                     </span>
                 </div>
              </div>

              {isMyTurn && phase === GamePhase.BUY_STOCKS && (
                <button
                  onClick={onEndTurn}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded font-bold shadow-lg shadow-red-900/50 transition-all active:scale-95 border border-red-400/20"
                >
                  结束回合 <SkipForward size={18} />
                </button>
              )}
          </div>
        </div>

        {/* Action Area */}
        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 ${!isMyTurn ? 'opacity-60 pointer-events-none grayscale-[0.5]' : ''}`}>
            
            {/* Hand (Tiles) - Spans 5 cols */}
            <div className={`lg:col-span-5 transition-opacity duration-300 ${phase !== GamePhase.PLACE_TILE ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                <h3 className="text-xs font-bold text-slate-400 mb-3 flex items-center justify-between uppercase tracking-wider">
                    <span className="flex items-center gap-2"><Hand size={14} className="text-yellow-500" /> 手牌 / 板块选择</span>
                    {selectedTile && (
                         <span className="text-yellow-400 animate-pulse">待确认: {selectedTile.label}</span>
                    )}
                </h3>
                
                {myPlayer.hand.length > 0 ? (
                    <div className="flex flex-col gap-3">
                         <div className="flex flex-wrap gap-2">
                            {myPlayer.hand.map((tile) => {
                                const isSelected = selectedTile?.label === tile.label;
                                return (
                                    <button
                                        key={tile.label}
                                        onClick={() => onSelectTile(tile)}
                                        className={`
                                            w-14 h-14 font-bold text-lg rounded-sm transition-all border
                                            ${isSelected 
                                                ? 'bg-yellow-500 text-black border-yellow-200 scale-110 shadow-[0_0_15px_rgba(234,179,8,0.5)] z-10' 
                                                : 'bg-slate-200 text-slate-900 border-white/50 hover:bg-yellow-100'
                                            }
                                            shadow-[0_4px_0_#94a3b8] active:shadow-none active:translate-y-[4px]
                                        `}
                                    >
                                        {tile.label}
                                    </button>
                                )
                            })}
                         </div>

                         {/* Confirmation Controls */}
                         {selectedTile && (
                             <div className="flex items-center gap-2 mt-2 p-2 bg-slate-900/60 rounded border border-slate-700 animate-in fade-in slide-in-from-left-4">
                                <button
                                    onClick={onConfirmPlacement}
                                    className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Check size={16} /> 确认放置
                                </button>
                                <button
                                    onClick={onCancelSelection}
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-2 rounded flex items-center justify-center gap-2 transition-colors"
                                >
                                    <X size={16} /> 取消
                                </button>
                             </div>
                         )}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-slate-500 text-sm italic bg-slate-900/50 p-4 rounded border border-slate-800">
                        <AlertCircle size={16} /> 无可用板块
                    </div>
                )}
                
                {phase === GamePhase.PLACE_TILE && !selectedTile && isMyTurn && (
                    <p className="text-xs text-yellow-500/80 mt-3 animate-pulse">
                        &gt; 请点击上方手牌或棋盘格子选择板块...
                    </p>
                )}
            </div>

            {/* Market (Stocks) - Spans 7 cols */}
            <div className={`lg:col-span-7 transition-opacity duration-300 ${phase !== GamePhase.BUY_STOCKS ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold text-slate-400 flex items-center gap-2 uppercase tracking-wider">
                        <TrendingUp size={14} className="text-emerald-500" /> 股票市场
                    </h3>
                    <div className="text-xs font-mono text-emerald-300 bg-emerald-900/30 border border-emerald-800 px-2 py-0.5 rounded">
                        剩余购买次数: <span className="font-bold text-white">{3 - purchasedStockCount}</span>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {Object.values(companies).map((company) => {
                        const price = getStockPrice(company.tier, company.size);
                        const canAfford = myPlayer.cash >= price;
                        const hasStock = company.availableShares > 0;
                        const isActive = company.size > 0;
                        const allowBuy = canBuyStock && canAfford && hasStock && isActive;
                        
                        return (
                            <button
                                key={company.id}
                                onClick={() => onBuyStock(company.id)}
                                disabled={!allowBuy}
                                className={`
                                    relative flex flex-col p-2.5 rounded border transition-all text-left overflow-hidden group
                                    ${isActive ? 'bg-slate-800 border-slate-600' : 'bg-slate-900 border-slate-800 opacity-40'}
                                    ${allowBuy ? 'hover:border-indigo-400 hover:bg-slate-700 cursor-pointer shadow-lg hover:shadow-indigo-500/10' : 'cursor-not-allowed opacity-60'}
                                `}
                            >
                                <div className={`absolute top-0 right-0 w-0 h-0 border-t-[20px] border-l-[20px] border-t-${company.color.replace('bg-', '')} border-l-transparent`} />
                                <div className={`absolute left-0 bottom-0 w-1 h-full ${isActive ? company.color : 'bg-slate-700'}`}></div>
                                
                                <div className="flex items-center gap-2 mb-1 w-full pl-2">
                                    <div className={`w-4 h-4 rounded-sm flex items-center justify-center ${isActive ? company.color : 'bg-slate-700'} text-white`}>
                                         <CompanyLogo companyId={company.id} className="w-3 h-3" />
                                    </div>
                                    <span className={`text-xs font-bold truncate ${company.textColor}`}>
                                        {company.name}
                                    </span>
                                </div>
                                
                                <div className="pl-2 mt-auto">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className={`text-sm font-mono font-bold ${isActive ? 'text-white' : 'text-slate-600'}`}>¥{price}</span>
                                        <span className="text-[10px] text-slate-500">剩余 {company.availableShares}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 border-t border-slate-700 pt-1 flex justify-between">
                                        <span>持有</span>
                                        <span className="text-white font-mono">{myPlayer.shares[company.id] || 0}</span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerDashboard;
