import React, { useState } from 'react';

interface InstitutionalBrandProps {
  officialLogoUrl?: string | null;
  schoolName?: string;
  variant?: 'light' | 'dark';
  compact?: boolean;
  /** A partir de que largura mostrar o nome completo (cabeçalhos com muitos botões usam 'xl') */
  fullFrom?: 'sm' | 'lg' | 'xl';
}

// Classes literais para o Tailwind encontrar
const SHORT_CLASS = { sm: 'sm:hidden', lg: 'lg:hidden', xl: 'xl:hidden' } as const;
const FULL_CLASS = { sm: 'hidden sm:inline', lg: 'hidden lg:inline', xl: 'hidden xl:inline' } as const;
const TAG_CLASS = { sm: 'hidden md:inline-block', lg: 'hidden lg:inline-block', xl: 'hidden xl:inline-block' } as const;

/**
 * Renderiza a Marca Oficial Original do SENAI-SP com o logotipo autêntico
 * e a identificação institucional da Escola SENAI "Morvan Figueiredo" (Mooca).
 */
export const InstitutionalBrand: React.FC<InstitutionalBrandProps> = ({
  officialLogoUrl,
  schoolName = 'Escola SENAI "Morvan Figueiredo"',
  variant = 'dark',
  compact = false,
  fullFrom = 'sm',
}) => {
  const [logoLoadError, setLogoLoadError] = useState(false);

  // Prioriza o logo oficial original enviado pelo usuário (/brand/senai-oficial.png)
  // ou URL customizada enviada pelo administrador
  const effectiveSrc =
    officialLogoUrl && !logoLoadError
      ? officialLogoUrl
      : !logoLoadError
      ? '/brand/senai-oficial.png'
      : '/brand/senai-logo.png';

  const isLightText = variant === 'light';

  return (
    <div className="flex items-center gap-2 sm:gap-3 select-none min-w-0">
      <div className="relative shrink-0 flex items-center">
        <img
          src={effectiveSrc}
          alt="SENAI - Serviço Nacional de Aprendizagem Industrial"
          className={`${
            compact ? 'h-6 sm:h-8' : 'h-7 sm:h-9 md:h-10'
          } w-auto object-contain transition-transform hover:scale-[1.02]`}
          onError={() => {
            if (effectiveSrc !== '/brand/senai-logo.png') {
              setLogoLoadError(true);
            }
          }}
        />
      </div>

      <div className="flex flex-col justify-center border-l border-slate-300/80 pl-2 sm:pl-3 leading-tight min-w-0">
        <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
          <span
            className={`font-display font-bold tracking-tight truncate whitespace-nowrap ${
              compact ? 'text-xs sm:text-sm' : 'text-xs sm:text-sm md:text-base'
            } ${isLightText ? 'text-white' : 'text-[#1E293B]'}`}
          >
            <span className={SHORT_CLASS[fullFrom]}>SENAI Mooca</span>
            <span className={FULL_CLASS[fullFrom]}>{schoolName}</span>
          </span>
          <span
            className={`${TAG_CLASS[fullFrom]} shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${
              isLightText
                ? 'bg-white/20 text-white'
                : 'bg-red-50 text-[#E30613] border border-red-200'
            }`}
          >
            MOOCA
          </span>
        </div>
        <span
          className={`font-bold tracking-wide uppercase text-[9px] sm:text-[10px] md:text-[11px] truncate whitespace-nowrap ${
            isLightText ? 'text-red-200' : 'text-[#E30613]'
          }`}
        >
          <span className={SHORT_CLASS[fullFrom]}>SIPAT 2026</span>
          <span className={FULL_CLASS[fullFrom]}>SIPAT 2026 • 16 A 19 DE NOVEMBRO</span>
        </span>
      </div>
    </div>
  );
};

