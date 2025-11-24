import { Skill, SkillType } from './types';

export const BOARD_SIZE = 15;

export const ALL_SKILLS: Skill[] = [
  {
    id: 'skill-undo',
    type: SkillType.Undo,
    name: '悔棋大法',
    description: '时光倒流！撤回上一步棋。',
    icon: '↩️',
    cooldown: 5,
    currentCooldown: 0,
    color: 'bg-blue-500',
  },
  {
    id: 'skill-swap',
    type: SkillType.Swap,
    name: '乾坤挪移',
    description: '随机将对手的一颗棋子变成你的！',
    icon: '🔄',
    cooldown: 8,
    currentCooldown: 0,
    color: 'bg-purple-500',
  },
  {
    id: 'skill-boom',
    type: SkillType.Boom,
    name: '局部核平',
    description: '随机炸掉棋盘上 3x3 区域内的所有棋子。',
    icon: '💣',
    cooldown: 10,
    currentCooldown: 0,
    color: 'bg-red-500',
  },
  {
    id: 'skill-double',
    type: SkillType.DoubleMove,
    name: '左右互搏',
    description: '本回合可以连续下两步棋！',
    icon: '⚡',
    cooldown: 7,
    currentCooldown: 0,
    color: 'bg-yellow-500',
  },
  {
    id: 'skill-freeze',
    type: SkillType.Freeze,
    name: '葵花点穴',
    description: '对手下回合无法行动（被跳过）。',
    icon: '❄️',
    cooldown: 9,
    currentCooldown: 0,
    color: 'bg-cyan-500',
  },
  {
    id: 'skill-random',
    type: SkillType.Randomize,
    name: '听天由命',
    description: '棋盘上随机一个空位会出现你的棋子。',
    icon: '🎲',
    cooldown: 4,
    currentCooldown: 0,
    color: 'bg-green-500',
  },
];

export const INITIAL_GREETINGS = [
  "来吧，让你三招！(Come on, I'll give you a head start!)",
  "我看你骨骼惊奇，是块下棋的料。(You look like a chess prodigy.)",
  "准备好接受来自AI的降维打击了吗？(Ready for some dimensional strikes?)",
];
