import { CompanyId, Company } from './types';

export const GRID_ROWS = 9; // A-I
export const GRID_COLS = 12; // 1-12

export const STARTING_CASH = 6000;
export const MAX_STOCK_PURCHASE = 3;
export const SAFE_SIZE = 11;
export const END_GAME_SIZE = 41;

export const INITIAL_COMPANIES: Record<CompanyId, Company> = {
  [CompanyId.HuangShan]: {
    id: CompanyId.HuangShan,
    name: '黄山纸业',
    color: 'bg-yellow-600',
    textColor: 'text-yellow-400',
    tier: 1,
    size: 0,
    availableShares: 25,
    safe: false,
  },
  [CompanyId.BlueSky]: {
    id: CompanyId.BlueSky,
    name: '蓝天纺织',
    color: 'bg-blue-700',
    textColor: 'text-blue-400',
    tier: 1,
    size: 0,
    availableShares: 25,
    safe: false,
  },
  [CompanyId.ChaoYang]: {
    id: CompanyId.ChaoYang,
    name: '朝阳五金',
    color: 'bg-orange-600',
    textColor: 'text-orange-400',
    tier: 2,
    size: 0,
    availableShares: 25,
    safe: false,
  },
  [CompanyId.RedFlag]: {
    id: CompanyId.RedFlag,
    name: '红旗造船',
    color: 'bg-red-700',
    textColor: 'text-red-500',
    tier: 2,
    size: 0,
    availableShares: 25,
    safe: false,
  },
  [CompanyId.ZiJin]: {
    id: CompanyId.ZiJin,
    name: '紫金仪表',
    color: 'bg-purple-700',
    textColor: 'text-purple-400',
    tier: 2,
    size: 0,
    availableShares: 25,
    safe: false,
  },
  [CompanyId.Nuclear]: {
    id: CompanyId.Nuclear,
    name: '核能重工',
    color: 'bg-emerald-700',
    textColor: 'text-emerald-400',
    tier: 3,
    size: 0,
    availableShares: 25,
    safe: false,
  },
  [CompanyId.Oak]: {
    id: CompanyId.Oak,
    name: '橡树日化',
    color: 'bg-cyan-700',
    textColor: 'text-cyan-400',
    tier: 3,
    size: 0,
    availableShares: 25,
    safe: false,
  },
};

// Price table logic
// Tier 1 Base: 200, Tier 2 Base: 300, Tier 3 Base: 400
export const getStockPrice = (tier: number, size: number): number => {
  if (size === 0) return 0;
  
  let basePrice = 0;
  if (tier === 1) basePrice = 200;
  if (tier === 2) basePrice = 300;
  if (tier === 3) basePrice = 400;

  let multiplier = 0;

  if (size === 2) multiplier = 0;
  else if (size === 3) multiplier = 100;
  else if (size === 4) multiplier = 200;
  else if (size === 5) multiplier = 300;
  else if (size >= 6 && size <= 10) multiplier = 400;
  else if (size >= 11 && size <= 20) multiplier = 500;
  else if (size >= 21 && size <= 30) multiplier = 600;
  else if (size >= 31 && size <= 40) multiplier = 700;
  else if (size >= 41) multiplier = 800;

  return basePrice + multiplier;
};

export const getBonuses = (price: number) => {
  return {
    major: price * 10,
    minor: price * 5
  };
};