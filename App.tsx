import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  GamePhase, 
  TileState, 
  CompanyId, 
  Coordinates, 
  Player, 
  TileData,
  Company,
  Room,
  PlayerProfile,
  NetworkMessage,
  GameState
} from './types';
import { 
  GRID_ROWS, 
  GRID_COLS, 
  INITIAL_COMPANIES, 
  STARTING_CASH, 
  MAX_STOCK_PURCHASE, 
  SAFE_SIZE, 
  END_GAME_SIZE,
  getStockPrice,
  getBonuses
} from './constants';

import GameGrid from './components/GameGrid';
import PlayerDashboard from './components/PlayerDashboard';
import StockMarket from './components/StockMarket';
import CompanyLogo from './components/CompanyLogo';
import Lobby from './components/Lobby';
import RoomView from './components/RoomView';
import { 
  initNetwork, 
  broadcastMessage, 
  createRoom as createNetworkRoom, 
  handleHostRoomLogic, 
  generateId, 
  joinGameRoom,
  leaveGameRoom 
} from './utils/multiplayer';
import { Building2, X, HelpCircle, FileText, Activity, DollarSign, AlertTriangle, Coins, Wifi, WifiOff } from 'lucide-react';

const INITIAL_HAND_SIZE = 6;

// Helper to create grid
const createGrid = (): TileData[][] => {
  const grid: TileData[][] = [];
  const rows = ['A','B','C','D','E','F','G','H','I'];
  for (let r = 0; r < GRID_ROWS; r++) {
    const row: TileData[] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      row.push({
        row: r,
        col: c,
        label: `${c + 1}${rows[r]}`,
        state: TileState.EMPTY,
      });
    }
    grid.push(row);
  }
  return grid;
};

// Helper to shuffle tiles
const createDeck = (): Coordinates[] => {
  const deck: Coordinates[] = [];
  const rows = ['A','B','C','D','E','F','G','H','I'];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      deck.push({ row: r, col: c, label: `${c + 1}${rows[r]}` });
    }
  }
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

// Initialize Game State Data based on room players
const initializeGame = (roomPlayers: PlayerProfile[]) => {
    const deck = createDeck();
    const players: Player[] = [];
    
    roomPlayers.forEach((p) => {
      const hand: Coordinates[] = [];
      for (let j = 0; j < INITIAL_HAND_SIZE; j++) {
        const tile = deck.pop();
        if (tile) hand.push(tile);
      }
      players.push({
        id: p.id,
        name: p.name,
        cash: STARTING_CASH,
        shares: {} as any,
        hand,
      });
    });
    return { deck, players };
};

