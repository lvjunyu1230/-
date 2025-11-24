import { GoogleGenAI } from "@google/genai";
import { Player } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const getCommentary = async (
  move: { x: number; y: number },
  player: Player,
  boardSnapshot: string,
  isWin: boolean
): Promise<string> => {
  const client = getClient();
  if (!client) {
    return "API Key missing. I can't speak!";
  }

  const role = player === Player.Black ? "Player (Black)" : "AI (White)";
  const context = isWin 
    ? `The game just ended. ${role} won!` 
    : `${role} just played at coordinate (${move.x}, ${move.y}).`;

  const prompt = `
    You are a hilarious, sarcastic, and slightly mean commentator for a game of 'Skill Gobang' (Five-in-a-row with super powers).
    The game is inspired by Chinese comedy sketches (小品).
    Speak in Chinese, but you can use some English slang.
    Keep it short (max 1 sentence).
    Be responsive to the board situation if possible, but prioritize being funny.
    
    Context: ${context}
    Current Board State (Simplified representation): ${boardSnapshot}
    
    If it's a win, roast the loser or praise the winner sarcastically.
    If it's a normal move, comment on whether it was a smart move or a "stinky pawn" (臭棋).
  `;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "......";
  } catch (error) {
    console.error("Gemini commentary failed:", error);
    return "（系统繁忙，解说员去吃盒饭了...）";
  }
};

export const getIntroMessage = async (): Promise<string> => {
    const client = getClient();
    if (!client) return "Welcome to Skill Gobang!";

    const prompt = `
      Generate a short, funny opening line for a comedy-style Gobang game. 
      Pretend you are a wise but eccentric master waiting for a challenger.
      Chinese language.
    `;
    try {
        const response = await client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        return response.text || "来者何人？报上名来！";
      } catch (error) {
        return "准备好了吗？";
      }
}
