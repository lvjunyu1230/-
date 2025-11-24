import { Player, Point, Skill, SkillType, GameState } from '../types';
import { BOARD_SIZE, ALL_SKILLS } from '../constants';

// Initialize empty board
export const createBoard = (): Player[][] => {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(Player.None));
};

// Check for 5 in a row
export const checkWin = (board: Player[][], lastMove: Point, player: Player): boolean => {
  const { x, y } = lastMove;
  const directions = [
    [1, 0],   // Horizontal
    [0, 1],   // Vertical
    [1, 1],   // Diagonal \
    [1, -1],  // Diagonal /
  ];

  for (const [dx, dy] of directions) {
    let count = 1;

    // Check forward
    let i = 1;
    while (true) {
      const nx = x + dx * i;
      const ny = y + dy * i;
      if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE || board[ny][nx] !== player) break;
      count++;
      i++;
    }

    // Check backward
    i = 1;
    while (true) {
      const nx = x - dx * i;
      const ny = y - dy * i;
      if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE || board[ny][nx] !== player) break;
      count++;
      i++;
    }

    if (count >= 5) return true;
  }
  return false;
};

// Pick 3 random unique skills
export const getRandomSkills = (): Skill[] => {
  const shuffled = [...ALL_SKILLS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3).map(skill => ({ ...skill }));
};

// Simple AI Heuristic
export const getBestMove = (board: Player[][]): Point => {
  // 1. Check if AI can win now
  const winningMove = findWinningMove(board, Player.White);
  if (winningMove) return winningMove;

  // 2. Check if Opponent can win now (Block)
  const blockingMove = findWinningMove(board, Player.Black);
  if (blockingMove) return blockingMove;

  // 3. Strategic placement (Simplified: Centrality + Adjacency)
  // Find all valid moves
  const moves: { x: number; y: number; score: number }[] = [];
  
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === Player.None) {
        let score = 0;
        
        // Prefer center
        const centerDist = Math.abs(x - 7) + Math.abs(y - 7);
        score += (14 - centerDist); 

        // Analyze neighbors
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
               if (board[ny][nx] === Player.Black) score += 10; // Block aggression
               if (board[ny][nx] === Player.White) score += 12; // Build own line
            }
          }
        }
        
        moves.push({ x, y, score });
      }
    }
  }

  if (moves.length === 0) return { x: 7, y: 7 };

  moves.sort((a, b) => b.score - a.score);
  // Add a little randomness so AI isn't perfectly predictable
  const candidates = moves.slice(0, 5);
  const choice = candidates[Math.floor(Math.random() * candidates.length)];
  return { x: choice.x, y: choice.y };
};

const findWinningMove = (board: Player[][], player: Player): Point | null => {
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === Player.None) {
        // Temporarily place
        board[y][x] = player;
        if (checkWin(board, { x, y }, player)) {
          board[y][x] = Player.None; // Reset
          return { x, y };
        }
        board[y][x] = Player.None; // Reset
      }
    }
  }
  return null;
};

// Skill Logic Helpers
export const applySkillEffect = (
  gameState: GameState,
  skill: Skill,
  initiator: Player
): Partial<GameState> | null => {
  const newBoard = gameState.board.map(row => [...row]);
  const opponent = initiator === Player.Black ? Player.White : Player.Black;

  switch (skill.type) {
    case SkillType.Undo:
      // Handled in main component due to history dependency
      return null; 
      
    case SkillType.Boom: {
      // Clear a random 3x3 area that has at least one stone
      let centerX, centerY, attempts = 0;
      let valid = false;
      while(!valid && attempts < 100) {
          centerX = Math.floor(Math.random() * (BOARD_SIZE - 2)) + 1;
          centerY = Math.floor(Math.random() * (BOARD_SIZE - 2)) + 1;
          // Check if area has stones
          for(let dy=-1; dy<=1; dy++) {
             for(let dx=-1; dx<=1; dx++) {
                if(newBoard[centerY+dy][centerX+dx] !== Player.None) valid = true;
             }
          }
          attempts++;
      }
      if (!valid) return null; // No stones to nuke
      
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          newBoard[centerY! + dy][centerX! + dx] = Player.None;
        }
      }
      return { board: newBoard };
    }

    case SkillType.Swap: {
      // Find all opponent stones
      const oppStones: Point[] = [];
      for(let y=0; y<BOARD_SIZE; y++) {
        for(let x=0; x<BOARD_SIZE; x++) {
          if(newBoard[y][x] === opponent) oppStones.push({x,y});
        }
      }
      if(oppStones.length === 0) return null;
      const target = oppStones[Math.floor(Math.random() * oppStones.length)];
      newBoard[target.y][target.x] = initiator;
      return { board: newBoard };
    }

    case SkillType.Randomize: {
      // Place a stone in a random empty spot
      const emptySpots: Point[] = [];
      for(let y=0; y<BOARD_SIZE; y++) {
        for(let x=0; x<BOARD_SIZE; x++) {
          if(newBoard[y][x] === Player.None) emptySpots.push({x,y});
        }
      }
      if(emptySpots.length === 0) return null;
      const target = emptySpots[Math.floor(Math.random() * emptySpots.length)];
      newBoard[target.y][target.x] = initiator;
      return { board: newBoard };
    }

    case SkillType.Freeze: {
       return { frozenPlayer: opponent };
    }

    // Double Move handled in state machine logic
    case SkillType.DoubleMove: 
       return {};

    default:
      return null;
  }
};