// --- RULES MODAL COMPONENT ---
const RulesModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-[#0f172a] w-full max-w-5xl h-[90vh] rounded-xl border border-slate-700 shadow-2xl flex flex-col relative overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-900">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
             <HelpCircle className="text-cyan-400" /> 游戏规则与帮助
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 text-slate-300 custom-scrollbar">
          
          <section>
            <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <FileText size={20} className="text-indigo-400"/> 一、游戏简介
            </h3>
            <p className="leading-relaxed">
              《并购》是一款极具策略性的资本博弈游戏。玩家通过在棋盘上放置板块来建立公司、扩张版图或引发并购。通过敏锐的眼光低买高卖股票，在公司并购中获取巨额分红，最终成为资产最雄厚的大亨。
            </p>
          </section>

          <section>
            <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <Activity size={20} className="text-yellow-400"/> 二、核心玩法流程
            </h3>
            <ol className="list-decimal list-inside space-y-4 ml-2">
              <li>
                <strong className="text-white text-lg">放置板块</strong>
                <p className="ml-5 mt-1 text-sm text-slate-400">
                  从手中选择一个板块放置到棋盘上。
                  <br/> - <strong>孤立：</strong> 若周围无其他板块，则该板块暂不属于任何公司。
                  <br/> - <strong>成立公司：</strong> 若该板块连接了其他“未上市”板块，将成立一家新公司（玩家需从库存中选择）。成立者获得 <span className="text-yellow-400">1股原始股奖励</span>。
                  <br/> - <strong>扩张：</strong> 若该板块与一家现有公司相连，则公司规模扩大。
                  <br/> - <strong>并购：</strong> 若该板块连接了两家或更多不同的公司，将引发并购。
                </p>
              </li>
              <li>
                <strong className="text-white text-lg">处理并购</strong>
                <p className="ml-5 mt-1 text-sm text-slate-400">
                  当并购发生时，<span className="text-emerald-400">规模较大</span> 的公司将吞并 <span className="text-red-400">规模较小</span> 的公司。
                  <br/> - <strong>规模相同：</strong> 由放置板块引发并购的玩家决定哪家公司留存，哪家被吞并。
                  <br/> - <strong>分红：</strong> 被吞并公司的所有股东将获得分红（大股东x10倍股价，小股东x5倍股价）。
                  <br/> - <strong>股票处理：</strong> 在本数字版本中，被并购公司的股票将<span className="text-yellow-400 font-bold">自动按当前市价出售</span>并转换为现金。
                </p>
              </li>
              <li>
                <strong className="text-white text-lg">购买股票</strong>
                <p className="ml-5 mt-1 text-sm text-slate-400">
                  放置板块后，玩家可购买任意已上市且有剩余股份（每家公司总计25股）的股票，每回合最多 <span className="text-white font-bold">3张</span>。
                </p>
              </li>
              <li>
                 <strong className="text-white text-lg">补充手牌</strong>
                 <p className="ml-5 mt-1 text-sm text-slate-400">回合结束时，系统自动从牌库补充一张板块至手牌。</p>
              </li>
            </ol>
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex items-start gap-3">
                 <div className="bg-emerald-900/50 p-2 rounded text-emerald-400"><Building2 size={20}/></div>
                 <div>
                    <strong className="text-emerald-300 block mb-1">安全公司</strong>
                    <p className="text-xs">当公司规模达到 <span className="text-white font-bold">11</span> 格或以上时，它成为“安全公司”。安全公司<span className="text-red-400">不可被并购</span>。如果一个板块会导致两家安全公司合并，则该板块视为“死棋”，不可打出。</p>
                 </div>
               </div>
               <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex items-start gap-3">
                 <div className="bg-purple-900/50 p-2 rounded text-purple-400"><AlertTriangle size={20}/></div>
                 <div>
                    <strong className="text-purple-300 block mb-1">游戏结束条件</strong>
                    <p className="text-xs">
                        1. 任意一家公司规模达到 <span className="text-white font-bold">41</span> 格。<br/>
                        2. 棋盘上所有上市公司都已成为安全公司。<br/>
                        满足任一条件时，游戏自动结束，所有股票按市价兑现，资金最多的玩家获胜。
                    </p>
                 </div>
               </div>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <DollarSign size={20} className="text-pink-400"/> 三、股价与分红表
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-700 shadow-xl">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-slate-300 font-bold h-14">
                    {/* Tier 1 Header */}
                    <th className="px-2 border-b-2 border-yellow-600 bg-gradient-to-b from-slate-800 to-slate-900 min-w-[100px]">
                      <div className="flex flex-col items-center justify-center gap-1.5 py-2">
                        <span className="text-yellow-500 font-tech uppercase text-[10px] tracking-widest">Tier I</span>
                        <div className="flex gap-2">
                             <div className="text-yellow-500 bg-yellow-900/30 p-1 rounded border border-yellow-700/50 shadow-lg" title="黄山纸业">
                                <CompanyLogo companyId={CompanyId.HuangShan} className="w-5 h-5"/>
                             </div>
                             <div className="text-blue-400 bg-blue-900/30 p-1 rounded border border-blue-700/50 shadow-lg" title="蓝天纺织">
                                <CompanyLogo companyId={CompanyId.BlueSky} className="w-5 h-5"/>
                             </div>
                        </div>
                      </div>
                    </th>
                    
                    {/* Tier 2 Header */}
                    <th className="px-2 border-b-2 border-orange-600 bg-gradient-to-b from-slate-800 to-slate-900 min-w-[120px]">
                      <div className="flex flex-col items-center justify-center gap-1.5 py-2">
                        <span className="text-orange-500 font-tech uppercase text-[10px] tracking-widest">Tier II</span>
                        <div className="flex gap-2">
                             <div className="text-orange-500 bg-orange-900/30 p-1 rounded border border-orange-700/50 shadow-lg" title="朝阳五金">
                                <CompanyLogo companyId={CompanyId.ChaoYang} className="w-5 h-5"/>
                             </div>
                             <div className="text-red-500 bg-red-900/30 p-1 rounded border border-red-700/50 shadow-lg" title="红旗造船">
                                <CompanyLogo companyId={CompanyId.RedFlag} className="w-5 h-5"/>
                             </div>
                             <div className="text-purple-400 bg-purple-900/30 p-1 rounded border border-purple-700/50 shadow-lg" title="紫金仪表">
                                <CompanyLogo companyId={CompanyId.ZiJin} className="w-5 h-5"/>
                             </div>
                        </div>
                      </div>
                    </th>
                    
                    {/* Tier 3 Header */}
                    <th className="px-2 border-b-2 border-emerald-600 bg-gradient-to-b from-slate-800 to-slate-900 min-w-[100px]">
                      <div className="flex flex-col items-center justify-center gap-1.5 py-2">
                        <span className="text-emerald-500 font-tech uppercase text-[10px] tracking-widest">Tier III</span>
                        <div className="flex gap-2">
                             <div className="text-emerald-400 bg-emerald-900/30 p-1 rounded border border-emerald-700/50 shadow-lg" title="核能重工">
                                <CompanyLogo companyId={CompanyId.Nuclear} className="w-5 h-5"/>
                             </div>
                             <div className="text-cyan-400 bg-cyan-900/30 p-1 rounded border border-cyan-700/50 shadow-lg" title="橡树日化">
                                <CompanyLogo companyId={CompanyId.Oak} className="w-5 h-5"/>
                             </div>
                        </div>
                      </div>
                    </th>

                    <th className="p-2 border-b border-slate-700 bg-slate-800 text-slate-400">股票价格</th>
                    <th className="p-2 border-b border-slate-700 bg-slate-800 text-indigo-300">大股东红利<br/><span className="text-[9px] opacity-70">(10x)</span></th>
                    <th className="p-2 border-b border-slate-700 bg-slate-800 text-cyan-300">小股东红利<br/><span className="text-[9px] opacity-70">(5x)</span></th>
                  </tr>
                </thead>
                <tbody className="font-mono bg-slate-800/30 divide-y divide-slate-700 text-slate-400">
                  <tr className="hover:bg-white/5 transition-colors"><td>2</td><td>-</td><td>-</td><td className="text-white font-bold">$200</td><td>$2,000</td><td>$1,000</td></tr>
                  <tr className="hover:bg-white/5 transition-colors"><td>3</td><td>2</td><td>-</td><td className="text-white font-bold">$300</td><td>$3,000</td><td>$1,500</td></tr>
                  <tr className="hover:bg-white/5 transition-colors"><td>4</td><td>3</td><td>2</td><td className="text-white font-bold">$400</td><td>$4,000</td><td>$2,000</td></tr>
                  <tr className="hover:bg-white/5 transition-colors"><td>5</td><td>4</td><td>3</td><td className="text-white font-bold">$500</td><td>$5,000</td><td>$2,500</td></tr>
                  <tr className="hover:bg-white/5 transition-colors"><td>6 - 10</td><td>5</td><td>4</td><td className="text-white font-bold">$600</td><td>$6,000</td><td>$3,000</td></tr>
                  <tr className="hover:bg-white/5 transition-colors"><td>11 - 20</td><td>6 - 10</td><td>5</td><td className="text-white font-bold">$700</td><td>$7,000</td><td>$3,500</td></tr>
                  <tr className="hover:bg-white/5 transition-colors"><td>21 - 30</td><td>11 - 20</td><td>6 - 10</td><td className="text-white font-bold">$800</td><td>$8,000</td><td>$4,000</td></tr>
                  <tr className="hover:bg-white/5 transition-colors"><td>31 - 40</td><td>21 - 30</td><td>11 - 20</td><td className="text-white font-bold">$900</td><td>$9,000</td><td>$4,500</td></tr>
                  <tr className="hover:bg-white/5 transition-colors"><td>41 +</td><td>31 - 40</td><td>21 - 30</td><td className="text-white font-bold">$1,000</td><td>$10,000</td><td>$5,000</td></tr>
                  <tr className="hover:bg-white/5 transition-colors"><td>-</td><td>41 +</td><td>31 - 40</td><td className="text-white font-bold">$1,100</td><td>$11,000</td><td>$5,500</td></tr>
                  <tr className="hover:bg-white/5 transition-colors"><td>-</td><td>-</td><td>41 +</td><td className="text-white font-bold">$1,200</td><td>$12,000</td><td>$6,000</td></tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700 text-sm text-slate-400 space-y-2">
                <h4 className="font-bold text-white flex items-center gap-2"><CoinsIcon size={16} className="text-yellow-500"/> 特殊分红情况说明：</h4>
                <ul className="list-disc list-inside ml-2 space-y-1 text-xs">
                    <li><strong className="text-indigo-300">独占股东：</strong> 若只有一位股东，该玩家独占大股东和小股东红利（合计15倍股价）。</li>
                    <li><strong className="text-indigo-300">大股东并列：</strong> 若两位或多位玩家持股数相同且最多，他们平分（大股东+小股东红利）的总和。次级股东无收益。</li>
                    <li><strong className="text-cyan-300">小股东并列：</strong> 若大股东确定，但有多位玩家并列第二持股，则这些玩家平分小股东红利。</li>
                </ul>
            </div>
          </section>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-900 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-bold transition-colors border border-slate-600 hover:border-slate-500"
          >
            关闭规则
          </button>
        </div>
      </div>
    </div>
  );
}

