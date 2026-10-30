import React from 'react';
import {
  Award,
  CheckCircle2,
  Eye,
  GraduationCap,
  HardHat,
  ShieldAlert,
  ShieldCheck,
  Trophy,
  Zap,
} from 'lucide-react';

interface BadgeIconProps {
  iconName: string;
  accentColor?: string;
  unlocked?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const BadgeIcon: React.FC<BadgeIconProps> = ({
  iconName,
  accentColor = '#0047B6',
  unlocked = true,
  size = 'md',
}) => {
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 28 : 22;
  const boxClass =
    size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-14 h-14' : 'w-11 h-11';

  const renderLucide = () => {
    switch (iconName) {
      case 'Eye':
        return <Eye size={iconSize} />;
      case 'CheckCircle2':
        return <CheckCircle2 size={iconSize} />;
      case 'ShieldCheck':
        return <ShieldCheck size={iconSize} />;
      case 'GraduationCap':
        return <GraduationCap size={iconSize} />;
      case 'Trophy':
        return <Trophy size={iconSize} />;
      case 'HardHat':
        return <HardHat size={iconSize} />;
      case 'Zap':
        return <Zap size={iconSize} />;
      case 'ShieldAlert':
        return <ShieldAlert size={iconSize} />;
      default:
        return <Award size={iconSize} />;
    }
  };

  return (
    <div
      className={`${boxClass} rounded-md flex items-center justify-center border-2 shrink-0 transition-colors`}
      style={
        unlocked
          ? {
              backgroundColor: `${accentColor}15`,
              borderColor: accentColor,
              color: accentColor,
            }
          : {
              backgroundColor: '#F1F5F9',
              borderColor: '#CBD5E1',
              color: '#94A3B8',
            }
      }
    >
      {renderLucide()}
    </div>
  );
};
