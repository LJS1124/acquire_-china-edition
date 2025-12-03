export enum CompanyId {
  HuangShan = 'HUANGSHAN', // Yellow
  BlueSky = 'BLUESKY', // Blue
  ChaoYang = 'CHAOYANG', // Orange
  RedFlag = 'REDFLAG', // Red
  ZiJin = 'ZIJIN', // Purple
  Nuclear = 'NUCLEAR', // Green
  Oak = 'OAK', // Teal
}

export enum GamePhase {
  PLACE_TILE = 'PLACE_TILE',
  RESOLVE_MERGE = 'RESOLVE_MERGE',
  BUY_STOCKS = 'BUY_STOCKS',
  GAME_OVER = 'GAME_OVER',
}

export enum TileState {
  EMPTY = 'EMPTY',
  UNINCORPORATED = 'UNINCORPORATED',
  CORP = 'CORP',
  DEAD = 'DEAD', // Unplayable due to safe merge rules
}

export interface Coordinates {
  row: number;
  col: number;
  label: string;
}

export interface TileData extends Coordinates {
  state: TileState;
  companyId?: CompanyId;
}

export interface Company {
  id: CompanyId;
  name: string;
  color: string;
  textColor: string;
  tier: 1 | 2 | 3;
  size: number;
  availableShares: number;
  safe: boolean;
}

export interface Player {
  id: string; // Changed from number to string for UUIDs
  name: string;
  cash: number;
  shares: Record<CompanyId, number>;
  hand: Coordinates[];
  isLocal?: boolean; // Helper to identify the local player
}

export interface MergeContext {
  survivorId: CompanyId;
  defunctId: CompanyId;
  defunctSize: number;
  stockHolders: number[]; // Player IDs who hold stock
  step: 'BONUS' | 'DISPOSE';
}

export interface GameState {
  grid: TileData[][];
  companies: Record<CompanyId, Company>;
  players: Player[];
  currentPlayerIndex: number;
  phase: GamePhase;
  turnLog: string[];
  lastPlacedTile: Coordinates | null;
  purchasedStockCount: number; // Max 3 per turn
  winnerId: string | null;
  deck: Coordinates[]; // deck is part of synced state now
}

// --- Multiplayer Types ---

export interface PlayerProfile {
  id: string;
  name: string;
  isReady: boolean;
  isHost: boolean;
  joinedAt: number;
}

export interface Room {
  id: string;
  hostId: string;
  players: PlayerProfile[];
  status: 'WAITING' | 'PLAYING';
}

export type NetworkMessageType = 
  | 'JOIN_ROOM' 
  | 'UPDATE_ROOM' 
  | 'START_GAME' 
  | 'GAME_ACTION' 
  | 'SYNC_STATE'
  | 'PLAYER_DISCONNECTED'
  | 'HEARTBEAT';

export interface NetworkMessage {
  type: NetworkMessageType;
  roomId: string;
  senderId: string;
  payload?: any;
}
