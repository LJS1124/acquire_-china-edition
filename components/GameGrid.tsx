import React from 'react';
import { GameState, TileState, Coordinates } from '../types';
import CompanyLogo from './CompanyLogo';

interface GameGridProps {
  gameState: GameState;
  selectedTile: Coordinates | null;
  onSelectTile: (tile: Coordinates) => void;
  isCurrentPlayerTurn: boolean;
}

const GameGrid: React.FC<GameGridProps> = ({ gameState, selectedTile, onSelectTile, isCurrentPlayerTurn }) => {
  const { grid, lastPlacedTile, companies, players, currentPlayerIndex } = gameState;

  const currentPlayer = players[currentPlayerIndex];
  
  // Helper to check if a specific grid cell corresponds to a tile in the current player's hand
  const getHandTile = (r: number, c: number) => {
    if (!currentPlayer || !currentPlayer.hand) return undefined;
    return currentPlayer.hand.find(t => t.row === r && t.col === c);
  };

  return (
    <div className="relative p-3 bg-slate-800/50 backdrop-blur-sm border-4 border-slate-700/50 rounded-xl shadow-2xl overflow-hidden">
        {/* Metallic Texture Overlay */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" 
             style={{ 
                 backgroundImage: `repeating-linear-gradient(45deg, #1e293b 0, #1e293b 1px, transparent 0, transparent 50%)`,
                 backgroundSize: '10px 10px' 
             }} 
        />

      {/* Grid Container */}
      <div 
        className="grid gap-1 relative z-10"
        style={{ 
            gridTemplateColumns: `repeat(12, minmax(0, 1fr))`,
        }}
      >
        {grid.map((row, rIndex) => (
          <React.Fragment key={`row-${rIndex}`}>
            {row.map((cell, cIndex) => {
              const isLastPlaced = lastPlacedTile?.row === rIndex && lastPlacedTile?.col === cIndex;
              const playableTile = isCurrentPlayerTurn ? getHandTile(rIndex, cIndex) : undefined;
              const isSelected = selectedTile?.label === cell.label;
              
              let bgColor = 'bg-slate-900/80';
              let textColor = 'text-slate-700';
              let borderColor = 'border-slate-800';
              let glow = '';
              let cursor = 'cursor-default';
              let hover = '';
              let transform = '';

              if (cell.state === TileState.UNINCORPORATED) {
                bgColor = 'bg-slate-300';
                textColor = 'text-slate-900';
                borderColor = 'border-slate-400';
                transform = 'scale-[0.95]'; // Slight inset look for unincorporated
              } else if (cell.state === TileState.CORP && cell.companyId) {
                const company = companies[cell.companyId];
                bgColor = company.color;
                textColor = 'text-white/90 shadow-black drop-shadow-md';
                borderColor = 'border-white/10';
                if (company.safe) {
                    glow = 'shadow-[inset_0_0_10px_rgba(255,255,255,0.3)]';
                    // Striped pattern for safe companies
                    bgColor = `${company.color} bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMTBMMTAgMFoiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjIpIiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4=')]`;
                }
              }

              if (isLastPlaced) {
                borderColor = 'border-yellow-400';
                glow = 'shadow-[0_0_20px_rgba(250,204,21,0.5)] z-20';
                transform = 'scale-105';
              }
              
              if (isSelected) {
                // Highlight the selected tile as a preview
                borderColor = 'border-yellow-400 border-2 border-dashed';
                bgColor = cell.state === TileState.EMPTY ? 'bg-yellow-500/30' : bgColor;
                glow = 'shadow-[0_0_25px_rgba(234,179,8,0.4)] z-30 animate-pulse';
                transform = 'scale-105';
                textColor = cell.state === TileState.EMPTY ? 'text-yellow-100' : textColor;
              } else if (playableTile && cell.state === TileState.EMPTY) {
                // Highlight playable spots
                borderColor = 'border-yellow-500/30';
                cursor = 'cursor-pointer';
                hover = 'hover:bg-yellow-500/20 hover:border-yellow-400 hover:scale-110 hover:z-30 transition-all duration-200';
                // Show a ghost label or highlight
                if (bgColor.includes('bg-slate-900')) {
                    bgColor = 'bg-slate-800'; 
                }
              }

              return (
                <div
                  key={cell.label}
                  onClick={() => {
                    if (playableTile && cell.state === TileState.EMPTY) {
                        onSelectTile(playableTile);
                    }
                  }}
                  className={`
                    aspect-square flex items-center justify-center 
                    text-[10px] sm:text-xs font-bold select-none relative overflow-hidden
                    border rounded-sm transition-all duration-300
                    ${bgColor} ${textColor} ${borderColor} ${glow} ${cursor} ${hover} ${transform}
                  `}
                >
                  {/* Logo Watermark for Corporations */}
                  {cell.state === TileState.CORP && cell.companyId && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-30 text-white/50 pointer-events-none">
                          <CompanyLogo companyId={cell.companyId} className="w-[80%] h-[80%]" />
                      </div>
                  )}

                  <span className="relative z-10">
                      {cell.state !== TileState.EMPTY || isSelected ? cell.label : (
                         <span className={`text-[9px] font-mono ${playableTile ? 'text-yellow-500 opacity-100' : 'opacity-10'}`}>
                            {cell.label}
                         </span>
                      )}
                  </span>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      
      {/* Decorative corners/screws */}
      <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-slate-600 shadow-inner border border-slate-900"></div>
      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-slate-600 shadow-inner border border-slate-900"></div>
      <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-slate-600 shadow-inner border border-slate-900"></div>
      <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-slate-600 shadow-inner border border-slate-900"></div>
    </div>
  );
};

export default GameGrid;