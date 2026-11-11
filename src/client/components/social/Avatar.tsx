import React, { useState } from 'react';

interface AvatarProps {
  name: string;
  initials: string;
  url: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
}

const SIZES: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'w-7 h-7 text-[10px]',
  sm: 'w-9 h-9 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-24 h-24 text-3xl',
};

// Cor estável por pessoa, para diferenciar colegas sem foto
const PALETTE = ['#E30613', '#0047B6', '#0F766E', '#7C3AED', '#C2410C', '#1E293B', '#BE185D', '#15803D'];
function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export const Avatar: React.FC<AvatarProps> = ({ name, initials, url, size = 'md', onClick }) => {
  const [broken, setBroken] = useState(false);
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      title={name}
      className={`${SIZES[size]} shrink-0 rounded-full overflow-hidden flex items-center justify-center font-bold text-white ring-2 ring-white ${
        onClick ? 'cursor-pointer hover:opacity-90' : ''
      }`}
      style={{ backgroundColor: colorFor(name) }}
    >
      {url && !broken ? (
        <img src={url} alt={name} className="w-full h-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <span>{initials}</span>
      )}
    </Tag>
  );
};
