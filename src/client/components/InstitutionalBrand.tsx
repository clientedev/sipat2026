import React, { useState } from 'react';

interface InstitutionalBrandProps {
  officialLogoUrl?: string | null;
  schoolName?: string;
  variant?: 'light' | 'dark';
  compact?: boolean;
}

/**
 * Renderiza a Marca Oficial Original do SENAI em sua proporção autêntica quando o arquivo oficial
 * estiver configurado no painel administrativo ou em /brand/senai-oficial.svg.
 * Quando ainda não enviado, exibe exclusivamente a assinatura institucional limpa da unidade
 * Escola SENAI "Morvan Figueiredo" — sem inventar, recriar ou distorcer a marca oficial.
 */
export const InstitutionalBrand: React.FC<InstitutionalBrandProps> = ({
  officialLogoUrl,
  schoolName = 'Escola SENAI "Morvan Figueiredo"',
  variant = 'dark',
  compact = false,
}) => {
  const [repoFileMissing, setRepoFileMissing] = useState(false);
  const [uploadedLogoError, setUploadedLogoError] = useState(false);

  const effectiveSrc =
    officialLogoUrl && !uploadedLogoError
      ? officialLogoUrl
      : !repoFileMissing
      ? '/brand/senai-oficial.svg'
      : null;

  const isLightText = variant === 'light';

  return (
    <div className="flex items-center gap-3 select-none">
      {effectiveSrc ? (
        <img
          src={effectiveSrc}
          alt="Marca Oficial SENAI"
          className={`${compact ? 'h-8' : 'h-10'} w-auto object-contain shrink-0`}
          onError={() => {
            if (officialLogoUrl && effectiveSrc === officialLogoUrl) {
              setUploadedLogoError(true);
            } else {
              setRepoFileMissing(true);
            }
          }}
        />
      ) : (
        <div
          className={`px-2.5 py-1 border-l-4 border-[#FFB800] font-condensed font-extrabold tracking-wider uppercase ${
            isLightText
              ? 'bg-white/10 text-white'
              : 'bg-[#0047B6] text-white'
          } ${compact ? 'text-base' : 'text-lg'}`}
        >
          SENAI
        </div>
      )}

      <div className="flex flex-col leading-tight">
        <span
          className={`font-display font-bold tracking-tight ${
            compact ? 'text-sm' : 'text-base'
          } ${isLightText ? 'text-white' : 'text-[#0F172A]'}`}
        >
          {schoolName}
        </span>
        <span
          className={`font-mono-tech uppercase tracking-wider ${
            compact ? 'text-[10px]' : 'text-[11px]'
          } ${isLightText ? 'text-blue-200' : 'text-[#475569]'}`}
        >
          SIPAT 2026 • 16 A 19 NOV
        </span>
      </div>
    </div>
  );
};
