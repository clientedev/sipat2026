export interface LevelDefinition {
  level: number;
  title: string;
  minPoints: number;
  nextLevelPoints: number | null;
}

export const SIPAT_LEVELS: LevelDefinition[] = [
  { level: 1, title: 'Observador Preventivo', minPoints: 0, nextLevelPoints: 50 },
  { level: 2, title: 'Agente de Prevenção', minPoints: 50, nextLevelPoints: 150 },
  { level: 3, title: 'Técnico Consciente', minPoints: 150, nextLevelPoints: 300 },
  { level: 4, title: 'Especialista em Segurança', minPoints: 300, nextLevelPoints: 500 },
  { level: 5, title: 'Embaixador SIPAT SENAI', minPoints: 500, nextLevelPoints: null },
];

export function calculateLevelInfo(totalPoints: number): LevelDefinition & { progressPercent: number } {
  const safePoints = Math.max(0, totalPoints);
  let current = SIPAT_LEVELS[0];
  for (const lvl of SIPAT_LEVELS) {
    if (safePoints >= lvl.minPoints) {
      current = lvl;
    }
  }
  if (current.nextLevelPoints === null) {
    return { ...current, progressPercent: 100 };
  }
  const span = current.nextLevelPoints - current.minPoints;
  const gained = safePoints - current.minPoints;
  const progressPercent = Math.min(100, Math.max(0, Math.round((gained / span) * 100)));
  return { ...current, progressPercent };
}

export type NamePrivacyModeType = 'FULL_NAME' | 'FIRST_LAST_INITIAL' | 'INITIALS_ONLY';

export function maskParticipantName(fullName: string, mode: NamePrivacyModeType): string {
  const cleaned = (fullName || '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return 'Participante';
  const parts = cleaned.split(' ');
  if (mode === 'FULL_NAME' || parts.length === 1) {
    if (mode === 'INITIALS_ONLY') {
      return `${parts[0].charAt(0).toUpperCase()}.`;
    }
    return cleaned;
  }

  const connectors = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
  const significant = parts.filter((p) => !connectors.has(p.toLowerCase()));

  if (mode === 'INITIALS_ONLY') {
    return significant.map((p) => `${p.charAt(0).toUpperCase()}.`).join(' ');
  }

  // FIRST_LAST_INITIAL
  const first = significant[0] || parts[0];
  const restInitials = significant
    .slice(1)
    .map((p) => `${p.charAt(0).toUpperCase()}.`)
    .join(' ');
  return restInitials ? `${first} ${restInitials}` : first;
}

export function getInitials(fullName: string): string {
  const parts = (fullName || '')
    .trim()
    .split(/\s+/)
    .filter((p) => !['de', 'da', 'do', 'das', 'dos', 'e'].includes(p.toLowerCase()));
  if (parts.length === 0) return 'SN';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export const SIPAT_EVENT_DAYS = [
  {
    day: 1,
    date: '16/11/2026',
    shortDate: '16 NOV',
    weekday: 'Segunda-feira',
    theme: 'Percepção de Riscos e Atitude Preventiva',
    focus: 'Caça aos Riscos, Segurança Começa Comigo e Quiz de Prevenção',
  },
  {
    day: 2,
    date: '17/11/2026',
    shortDate: '17 NOV',
    weekday: 'Terça-feira',
    theme: 'Segurança na Prática nas Oficinas e Laboratórios',
    focus: 'Encontre os 7 Erros, Técnico Seguro (EPIs, Elétrica, Cilindros e Bancadas) e Segurança em 60s',
  },
  {
    day: 3,
    date: '18/11/2026',
    shortDate: '18 NOV',
    weekday: 'Quarta-feira',
    theme: 'Ergonomia, Organização e Bem-Estar',
    focus: 'Postura, Estações de Trabalho, Monitores, Iluminação e Hábitos Preventivos',
  },
  {
    day: 4,
    date: '19/11/2026',
    shortDate: '19 NOV',
    weekday: 'Quinta-feira',
    theme: 'Grande Gincana da Segurança & Compromisso Final',
    focus: 'Informática Segura, Logística, Climatização e Refrigeração, Mito ou Verdade, Quiz Final e Compromisso',
  },
] as const;
