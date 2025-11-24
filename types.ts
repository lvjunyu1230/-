export enum Player {
  None = 0,
  Black = 1, // Usually Human
  White = 2, // Usually AI
}

export enum GameStatus {
  Idle = 'idle',
  Playing = 'playing',
  Won = 'won',
  Draw = 'draw',
}

export interface Point {
  x: number;
  y: number;
}

export enum SkillType {
  Undo = 'UNDO',
  Swap = 'SWAP',
  Boom = 'BOOM',
  DoubleMove = 'DOUBLE',
  Freeze = 'FREEZE',
  Randomize = 'RANDOM',
}

export interface Skill {
  id: string;
  type: SkillType;
  name: string;
  description: string;
  icon: string;
  cooldown: number; // turns
  currentCooldown: number;
  color: string;
}

export interface GameState {
  board: Player[][];
  currentPlayer: Player;
  status: GameStatus;
  winner: Player | null;
  history: Point[];
  playerSkills: Skill[];
  aiSkills: Skill[];
  frozenPlayer: Player | null; // If a player is frozen
}

export interface ChatMessage {
  role: 'system' | 'ai';
  text: string;
}
