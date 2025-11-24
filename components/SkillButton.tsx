import React from 'react';
import { Skill } from '../types';

interface SkillButtonProps {
  skill: Skill;
  onClick: () => void;
  disabled: boolean;
}

const SkillButton: React.FC<SkillButtonProps> = ({ skill, onClick, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative overflow-hidden w-full mb-2 p-2 rounded-xl text-white shadow-md transition-all
        flex items-center gap-2 group
        ${disabled ? 'bg-gray-400 cursor-not-allowed opacity-60' : `${skill.color} hover:scale-105 hover:shadow-lg`}
      `}
      title={skill.description}
    >
      <div className="text-2xl">{skill.icon}</div>
      <div className="flex-1 text-left">
        <div className="font-bold text-sm font-fun">{skill.name}</div>
        <div className="text-xs opacity-90 leading-tight hidden group-hover:block">
            {skill.description}
        </div>
      </div>
      
      {/* Cooldown Overlay */}
      {skill.currentCooldown > 0 && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center font-bold text-lg">
          {skill.currentCooldown}
        </div>
      )}
    </button>
  );
};

export default SkillButton;