// Icon helper
const CoinsIcon = ({ size, className }: { size: number, className?: string }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="8" cy="8" r="6" />
      <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
      <path d="M7 6h1v4" />
      <path d="m16.71 13.88.7.71-2.82 2.82" />
    </svg>
);

type AppMode = 'LOBBY' | 'ROOM' | 'GAME';

const App: React.FC = () => {
  // --- Multiplayer State ---
  const [appMode, setAppMode] = useState<AppMode>('LOBBY');
  const [localPlayerId] = useState<string>(generateId());
  const [localPlayerName, setLocalPlayerName] = useState('玩家1');
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const lastHeartbeat = useRef<Record<string, number>>({});

  // --- Game State ---
  // Note: These are initialized empty/default and populated when Game Starts
  const [grid, setGrid] = useState<TileData[][]>(createGrid);
  const [deck, setDeck] = useState<Coordinates[]>([]);
  const [companies, setCompanies] = useState<Record<CompanyId, Company>>(INITIAL_COMPANIES as Record<CompanyId, Company>);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [phase, setPhase] = useState<GamePhase>(GamePhase.PLACE_TILE);
  const [turnLog, setTurnLog] = useState<string[]>([]);
  const [lastPlacedTile, setLastPlacedTile] = useState<Coordinates | null>(null);
  const [purchasedStockCount, setPurchasedStockCount] = useState(0);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  
  // UI States
  const [selectedTile, setSelectedTile] = useState<Coordinates | null>(null);
  const [pendingNewCorp, setPendingNewCorp] = useState<{row: number, col: number} | null>(null);
  const [showRules, setShowRules] = useState(false);

  // --- Network Handler ---
  useEffect(() => {
    initNetwork((msg: NetworkMessage) => {
        // Handle Global Network Messages
        switch (msg.type) {
            case 'PLAYER_DISCONNECTED':
                 const pId = msg.payload.playerId;
                 console.log(`[App] Player Disconnected: ${pId}`);
                 
                 if (currentRoom && currentRoom.id === msg.roomId) {
                     // 1. If I am host, remove the player
                     if (currentRoom.hostId === localPlayerId) {
                         const updatedRoom = handleHostRoomLogic(currentRoom, {
                             type: 'UPDATE_ROOM',
                             roomId: msg.roomId,
                             senderId: pId,
                             payload: { left: true }
                         }, localPlayerId);
                         
                         if (updatedRoom) {
                             setCurrentRoom(updatedRoom);
                             broadcastMessage({
                                 type: 'SYNC_STATE',
                                 roomId: currentRoom.id,
                                 senderId: localPlayerId,
                                 payload: { room: updatedRoom }
                             });
                         }
                     }
                     // 2. If Host Disconnected -> Host Migration
                     else if (pId === currentRoom.hostId) {
                         const remainingPlayers = currentRoom.players.filter(p => p.id !== pId);
                         if (remainingPlayers.length > 0) {
                             const newHost = remainingPlayers[0];
                             if (newHost.id === localPlayerId) {
                                 const myProfile = { ...newHost, isHost: true, isReady: true };
                                 const updatedPlayers = remainingPlayers.map(p => 
                                     p.id === localPlayerId ? myProfile : p
                                 );
                                 const newRoomState: Room = {
                                     ...currentRoom,
                                     hostId: localPlayerId,
                                     players: updatedPlayers
                                 };
                                 setCurrentRoom(newRoomState);
                                 broadcastMessage({
                                     type: 'SYNC_STATE',
                                     roomId: currentRoom.id,
                                     senderId: localPlayerId,
                                     payload: { room: newRoomState }
                                 });
                             }
                         } else {
                             setCurrentRoom(null);
                             setAppMode('LOBBY');
                         }
                     }
                 }
                 break;

            case 'JOIN_ROOM':
            case 'UPDATE_ROOM':
                // Debug log to verify state availability
                console.log('[App] Received Room Update:', msg, 'Current Room:', currentRoom);
                if (currentRoom && currentRoom.id === msg.roomId) {
                     // If I am host, I calculate the new room state and broadcast it back
                     if (currentRoom.hostId === localPlayerId) {
                         const updatedRoom = handleHostRoomLogic(currentRoom, msg, localPlayerId);
                         if (updatedRoom) {
                             setCurrentRoom(updatedRoom);
                             broadcastMessage({
                                 type: 'SYNC_STATE',
                                 roomId: currentRoom.id,
                                 senderId: localPlayerId,
                                 payload: { room: updatedRoom }
                             });
                         }
                     }
                }
                break;

            case 'SYNC_STATE':
                 if (msg.roomId === currentRoom?.id || (!currentRoom && msg.payload.room?.players.some((p:PlayerProfile) => p.id === localPlayerId))) {
                     if (msg.payload.room) {
                         setCurrentRoom(msg.payload.room);
                         // If I was in Lobby and just got added to a room (latency), switch to ROOM
                         if (appMode === 'LOBBY') setAppMode('ROOM');
                     }
                     
                     // Game State Sync
                     if (msg.payload.gameState) {
                         const gs = msg.payload.gameState as GameState;
                         setGrid(gs.grid);
                         setCompanies(gs.companies);
                         setPlayers(gs.players);
                         setCurrentPlayerIndex(gs.currentPlayerIndex);
                         setPhase(gs.phase);
                         setTurnLog(gs.turnLog);
                         setLastPlacedTile(gs.lastPlacedTile);
                         setPurchasedStockCount(gs.purchasedStockCount);
                         setWinnerId(gs.winnerId);
                         setDeck(gs.deck);
                         
                         if (appMode !== 'GAME') setAppMode('GAME');
                     }
                 }
                 break;

            case 'START_GAME':
                 if (msg.roomId === currentRoom?.id) {
                     // Note: Ideally host sends the initialized state. 
                     if (msg.payload) {
                         const gs = msg.payload as GameState;
                         setGrid(gs.grid);
                         setCompanies(gs.companies);
                         setPlayers(gs.players);
                         setCurrentPlayerIndex(gs.currentPlayerIndex);
                         setPhase(gs.phase);
                         setTurnLog(gs.turnLog);
                         setDeck(gs.deck);
                         setAppMode('GAME');
                     }
                 }
                 break;

            case 'HEARTBEAT':
                 if (msg.roomId === currentRoom?.id) {
                     lastHeartbeat.current[msg.senderId] = Date.now();
                 }
                 break;
        }
    }, (connected) => {
        setIsConnected(connected);
    });
  }, [currentRoom, localPlayerId, appMode]);

  // Heartbeat Loop
  useEffect(() => {
      if (!currentRoom || !isConnected) return;

      const timer = setInterval(() => {
          broadcastMessage({
              type: 'HEARTBEAT',
              roomId: currentRoom.id,
              senderId: localPlayerId,
              payload: {}
          });
      }, 2000);

      return () => clearInterval(timer);
  }, [currentRoom, isConnected, localPlayerId]);

  // Heartbeat Check Loop
  useEffect(() => {
      if (!currentRoom || !isConnected) return;

      const checkTimer = setInterval(() => {
          const now = Date.now();
          
          if (currentRoom.hostId !== localPlayerId) {
              const hostLastSeen = lastHeartbeat.current[currentRoom.hostId];
              
              if (hostLastSeen && now - hostLastSeen > 10000) {
                  console.warn("Host Heartbeat Timeout!");
                  
                  const remainingPlayers = currentRoom.players.filter(p => p.id !== currentRoom.hostId);
                  if (remainingPlayers.length > 0) {
                      const newHost = remainingPlayers[0];
                      if (newHost.id === localPlayerId) {
                           console.log("Host timed out. I am taking over.");
                           const myProfile = { ...newHost, isHost: true, isReady: true };
                           const updatedPlayers = remainingPlayers.map(p => 
                               p.id === localPlayerId ? myProfile : p
                           );
                           const newRoomState: Room = {
                               ...currentRoom,
                               hostId: localPlayerId,
                               players: updatedPlayers
                           };
                           setCurrentRoom(newRoomState);
                           broadcastMessage({
                               type: 'SYNC_STATE',
                               roomId: currentRoom.id,
                               senderId: localPlayerId,
                               payload: { room: newRoomState }
                           });
                      }
                  } else {
                      setCurrentRoom(null);
                      setAppMode('LOBBY');
                  }
              }
          }
      }, 1000);
      
      return () => clearInterval(checkTimer);
  }, [currentRoom, isConnected, localPlayerId]);

  // Helper to sync game state to other players (Only current player or host should trigger this)
  const syncGameState = (overrideState?: Partial<GameState>) => {
      if (!currentRoom) return;
      const currentState: GameState = {
          grid, companies, players, currentPlayerIndex, phase, turnLog, 
          lastPlacedTile, purchasedStockCount, winnerId, deck
      };
      const finalState = { ...currentState, ...overrideState };
      
      broadcastMessage({
          type: 'SYNC_STATE',
          roomId: currentRoom.id,
          senderId: localPlayerId,
          payload: { gameState: finalState }
      });
  };

  const addLog = (msg: string) => {
    // We update log locally, but usually this is part of state sync
    const newLogs = [...turnLog, msg];
    setTurnLog(newLogs);
    return newLogs;
  };

  // --- Multiplayer Actions ---

  const handleCreateRoom = () => {
      const me: PlayerProfile = {
          id: localPlayerId,
          name: localPlayerName,
          isReady: true, // Host is always ready?
          isHost: true,
          joinedAt: Date.now()
      };
      const room = createNetworkRoom(me);
      // IMPORTANT: Explicitly join the websocket channel
      joinGameRoom(room.id, localPlayerId);
      
      setCurrentRoom(room);
      setAppMode('ROOM');
  };

  const handleJoinRoom = (roomId: string) => {
      const me: PlayerProfile = {
          id: localPlayerId,
          name: localPlayerName,
          isReady: false,
          isHost: false,
          joinedAt: Date.now()
      };
      
      // Explicitly join websocket channel
      joinGameRoom(roomId, localPlayerId);
      
      // Optimistically wait for state sync
      broadcastMessage({
          type: 'JOIN_ROOM',
          roomId: roomId,
          senderId: localPlayerId,
          payload: me
      });
  };

  const handleToggleReady = () => {
      if (!currentRoom) return;
      const me = currentRoom.players.find(p => p.id === localPlayerId);
      if (me) {
           broadcastMessage({
               type: 'UPDATE_ROOM',
               roomId: currentRoom.id,
               senderId: localPlayerId,
               payload: { isReady: !me.isReady }
           });
      }
  };

  const handleStartGame = () => {
      if (!currentRoom || currentRoom.hostId !== localPlayerId) return;
      
      // Initialize Logic (Host Side)
      const { deck: initDeck, players: initPlayers } = initializeGame(currentRoom.players);
      
      const initialState: GameState = {
          grid: createGrid(),
          companies: INITIAL_COMPANIES,
          players: initPlayers,
          currentPlayerIndex: 0,
          phase: GamePhase.PLACE_TILE,
          turnLog: ['游戏开始！欢迎来到《并购》在线版。', `轮到 ${initPlayers[0].name} 了。`],
          lastPlacedTile: null,
          purchasedStockCount: 0,
          winnerId: null,
          deck: initDeck
      };

      // Set Local State
      setGrid(initialState.grid);
      setCompanies(initialState.companies);
      setPlayers(initialState.players);
      setCurrentPlayerIndex(initialState.currentPlayerIndex);
      setPhase(initialState.phase);
      setTurnLog(initialState.turnLog);
      setDeck(initialState.deck);
      setAppMode('GAME');

      // Broadcast Start
      broadcastMessage({
          type: 'START_GAME',
          roomId: currentRoom.id,
          senderId: localPlayerId,
          payload: initialState
      });
  };

  const handleLeaveRoom = () => {
      if (currentRoom) {
          // If I am host, assign new host before leaving
          if (currentRoom.hostId === localPlayerId && currentRoom.players.length > 1) {
              const remainingPlayers = currentRoom.players.filter(p => p.id !== localPlayerId);
              const newHost = remainingPlayers[0]; // Earliest joined
              const updatedPlayers = remainingPlayers.map(p => 
                  p.id === newHost.id 
                      ? { ...p, isHost: true, isReady: true } 
                      : p
              );
              
              const updatedRoom: Room = {
                  ...currentRoom,
                  hostId: newHost.id,
                  players: updatedPlayers
              };

              // Broadcast the new state so everyone knows the new host
              broadcastMessage({
                  type: 'SYNC_STATE',
                  roomId: currentRoom.id,
                  senderId: localPlayerId,
                  payload: { room: updatedRoom }
              });
          }

          broadcastMessage({
            type: 'UPDATE_ROOM',
            roomId: currentRoom.id,
            senderId: localPlayerId,
            payload: { left: true }
          });
          leaveGameRoom(currentRoom.id);
      }
      setCurrentRoom(null);
      setAppMode('LOBBY');
  };

  // --- Core Game Logic Wrappers (that trigger Sync) ---

  const isMyTurn = () => {
      if (appMode !== 'GAME' || !players.length) return false;
      return players[currentPlayerIndex].id === localPlayerId;
  };

  const getNeighbors = (row: number, col: number) => {
    const neighbors: TileData[] = [];
    if (row > 0) neighbors.push(grid[row - 1][col]);
    if (row < GRID_ROWS - 1) neighbors.push(grid[row + 1][col]);
    if (col > 0) neighbors.push(grid[row][col - 1]);
    if (col < GRID_COLS - 1) neighbors.push(grid[row][col + 1]);
    return neighbors;
  };

  const checkTileDead = (r: number, c: number, gridState: TileData[][], companiesState: Record<CompanyId, Company>) => {
      const neighbors = [];
      if (r > 0) neighbors.push(gridState[r - 1][c]);
      if (r < GRID_ROWS - 1) neighbors.push(gridState[r + 1][c]);
      if (c > 0) neighbors.push(gridState[r][c - 1]);
      if (c < GRID_COLS - 1) neighbors.push(gridState[r][c + 1]);
      
      const occupied = neighbors.filter(n => n.state !== TileState.EMPTY);
      
      // 1. Check Safe Merge (Merging 2 or more SAFE corporations)
      const neighborCorps = new Set<CompanyId>();
      occupied.forEach(n => {
          if (n.companyId) neighborCorps.add(n.companyId);
      });
      
      const distinctCorps = Array.from(neighborCorps).map(id => companiesState[id]);
      const safeCorps = distinctCorps.filter(c => c.safe);
      
      if (safeCorps.length >= 2) return true; // Dead: Merges two safe corps
      
      // 2. Check New Corp creation if max corps reached
      if (distinctCorps.length === 0 && occupied.length > 0) {
          const availableCount = (Object.values(companiesState) as Company[]).filter(c => c.size === 0).length;
          if (availableCount === 0) return true; // Dead: Cannot form new corp because all are taken
      }
      
      return false;
  };

  const handleSelectTile = (tile: Coordinates) => {
    if (!isMyTurn()) return;
    if (phase !== GamePhase.PLACE_TILE) return;
    setSelectedTile(tile);
  };

  const handleCancelSelection = () => {
    setSelectedTile(null);
  };

  const confirmPlacement = () => {
    if (!isMyTurn()) return;
    if (phase !== GamePhase.PLACE_TILE || !selectedTile) return;

    const tile = selectedTile;
    const { row, col, label } = tile;
    
    // Check neighbors
    const neighbors = getNeighbors(row, col);
    const occupiedNeighbors = neighbors.filter(n => n.state !== TileState.EMPTY);
    
    const neighboringCompanies = new Set<CompanyId>();
    occupiedNeighbors.forEach(n => {
      if (n.companyId) neighboringCompanies.add(n.companyId);
    });

    const uniqueCompanyIds = Array.from(neighboringCompanies);

    // 1. Singleton Placement
    if (occupiedNeighbors.length === 0) {
      placeTileSimple(row, col, TileState.UNINCORPORATED, undefined);
      endPlacementPhase(tile);
      return;
    }

    // 2. Form New Corp (Neighbors are unincorporated)
    if (uniqueCompanyIds.length === 0 && occupiedNeighbors.length > 0) {
      // Check if any corporations are available
      const availableCorps = (Object.values(companies) as Company[]).filter(c => c.size === 0);
      if (availableCorps.length === 0) {
        // Logic handled by dead tile check mostly, but fallback:
        return; 
      }
      setPendingNewCorp({ row, col });
      return;
    }

    // 3. Grow Corp (Only 1 unique company neighbor)
    if (uniqueCompanyIds.length === 1) {
      const companyId = uniqueCompanyIds[0];
      growCorporation(companyId, row, col);
      endPlacementPhase(tile);
      return;
    }

    // 4. Merge (2+ unique companies)
    if (uniqueCompanyIds.length > 1) {
      const involvedCorps = uniqueCompanyIds.map(id => companies[id]) as Company[];
      
      const safeCorps = involvedCorps.filter(c => c.safe);
      if (safeCorps.length > 1) {
        // Should be dead tile
        return;
      }

      involvedCorps.sort((a, b) => b.size - a.size);
      
      const survivor = involvedCorps[0];
      const defuncts = involvedCorps.slice(1);

      performMerge(survivor, defuncts, row, col);
      endPlacementPhase(tile);
    }
  };

  const createCorporation = (companyId: CompanyId) => {
    if (!pendingNewCorp) return;
    const { row, col } = pendingNewCorp;
    const tileLabel = grid[row][col].label;
    
    const neighbors = getNeighbors(row, col).filter(n => n.state === TileState.UNINCORPORATED);

    const newGrid = [...grid];
    newGrid[row][col] = { ...newGrid[row][col], state: TileState.CORP, companyId };
    
    neighbors.forEach(n => {
      newGrid[n.row][n.col] = { ...newGrid[n.row][n.col], state: TileState.CORP, companyId };
    });

    const newSize = neighbors.length + 1;
    const isSafe = newSize >= SAFE_SIZE;

    const updatedCompanies = {
      ...companies,
      [companyId]: { ...companies[companyId], size: newSize, safe: isSafe }
    };
    
    // Bonus Share Logic
    let updatedPlayers = [...players];
    const playerIndex = currentPlayerIndex;
    const player = updatedPlayers[playerIndex];
    
    let logMsg = `${player.name} 成立了 ${updatedCompanies[companyId].name}`;

    if (updatedCompanies[companyId].availableShares > 0) {
      updatedCompanies[companyId].availableShares -= 1;
      const p = { ...updatedPlayers[playerIndex] };
      p.shares = { ...p.shares, [companyId]: (p.shares[companyId] || 0) + 1 };
      updatedPlayers[playerIndex] = p;
      logMsg += ` 并获得 1 股原始股奖励。`;
    }

    setGrid(newGrid);
    setCompanies(updatedCompanies);
    setPlayers(updatedPlayers);
    const newLogs = addLog(logMsg);

    setPendingNewCorp(null);
    endPlacementPhase({ row, col, label: tileLabel }, newGrid, updatedCompanies, updatedPlayers, newLogs); 
  };

  const placeTileSimple = (row: number, col: number, state: TileState, companyId?: CompanyId) => {
    const newGrid = [...grid];
    newGrid[row][col] = { ...newGrid[row][col], state, companyId };
    setGrid(newGrid);
    // Don't sync here, sync in endPlacementPhase
  };

  const growCorporation = (companyId: CompanyId, row: number, col: number) => {
    const newGrid = [...grid];
    const tileLabel = grid[row][col].label;
    
    const tilesToAdd: Coordinates[] = [{ row, col, label: tileLabel }];
    const processed = new Set<string>();
    const queue: Coordinates[] = [{row, col, label: tileLabel }];

    while(queue.length > 0) {
      const current = queue.pop()!;
      const key = `${current.row},${current.col}`;
      if(processed.has(key)) continue;
      processed.add(key);

      const neighbors = getNeighbors(current.row, current.col);
      neighbors.forEach(n => {
        if (n.state === TileState.UNINCORPORATED && !processed.has(`${n.row},${n.col}`)) {
          tilesToAdd.push({ row: n.row, col: n.col, label: n.label });
          queue.push({ row: n.row, col: n.col, label: n.label });
        }
      });
    }

    tilesToAdd.forEach(t => {
      newGrid[t.row][t.col] = { ...newGrid[t.row][t.col], state: TileState.CORP, companyId };
    });
    setGrid(newGrid);

    const newSize = companies[companyId].size + tilesToAdd.length;
    const updatedCompanies = {
        ...companies,
        [companyId]: { ...companies[companyId], size: newSize, safe: newSize >= SAFE_SIZE }
    };
    setCompanies(updatedCompanies);

    addLog(`扩张了 ${companies[companyId].name} 的版图。`);
  };

  const distributeBonuses = (company: Company, playersSnapshot: Player[]) => {
      const { major, minor } = getBonuses(getStockPrice(company.tier, company.size));
      
      const holders = playersSnapshot
          .map(p => ({ id: p.id, name: p.name, count: p.shares[company.id] || 0 }))
          .filter(h => h.count > 0)
          .sort((a, b) => b.count - a.count);

      if (holders.length === 0) return playersSnapshot;

      let newPlayers = [...playersSnapshot];
      const logDetails: string[] = [];

      const maxShares = holders[0].count;
      const majorityWinners = holders.filter(h => h.count === maxShares);

      if (majorityWinners.length > 1) {
          const totalBonus = major + minor;
          const splitAmount = Math.ceil(totalBonus / majorityWinners.length); 
          
          majorityWinners.forEach(winner => {
              newPlayers = newPlayers.map(p => 
                  p.id === winner.id ? { ...p, cash: p.cash + splitAmount } : p
              );
              logDetails.push(`${winner.name} (并列大股东 +¥${splitAmount})`);
          });
      } else {
          const winner = majorityWinners[0];
          newPlayers = newPlayers.map(p => 
              p.id === winner.id ? { ...p, cash: p.cash + major } : p
          );
          logDetails.push(`${winner.name} (大股东 +¥${major})`);

          const remainingHolders = holders.filter(h => h.count < maxShares);
          if (remainingHolders.length > 0) {
              const secondMax = remainingHolders[0].count;
              const minorityWinners = remainingHolders.filter(h => h.count === secondMax);
              
              const splitAmount = Math.ceil(minor / minorityWinners.length);
              minorityWinners.forEach(winner => {
                  newPlayers = newPlayers.map(p => 
                      p.id === winner.id ? { ...p, cash: p.cash + splitAmount } : p
                  );
                  logDetails.push(`${winner.name} (小股东 +¥${splitAmount})`);
              });
          } else {
               newPlayers = newPlayers.map(p => 
                  p.id === winner.id ? { ...p, cash: p.cash + minor } : p
              );
              logDetails.push(`${winner.name} (独占小股东红利 +¥${minor})`);
          }
      }
      
      addLog(`分红 ${company.name}: ${logDetails.join(', ')}`);
      return newPlayers;
  };

  const performMerge = (survivor: Company, defuncts: Company[], row: number, col: number) => {
    let currentPlayers = [...players];

    defuncts.forEach(defunct => {
      addLog(`并购发生: ${survivor.name} 收购了 ${defunct.name}。`);
      
      currentPlayers = distributeBonuses(defunct, currentPlayers);
      
      const price = getStockPrice(defunct.tier, defunct.size);

      currentPlayers = currentPlayers.map(p => {
          const count = p.shares[defunct.id] || 0;
          if (count > 0) {
              const payout = count * price;
              addLog(`${p.name} 出售 ${count} 股 ${defunct.name} (获利 ¥${payout})`);
              return {
                  ...p,
                  cash: p.cash + payout,
                  shares: { ...p.shares, [defunct.id]: 0 }
              };
          }
          return p;
      });

      setCompanies(prev => ({
        ...prev,
        [defunct.id]: { ...prev[defunct.id], size: 0, safe: false, availableShares: 25 }
      }));
    });
    
    setPlayers(currentPlayers);

    const newGrid = [...grid];
    
    for(let r=0; r<GRID_ROWS; r++) {
      for(let c=0; c<GRID_COLS; c++) {
        const cell = newGrid[r][c];
        const isDefunct = defuncts.some(d => d.id === cell.companyId);
        if (isDefunct) {
           newGrid[r][c] = { ...cell, companyId: survivor.id };
        }
      }
    }
    newGrid[row][col] = { ...newGrid[row][col], state: TileState.CORP, companyId: survivor.id };
    
    let newSize = 0;
    for(let r=0; r<GRID_ROWS; r++) {
      for(let c=0; c<GRID_COLS; c++) {
        if (newGrid[r][c].companyId === survivor.id) newSize++;
      }
    }
    
    setGrid(newGrid);
    setCompanies(prev => ({
        ...prev,
        [survivor.id]: { ...prev[survivor.id], size: newSize, safe: newSize >= SAFE_SIZE }
    }));
  };

  // Modified to accept state overrides for syncing
  const endPlacementPhase = (
      tile: Coordinates, 
      overrideGrid?: TileData[][], 
      overrideCompanies?: Record<CompanyId, Company>,
      overridePlayers?: Player[],
      overrideLogs?: string[]
  ) => {
    
    const finalPlayers = overridePlayers || [...players];
    const currentPlayer = { ...finalPlayers[currentPlayerIndex] };
    
    // Remove tile from hand
    currentPlayer.hand = currentPlayer.hand.filter(t => t.label !== tile.label);
    finalPlayers[currentPlayerIndex] = currentPlayer;

    setPlayers(finalPlayers);
    setLastPlacedTile(tile);
    setSelectedTile(null);
    setPhase(GamePhase.BUY_STOCKS);
    setPurchasedStockCount(0);
    const newLogs = overrideLogs || addLog('请购买股票（最多3张）。');

    // SYNC HERE
    syncGameState({
        grid: overrideGrid || grid,
        companies: overrideCompanies || companies,
        players: finalPlayers,
        phase: GamePhase.BUY_STOCKS,
        lastPlacedTile: tile,
        purchasedStockCount: 0,
        turnLog: newLogs
    });
  };

  const handleBuyStock = (companyId: CompanyId) => {
    if (!isMyTurn()) return;
    if (purchasedStockCount >= MAX_STOCK_PURCHASE) return;
    
    const company = companies[companyId];
    if (company.size === 0 || company.availableShares === 0) return;

    const price = getStockPrice(company.tier, company.size);
    const player = players[currentPlayerIndex];

    if (player.cash >= price) {
      const updatedPlayers = [...players];
      const p = { ...updatedPlayers[currentPlayerIndex] };
      p.cash -= price;
      p.shares = { ...p.shares, [companyId]: (p.shares[companyId] || 0) + 1 };
      updatedPlayers[currentPlayerIndex] = p;

      setPlayers(updatedPlayers);
      
      const updatedCompanies = {
        ...companies,
        [companyId]: { ...company, availableShares: company.availableShares - 1 }
      };
      setCompanies(updatedCompanies);

      setPurchasedStockCount(prev => prev + 1);
      const newLogs = addLog(`${player.name} 购买了 ${company.name} (¥${price})`);

      // SYNC
      syncGameState({
          players: updatedPlayers,
          companies: updatedCompanies,
          purchasedStockCount: purchasedStockCount + 1,
          turnLog: newLogs
      });
    }
  };

  const performGameEnd = () => {
      let finalPlayers = [...players];
      addLog("=== 正在结算游戏资产 ===");

      (Object.values(companies) as Company[]).forEach(company => {
          if (company.size > 0) {
              finalPlayers = distributeBonuses(company, finalPlayers);
              const price = getStockPrice(company.tier, company.size);
              finalPlayers = finalPlayers.map(p => {
                  const count = p.shares[company.id] || 0;
                  if (count > 0) {
                      const payout = count * price;
                      return { 
                          ...p, 
                          cash: p.cash + payout, 
                          shares: { ...p.shares, [company.id]: 0 } 
                      };
                  }
                  return p;
              });
          }
      });

      finalPlayers.sort((a, b) => b.cash - a.cash);
      const winner = finalPlayers[0];

      setPlayers(finalPlayers);
      setWinnerId(winner.id);
      setPhase(GamePhase.GAME_OVER);
      const newLogs = addLog(`游戏结束！获胜者是 ${winner.name} (总资产 ¥${winner.cash})`);

      // Sync End Game
      syncGameState({
          players: finalPlayers,
          winnerId: winner.id,
          phase: GamePhase.GAME_OVER,
          turnLog: newLogs
      });
  };

  const handleEndTurn = () => {
    if (!isMyTurn()) return;

    // 1. Check for Game End
    const activeCompanies = (Object.values(companies) as Company[]).filter(c => c.size > 0);
    const conditionSize = activeCompanies.some(c => c.size >= END_GAME_SIZE);
    const conditionAllSafe = activeCompanies.length > 0 && activeCompanies.every(c => c.safe);
    
    if (conditionSize || conditionAllSafe) {
        performGameEnd();
        return;
    }

    // 2. Draw Tile
    let newDeck = [...deck];
    let tileDrawn = false;
    let nextTile: Coordinates | undefined;
    
    while (newDeck.length > 0) {
        const candidate = newDeck.pop()!;
        if (!checkTileDead(candidate.row, candidate.col, grid, companies)) {
            nextTile = candidate;
            tileDrawn = true;
            break;
        } else {
            addLog(`${players[currentPlayerIndex].name} 抽到不可放入板块 ${candidate.label}，已经自动更换。`);
        }
    }
    
    setDeck(newDeck);
    
    let updatedPlayers = [...players];
    if (tileDrawn && nextTile) {
        const p = { ...updatedPlayers[currentPlayerIndex] };
        p.hand = [...p.hand, nextTile];
        updatedPlayers[currentPlayerIndex] = p;
    } else if (!tileDrawn) {
        addLog("牌库已空，无法补充新板块。");
    }
    setPlayers(updatedPlayers);

    // Next Player
    const nextIndex = (currentPlayerIndex + 1) % players.length;
    setCurrentPlayerIndex(nextIndex);
    setPhase(GamePhase.PLACE_TILE);
    const newLogs = addLog(`轮到 ${players[nextIndex].name} 了。`);

    // Sync End Turn
    syncGameState({
        deck: newDeck,
        players: updatedPlayers,
        currentPlayerIndex: nextIndex,
        phase: GamePhase.PLACE_TILE,
        turnLog: newLogs
    });
  };

  // --- Render logic based on AppMode ---

  // Connection Status Overlay for Lobby
  const ConnectionStatus = () => (
      <div className={`absolute top-4 right-4 flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md z-50 ${isConnected ? 'bg-emerald-900/50 border-emerald-500 text-emerald-400' : 'bg-red-900/50 border-red-500 text-red-400'}`}>
          {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
          {isConnected ? "已连接服务器" : "连接断开"}
      </div>
  );

  if (appMode === 'LOBBY') {
      return (
          <>
            <ConnectionStatus />
            <Lobby 
                playerName={localPlayerName} 
                setPlayerName={setLocalPlayerName}
                onCreateRoom={handleCreateRoom}
                onJoinRoom={handleJoinRoom}
            />
          </>
      );
  }

  if (appMode === 'ROOM' && currentRoom) {
      return (
          <>
             <ConnectionStatus />
             <RoomView 
                room={currentRoom}
                localPlayerId={localPlayerId}
                onToggleReady={handleToggleReady}
                onStartGame={handleStartGame}
                onLeaveRoom={handleLeaveRoom}
             />
          </>
      );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#0a0f1c] text-slate-100 overflow-hidden font-sans">
      <ConnectionStatus />
      
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Background Grid Texture */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        </div>
        
        {/* Left Sidebar: Market Info */}
        <div className="hidden lg:block h-full z-10 shadow-xl shadow-black/50">
            <StockMarket gameState={{
                grid, companies: companies as Record<CompanyId, Company>, players, currentPlayerIndex, phase, turnLog, lastPlacedTile, purchasedStockCount, winnerId, deck
            }} />
        </div>

        {/* Center: Board */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto z-10">
          <div className="max-w-5xl w-full">
            <GameGrid 
                gameState={{
                    grid, companies: companies as Record<CompanyId, Company>, players, currentPlayerIndex, phase, turnLog, lastPlacedTile, purchasedStockCount, winnerId, deck
                }} 
                selectedTile={selectedTile}
                onSelectTile={handleSelectTile}
                isCurrentPlayerTurn={isMyTurn()} 
            />
          </div>
        </div>
      </div>

      {/* Bottom: Player Dashboard */}
      <div className="flex-shrink-0 z-20 border-t border-slate-700/50 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
        <PlayerDashboard 
             gameState={{
                grid, companies, players, currentPlayerIndex, phase, turnLog, lastPlacedTile, purchasedStockCount, winnerId, deck
            }}
             localPlayerId={localPlayerId}
             selectedTile={selectedTile}
             onSelectTile={handleSelectTile}
             onConfirmPlacement={confirmPlacement}
             onCancelSelection={handleCancelSelection}
             onBuyStock={handleBuyStock}
             onEndTurn={handleEndTurn}
             onOpenRules={() => setShowRules(true)}
        />
      </div>

      {/* Rules Modal */}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}

      {/* New Corp Selection Modal */}
      {pendingNewCorp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-slate-900/90 p-8 rounded-xl border border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.15)] max-w-lg w-full relative overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
                <div className="absolute bottom-0 right-0 p-4 opacity-10 pointer-events-none">
                    <Building2 size={120} />
                </div>

                <h3 className="text-2xl font-tech font-bold mb-2 text-white flex items-center gap-2">
                    <span className="text-cyan-400">◆</span> 成立新公司
                </h3>
                <p className="text-slate-400 mb-6 border-b border-slate-700 pb-4">
                    请在坐标 <span className="text-yellow-400 font-mono font-bold mx-1">{grid[pendingNewCorp.row][pendingNewCorp.col].label}</span> 处选择一家公司进行注册：
                </p>
                <div className="grid grid-cols-2 gap-4 relative z-10">
                    {(Object.values(companies) as Company[]).filter(c => c.size === 0).map(c => (
                        <button
                            key={c.id}
                            onClick={() => createCorporation(c.id)}
                            className={`
                                group p-4 rounded-lg border text-left flex items-center gap-3 transition-all duration-200
                                bg-slate-800/80 border-slate-600 hover:border-white/40 hover:bg-slate-700 hover:scale-105 hover:shadow-lg
                            `}
                        >
                            <div className={`w-12 h-12 rounded flex items-center justify-center shadow-inner ${c.color} text-white font-bold text-xs`}>
                                <CompanyLogo companyId={c.id} className="w-8 h-8" />
                            </div>
                            <div>
                                <span className={`block text-lg font-bold ${c.textColor} group-hover:text-white transition-colors`}>
                                    {c.name}
                                </span>
                                <span className="text-xs text-slate-500 uppercase tracking-wider">Available</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;