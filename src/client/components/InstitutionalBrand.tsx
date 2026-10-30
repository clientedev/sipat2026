import React, { useState } from 'react';

interface InstitutionalBrandProps {
  officialLogoUrl?: string | null;
  schoolName?: string;
  variant?: 'light' | 'dark';
  compact?: boolean;
}

/**
 * Renderiza a Marca Oficial Original do SENAI-SP com o logotipo autêntico
 * e a identificação institucional da Escola SENAI "Morvan Figueiredo" (Mooca).
 */
export const InstitutionalBrand: React.FC<InstitutionalBrandProps> = ({
  officialLogoUrl,
  schoolName = 'Escola SENAI "Morvan Figueiredo"',
  variant = 'dark',
  compact = false,
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
    <div className="flex items-center gap-3 select-none">
      <div className="relative shrink-0 flex items-center">
        <img
          src={effectiveSrc}
          alt="SENAI - Serviço Nacional de Aprendizagem Industrial"
          className={`${
            compact ? 'h-7 sm:h-8' : 'h-8 sm:h-10'
          } w-auto object-contain transition-transform hover:scale-[1.02]`}
          onError={() => {
            if (effectiveSrc !== '/brand/senai-logo.png') {
              setLogoLoadError(true);
            }
          }}
        />
      </div>

      <div className="flex flex-col justify-center border-l border-slate-300/80 pl-3 leading-tight">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-display font-bold tracking-tight ${
              compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
            } ${isLightText ? 'text-white' : 'text-[#1E293B]'}`}
          >
            {schoolName}
          </span>
          <span
            className={`hidden sm:inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${
              isLightText
                ? 'bg-white/20 text-white'
                : 'bg-red-50 text-[#E30613] border border-red-200'
            }`}
          >
            MOOCA
          </span>
        </div>
        <span
          className={`font-semibold tracking-wide uppercase text-[10px] sm:text-[11px] ${
            isLightText ? 'text-red-200' : 'text-[#E30613]'
          }`}
        >
          SIPAT 2026 • 16 A 19 DE NOVEMBRO
        </span>
      </div>
    </div>
  );
};

