import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Player, GameStatus, Skill, SkillType, Point, ChatMessage, GameState } from './types';
import { BOARD_SIZE, INITIAL_GREETINGS } from './constants';
import { createBoard, checkWin, getRandomSkills, getBestMove, applySkillEffect } from './utils/gameLogic';
import { getCommentary, getIntroMessage } from './services/geminiService';
import SkillButton from './components/SkillButton';

const App: React.FC = () => {
  // Game State
  const [board, setBoard] = useState<Player[][]>(createBoard());
  const [currentPlayer, setCurrentPlayer] = useState<Player>(Player.Black);
  const [status, setStatus] = useState<GameStatus>(GameStatus.Idle);
  const [winner, setWinner] = useState<Player | null>(null);
  const [history, setHistory] = useState<Point[]>([]);
  
  // Skills
  const [playerSkills, setPlayerSkills] = useState<Skill[]>([]);
  const [aiSkills, setAiSkills] = useState<Skill[]>([]);
  const [frozenPlayer, setFrozenPlayer] = useState<Player | null>(null);
  const [doubleMoveActive, setDoubleMoveActive] = useState<boolean>(false);

  // Chat/Commentary
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Utils
  const hasGameEnded = status === GameStatus.Won || status === GameStatus.Draw;

  // --- Initialization ---
  const startGame = useCallback(async () => {
    setBoard(createBoard());
    setCurrentPlayer(Player.Black);
    setStatus(GameStatus.Playing);
    setWinner(null);
    setHistory([]);
    setPlayerSkills(getRandomSkills());
    setAiSkills(getRandomSkills());
    setFrozenPlayer(null);
    setDoubleMoveActive(false);
    
    // Initial greeting
    setMessages([{ role: 'system', text: "正在连接赛博解说员..." }]);
    const intro = await getIntroMessage();
    setMessages([{ role: 'ai', text: intro }]);
  }, []);

  // --- Core Game Loop ---
  const handlePlaceStone = async (x: number, y: number) => {
    if (status !== GameStatus.Playing) return;
    if (board[y][x] !== Player.None) return;
    
    // 1. Place Stone
    const newBoard = board.map(row => [...row]);
    newBoard[y][x] = currentPlayer;
    setBoard(newBoard);
    
    const newHistory = [...history, {x, y}];
    setHistory(newHistory);

    // 2. Check Win
    if (checkWin(newBoard, { x, y }, currentPlayer)) {
      setStatus(GameStatus.Won);
      setWinner(currentPlayer);
      triggerCommentary({x,y}, currentPlayer, newBoard, true);
      return;
    }

    // 3. Trigger Commentary (Async)
    // Don't await this, let game flow continue
    triggerCommentary({x,y}, currentPlayer, newBoard, false);

    // 4. Handle Turn Logic
    let nextPlayer = currentPlayer === Player.Black ? Player.White : Player.Black;
    let keepTurn = false;

    // Logic: Double Move Skill
    if (doubleMoveActive) {
      keepTurn = true;
      setDoubleMoveActive(false); // Consumed
      // Don't switch player
    } 
    
    if (!keepTurn) {
      // Check Freeze
      if (frozenPlayer === nextPlayer) {
        addSystemMessage(`🚫 ${nextPlayer === Player.Black ? '玩家' : 'AI'} 被冻结，跳过回合！`);
        setFrozenPlayer(null); // Unfreeze after skip
        // Player stays same
      } else {
        setCurrentPlayer(nextPlayer);
      }
    }

    // Cooldown Reduction (End of turn)
    if (!keepTurn) {
        reduceCooldowns(currentPlayer);
    }
  };

  const triggerCommentary = async (move: Point, player: Player, currentBoard: Player[][], isWin: boolean) => {
      // Create a simplified snapshot string for Gemini
      // Only send a 5x5 area around the move to save tokens and context
      let snapshot = "Board Area around move:\n";
      for (let dy = -2; dy <= 2; dy++) {
          let rowStr = "";
          for (let dx = -2; dx <= 2; dx++) {
             const py = move.y + dy;
             const px = move.x + dx;
             if (py >=0 && py < BOARD_SIZE && px >= 0 && px < BOARD_SIZE) {
                 const cell = currentBoard[py][px];
                 rowStr += (cell === Player.Black ? "B" : cell === Player.White ? "W" : ".") + " ";
             } else {
                 rowStr += "X ";
             }
          }
          snapshot += rowStr + "\n";
      }

      const comment = await getCommentary(move, player, snapshot, isWin);
      setMessages(prev => [...prev, { role: 'ai', text: comment }]);
  };

  const reduceCooldowns = (playerWhoJustMoved: Player) => {
      const updateSkills = (skills: Skill[]) => skills.map(s => ({
          ...s,
          currentCooldown: Math.max(0, s.currentCooldown - 1)
      }));

      if (playerWhoJustMoved === Player.Black) {
          setPlayerSkills(prev => updateSkills(prev));
      } else {
          setAiSkills(prev => updateSkills(prev));
      }
  };

  const addSystemMessage = (text: string) => {
      setMessages(prev => [...prev, { role: 'system', text }]);
  };

  // --- AI Turn Effect ---
  useEffect(() => {
    if (status === GameStatus.Playing && currentPlayer === Player.White) {
      const makeAiMove = async () => {
        setIsAiThinking(true);
        // Simulate "thinking" delay
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1000));
        
        // AI Skill Usage (Simple Chance)
        // 20% chance to use a skill if available
        let skillUsed = false;
        const availableSkillIndex = aiSkills.findIndex(s => s.currentCooldown === 0);
        if (Math.random() < 0.2 && availableSkillIndex !== -1) {
             const skill = aiSkills[availableSkillIndex];
             handleActivateSkill(skill, Player.White);
             skillUsed = true;
        }

        if (!skillUsed || (skillUsed && doubleMoveActive)) {
            // Recalculate best move based on current board (which might have changed due to skill)
            // Note: Since setBoard is async, we should technically use a ref or wait, 
            // but for this simple app, reading state in next render cycle via logic check is okay.
            // However, to be safe, we calculate move based on 'board' dependency update.
            const bestMove = getBestMove(board);
            handlePlaceStone(bestMove.x, bestMove.y);
        }
        setIsAiThinking(false);
      };

      makeAiMove();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, status]); // Trigger when player switches to White

  // --- Skill Handler ---
  const handleActivateSkill = (skill: Skill, user: Player) => {
    addSystemMessage(`⚡ ${user === Player.Black ? '玩家' : 'AI'} 发动了技能：${skill.name}！`);
    
    // Consumable Cost
    const updateSkillCooldown = (skills: Skill[]) => skills.map(s => 
        s.id === skill.id ? { ...s, currentCooldown: s.cooldown } : s
    );

    if (user === Player.Black) setPlayerSkills(prev => updateSkillCooldown(prev));
    else setAiSkills(prev => updateSkillCooldown(prev));

    // Handle Specific Logic
    if (skill.type === SkillType.Undo) {
        if (history.length < 2) {
             addSystemMessage("❌ 无法悔棋：历史记录不足。");
             return; // Refund cooldown? simplify: just fail.
        }
        // Revert 2 moves (Black + White) normally, or 1 if it's the start
        // Actually, logic is tricky. Let's just pop last move.
        const lastMove = history[history.length - 1];
        const newBoard = board.map(r => [...r]);
        newBoard[lastMove.y][lastMove.x] = Player.None;
        setBoard(newBoard);
        setHistory(prev => prev.slice(0, -1));
        
        // If it was AI's turn, now it's AI's turn again (after undoing AI's move? No usually undo undoes opponent too).
        // Let's implement "Undo Last Round" (2 moves)
        if (history.length >= 2) {
            const secondLast = history[history.length - 2];
            newBoard[secondLast.y][secondLast.x] = Player.None;
            setBoard(newBoard);
            setHistory(prev => prev.slice(0, -2));
            // Current player remains user
            setCurrentPlayer(user); 
        } else {
            // Only 1 move happened
            setCurrentPlayer(user);
        }
        addSystemMessage("🕰️ 时光倒流成功！");
        return;
    }

    if (skill.type === SkillType.DoubleMove) {
        setDoubleMoveActive(true);
        addSystemMessage("🚀 获得额外行动机会！");
        return;
    }

    const currentState: GameState = {
        board, currentPlayer, status, winner, history, playerSkills, aiSkills, frozenPlayer
    };

    const effectResult = applySkillEffect(currentState, skill, user);

    if (effectResult) {
        if (effectResult.board) setBoard(effectResult.board);
        if (effectResult.frozenPlayer) setFrozenPlayer(effectResult.frozenPlayer);
        // Handle Randomize or Swap triggering checks? 
        // For simplicity, skill changes don't trigger immediate win checks, wait for next stone.
    }
  };


  // --- Scroll Chat ---
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-amber-50 relative">
      
      {/* --- Left Panel: Game Board --- */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        
        {/* Header/Score */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
           <div className="bg-white/80 backdrop-blur-sm p-3 rounded-2xl shadow-lg border border-amber-200">
             <h1 className="text-2xl font-fun text-amber-800">爆笑技能五子棋</h1>
             <p className="text-xs text-amber-700">Gemini 毒舌解说版</p>
           </div>
           
           {status !== GameStatus.Idle && (
               <div className="flex items-center gap-4 bg-white/80 p-2 rounded-xl shadow-md">
                   <div className={`px-4 py-1 rounded-lg font-bold ${currentPlayer === Player.Black ? 'bg-slate-800 text-white' : 'bg-gray-200 text-gray-500'}`}>
                       玩家 (黑)
                   </div>
                   <div className="font-bold text-amber-600">VS</div>
                   <div className={`px-4 py-1 rounded-lg font-bold ${currentPlayer === Player.White ? 'bg-white border text-black' : 'bg-gray-200 text-gray-500'}`}>
                       AI (白)
                   </div>
               </div>
           )}
        </div>

        {/* The Board */}
        <div className="relative bg-[#dcb386] p-4 rounded-lg shadow-2xl border-4 border-[#b58863]">
            {/* Grid Lines */}
            <div 
              className="grid relative"
              style={{ 
                  gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
                  width: 'min(90vw, 600px)',
                  height: 'min(90vw, 600px)',
              }}
            >
                {/* Background Grid Drawing (Simplified with CSS borders on cells) */}
                {board.map((row, y) => (
                    row.map((cell, x) => (
                        <div 
                            key={`${x}-${y}`}
                            className="relative border-slate-900/10 cursor-pointer flex items-center justify-center"
                            onClick={() => handlePlaceStone(x, y)}
                        >
                            {/* Cross Lines */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-full h-[1px] bg-slate-800/40"></div>
                                <div className="h-full w-[1px] bg-slate-800/40 absolute"></div>
                            </div>
                            
                            {/* Star points (Tian Yuan) */}
                            {((x === 3 || x === 11 || x === 7) && (y === 3 || y === 11 || y === 7)) && (
                                <div className="absolute w-2 h-2 rounded-full bg-slate-800/60 z-0"></div>
                            )}

                            {/* Stones */}
                            {cell !== Player.None && (
                                <div 
                                    className={`
                                        w-[80%] h-[80%] rounded-full shadow-md z-10 relative
                                        ${cell === Player.Black ? 'black-stone' : 'white-stone'}
                                        transform transition-all duration-300 animate-[bounce_0.3s_ease-out]
                                    `}
                                >
                                    {/* Last Move Marker */}
                                    {history.length > 0 && history[history.length-1].x === x && history[history.length-1].y === y && (
                                        <div className={`absolute inset-0 flex items-center justify-center ${cell === Player.Black ? 'text-white' : 'text-black'}`}>
                                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Hover Effect */}
                            {status === GameStatus.Playing && cell === Player.None && currentPlayer === Player.Black && (
                                <div className="w-[80%] h-[80%] rounded-full bg-black/10 opacity-0 hover:opacity-100 z-20 absolute transition-opacity"></div>
                            )}
                        </div>
                    ))
                ))}
            </div>
            
            {/* Win Overlay */}
            {hasGameEnded && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm rounded-lg">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl text-center transform animate-[scale-in_0.5s]">
                        <h2 className="text-4xl font-fun mb-2 text-amber-600">
                            {winner === Player.Black ? '🎉 恭喜获胜！' : winner === Player.White ? '💀 遗憾败北' : '🤝 平局'}
                        </h2>
                        <p className="text-gray-600 mb-6">Gemini: "{messages[messages.length-1]?.text}"</p>
                        <button 
                            onClick={startGame}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform hover:scale-105"
                        >
                            再来一局
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* --- Right Panel: Controls & Chat --- */}
      <div className="w-full md:w-80 bg-white border-l border-amber-200 flex flex-col h-1/3 md:h-full shadow-xl z-20">
          
          {/* Skills Section */}
          <div className="p-4 border-b border-gray-100 flex-1 overflow-y-auto">
             <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                 <span>✨ 你的技能</span>
                 <span className="text-xs font-normal text-gray-400">(CD转好可点击)</span>
             </h3>
             
             {status === GameStatus.Playing ? (
                 <div className="space-y-2">
                     {playerSkills.map(skill => (
                         <SkillButton 
                            key={skill.id} 
                            skill={skill} 
                            onClick={() => handleActivateSkill(skill, Player.Black)}
                            disabled={status !== GameStatus.Playing || currentPlayer !== Player.Black || skill.currentCooldown > 0}
                         />
                     ))}
                 </div>
             ) : (
                 <div className="h-full flex flex-col items-center justify-center text-gray-400">
                     {status === GameStatus.Idle && (
                         <button 
                            onClick={startGame}
                            className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all w-full"
                         >
                             开始游戏
                         </button>
                     )}
                 </div>
             )}
          </div>

          {/* Chat/Commentary Section */}
          <div className="h-1/2 flex flex-col bg-slate-50 border-t border-gray-200">
              <div className="p-2 bg-slate-100 border-b border-gray-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">System Log & Commentary</span>
                  {isAiThinking && <span className="text-xs text-amber-600 animate-pulse">AI is thinking...</span>}
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono text-sm">
                  {messages.map((msg, i) => (
                      <div key={i} className={`flex gap-2 ${msg.role === 'ai' ? 'flex-row' : 'flex-row-reverse'}`}>
                          <div className={`
                              p-2 rounded-lg max-w-[90%] 
                              ${msg.role === 'ai' ? 'bg-white border border-gray-200 text-slate-700 rounded-tl-none' : 'bg-amber-100 text-amber-900 rounded-tr-none'}
                          `}>
                              {msg.role === 'ai' && <span className="block text-xs font-bold text-purple-600 mb-1">🤖 Gemini Commentator</span>}
                              {msg.text}
                          </div>
                      </div>
                  ))}
                  <div ref={chatEndRef} />
              </div>
          </div>
      </div>
    </div>
  );
};

export default App;