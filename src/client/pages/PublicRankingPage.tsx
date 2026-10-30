import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Award,
  BarChart3,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Radio,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { BadgeIcon } from '../components/BadgeIcon';
import { InstitutionalBrand } from '../components/InstitutionalBrand';
import { apiFetch } from '../lib/api';
import { getRealtimeSocket } from '../lib/socket';

interface RankingResponse {
  schoolName: string;
  eventTitle: string;
  eventTheme: string;
  eventSlogan: string;
  officialLogoUrl: string | null;
  namePrivacyMode: string;
  tvRotationSeconds: number;
  updatedAt: string;
  summary: {
    totalParticipants: number;
    activeClasses: number;
    totalClasses: number;
    totalCompletedActivities: number;
    totalPointsAccumulated: number;
  };
  podium: Array<{
    position: number;
    userId: string;
    displayName: string;
    initials: string;
    avatarUrl: string | null;
    totalPoints: number;
    level: number;
    levelTitle: string;
    completedActivities: number;
    badgesCount: number;
    badges: Array<{ slug: string; name: string; iconName: string; accentColor: string }>;
    classGroup: { code: string; name: string } | null;
  }>;
  individualRanking: Array<{
    position: number;
    userId: string;
    displayName: string;
    initials: string;
    avatarUrl: string | null;
    totalPoints: number;
    level: number;
    levelTitle: string;
    completedActivities: number;
    badgesCount: number;
    badges: Array<{ slug: string; name: string; iconName: string; accentColor: string }>;
    classGroup: { code: string; name: string } | null;
  }>;
  classRanking: Array<{
    position: number;
    id: string;
    code: string;
    name: string;
    courseArea: string;
    shift: string;
    participantsCount: number;
    totalPoints: number;
    averagePoints: number;
    completedActivities: number;
  }>;
  highlights: Array<{
    id: string;
    participantName: string;
    initials: string;
    classCode: string;
    className: string;
    missionTitle: string;
    category: string;
    eventDay: number;
    awardedPoints: number;
    evaluatedAt: string;
  }>;
}

type TvSlide = 'individual' | 'classes' | 'highlights';

export const PublicRankingPage: React.FC = () => {
  const [data, setData] = useState<RankingResponse | null>(null);
  const [activeSlide, setActiveSlide] = useState<TvSlide>('individual');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [connected, setConnected] = useState(false);

  const loadRanking = useCallback(async () => {
    try {
      const res = await apiFetch<RankingResponse>('/api/public/ranking');
      setData(res);
    } catch {
      // ignore transient error
    }
  }, []);

  useEffect(() => {
    void loadRanking();
    const socket = getRealtimeSocket();
    setConnected(socket.connected);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onRefresh = () => void loadRanking();

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('ranking:updated', onRefresh);
    socket.on('activity:released', onRefresh);

    const fallbackPoll = setInterval(() => void loadRanking(), 30_000);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('ranking:updated', onRefresh);
      socket.off('activity:released', onRefresh);
      clearInterval(fallbackPoll);
    };
  }, [loadRanking]);

  useEffect(() => {
    const handleFsChange = () => {
      const fs = Boolean(document.fullscreenElement);
      setIsFullscreen(fs);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  useEffect(() => {
    if (!autoRotate) return;
    const seconds = Math.max(6, data?.tvRotationSeconds || 14);
    const order: TvSlide[] = ['individual', 'classes', 'highlights'];
    const timer = setInterval(() => {
      setActiveSlide((prev) => {
        const idx = order.indexOf(prev);
        return order[(idx + 1) % order.length];
      });
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [autoRotate, data?.tvRotationSeconds]);

  const toggleTvMode = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setAutoRotate(true);
      } else {
        await document.exitFullscreen();
        setAutoRotate(false);
      }
    } catch {
      setAutoRotate((v) => !v);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1528] text-white flex flex-col">
      {/* Topo Institucional de Alto Contraste para Telões e Projetores */}
      <header className="bg-[#1E293B] border-b-4 border-[#E30613] shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <InstitutionalBrand
            officialLogoUrl={data?.officialLogoUrl ? '/api/media/brand' : null}
            schoolName={data?.schoolName || 'Escola SENAI "Morvan Figueiredo"'}
            variant="light"
          />

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 bg-[#0F172A]/80 border border-emerald-500/40 px-3 py-1.5 rounded text-xs font-mono-tech">
              <Radio size={14} className={connected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'} />
              <span className="text-emerald-300 font-semibold">
                {connected ? 'TEMPO REAL ATIVO' : 'SINCRONIZANDO'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setAutoRotate((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded text-xs font-semibold border cursor-pointer ${
                autoRotate
                  ? 'bg-[#FFB800] text-[#0F172A] border-[#FFB800]'
                  : 'bg-white/10 text-white border-white/25 hover:bg-white/20'
              }`}
            >
              {autoRotate ? <Pause size={14} /> : <Play size={14} />}
              <span>{autoRotate ? 'Alternância Automática ON' : 'Alternar Abas Auto'}</span>
            </button>

            <button
              type="button"
              onClick={toggleTvMode}
              className="inline-flex items-center gap-1.5 bg-[#0F172A] hover:bg-slate-900 border border-[#FFB800] text-[#FFB800] px-3.5 py-2 rounded text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              <span>{isFullscreen ? 'Sair da Tela Cheia' : 'Modo TV / Projetor'}</span>
            </button>

            {!isFullscreen && (
              <Link
                to="/acompanhamento"
                className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded text-xs font-semibold"
              >
                <BarChart3 size={14} />
                <span>Indicadores</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Barra de Métricas Rápidas */}
      <div className="bg-[#0F1E3A] border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <Users className="text-[#FFB800]" size={22} />
            <div>
              <div className="text-xl font-condensed font-extrabold tabular-nums">
                {data?.summary.totalParticipants ?? 0}
              </div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400">
                Participantes Inscritos
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Award className="text-sky-400" size={22} />
            <div>
              <div className="text-xl font-condensed font-extrabold tabular-nums">
                {data?.summary.activeClasses ?? 0} / {data?.summary.totalClasses ?? 0}
              </div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400">
                Turmas Pontuando
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-emerald-400" size={22} />
            <div>
              <div className="text-xl font-condensed font-extrabold tabular-nums">
                {data?.summary.totalCompletedActivities ?? 0}
              </div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400">
                Atividades Concluídas
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Trophy className="text-[#FFB800]" size={22} />
            <div>
              <div className="text-xl font-condensed font-extrabold tabular-nums text-[#FFB800]">
                {data?.summary.totalPointsAccumulated ?? 0} PTS
              </div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400">
                Pontuação Acumulada
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seletor de Painel */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md bg-[#132342] p-1 border border-slate-700">
          {[
            { id: 'individual', label: 'Ranking Individual' },
            { id: 'classes', label: 'Ranking por Turmas' },
            { id: 'highlights', label: 'Destaques do Dia' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSlide(tab.id as TvSlide)}
              className={`px-4 py-2 rounded text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                activeSlide === tab.id
                  ? 'bg-[#E30613] text-white border border-red-500 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <p className="text-xs font-mono-tech text-slate-400">
          {data?.eventTheme} • <span className="text-[#FFB800]">{data?.eventSlogan}</span>
        </p>
      </div>

      {/* Conteúdo Principal do Placar */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeSlide === 'individual' && (
          <div className="space-y-6">
            {/* Pódio dos 3 Primeiros Colocados */}
            <div className="grid md:grid-cols-3 gap-4">
              {[0, 1, 2].map((idx) => {
                const p = data?.podium?.[idx];
                const medalBorders = [
                  'border-[#FFB800] bg-[#16294D]',
                  'border-slate-300 bg-[#132342]',
                  'border-amber-600 bg-[#132342]',
                ];
                const placeLabels = ['1º LUGAR • LÍDER', '2º LUGAR', '3º LUGAR'];
                return (
                  <div
                    key={idx}
                    className={`rounded-md border-2 ${medalBorders[idx]} p-5 flex flex-col justify-between`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`font-condensed font-extrabold text-sm px-2.5 py-0.5 rounded ${
                          idx === 0
                            ? 'bg-[#FFB800] text-[#0F172A]'
                            : 'bg-slate-700 text-slate-100'
                        }`}
                      >
                        {placeLabels[idx]}
                      </span>
                      <Trophy
                        size={22}
                        className={
                          idx === 0
                            ? 'text-[#FFB800]'
                            : idx === 1
                            ? 'text-slate-300'
                            : 'text-amber-500'
                        }
                      />
                    </div>

                    {p ? (
                      <>
                        <div className="flex items-center gap-3.5 my-2">
                          <div className="w-14 h-14 rounded-md bg-[#0047B6] border border-blue-400/50 flex items-center justify-center font-condensed font-extrabold text-xl overflow-hidden shrink-0">
                            {p.avatarUrl ? (
                              <img
                                src={p.avatarUrl}
                                alt={p.displayName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              p.initials
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-lg text-white truncate">
                              {p.displayName}
                            </h3>
                            <p className="text-xs font-mono-tech text-blue-300 truncate">
                              {p.classGroup ? `[${p.classGroup.code}] ${p.classGroup.name}` : 'SENAI'}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Nível {p.level} • {p.levelTitle}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                          <span className="text-xs text-slate-300">
                            {p.completedActivities} ativ. • {p.badgesCount} medalha(s)
                          </span>
                          <span className="font-condensed font-extrabold text-2xl text-[#FFB800] tabular-nums">
                            {p.totalPoints} PTS
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="py-6 text-sm text-slate-400">
                        Posição aguardando pontuações iniciais da competição.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Tabela Completa de Classificação Individual */}
            <div className="bg-[#11203B] border border-slate-700 rounded-md overflow-hidden">
              <div className="px-5 py-3 bg-[#16294D] border-b border-slate-700 flex items-center justify-between">
                <h2 className="font-bold text-sm uppercase tracking-wider text-blue-200">
                  Classificação Geral dos Participantes
                </h2>
                <span className="text-xs text-slate-400 font-mono-tech">
                  Exibição em conformidade com privacidade escolar (LGPD)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#0E1A31] text-slate-400 text-xs uppercase font-mono-tech">
                    <tr>
                      <th className="py-3 px-4 w-16">Pos.</th>
                      <th className="py-3 px-4">Participante</th>
                      <th className="py-3 px-4">Turma</th>
                      <th className="py-3 px-4">Atividades</th>
                      <th className="py-3 px-4">Medalhas</th>
                      <th className="py-3 px-4 text-right">Pontuação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {(data?.individualRanking || []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-400">
                          Nenhum participante cadastrado no ranking ainda. Escaneie o QR Code da
                          SIPAT 2026 para estrear o placar!
                        </td>
                      </tr>
                    ) : (
                      (data?.individualRanking || []).slice(0, 25).map((row) => (
                        <tr key={row.userId} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4 font-mono-tech font-bold text-[#FFB800]">
                            #{String(row.position).padStart(2, '0')}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded bg-[#0047B6] text-xs font-bold flex items-center justify-center shrink-0">
                                {row.initials}
                              </div>
                              <div>
                                <div className="font-semibold text-white">{row.displayName}</div>
                                <div className="text-[11px] text-slate-400">
                                  Nível {row.level} — {row.levelTitle}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs font-mono-tech text-blue-200">
                            {row.classGroup ? `${row.classGroup.code} • ${row.classGroup.name}` : '-'}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-300 tabular-nums">
                            {row.completedActivities} concluída(s)
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              {row.badges.slice(0, 4).map((b) => (
                                <BadgeIcon
                                  key={b.slug}
                                  iconName={b.iconName}
                                  accentColor={b.accentColor}
                                  size="sm"
                                />
                              ))}
                              {row.badgesCount === 0 && (
                                <span className="text-xs text-slate-500">—</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-condensed font-extrabold text-lg text-[#FFB800] tabular-nums">
                            {row.totalPoints} PTS
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeSlide === 'classes' && (
          <div className="bg-[#11203B] border border-slate-700 rounded-md overflow-hidden">
            <div className="px-5 py-4 bg-[#16294D] border-b border-slate-700 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base uppercase tracking-wider text-white">
                  Competição Coletiva entre Turmas – {data?.schoolName}
                </h2>
                <p className="text-xs text-slate-300">
                  Soma de pontos e engajamento das turmas técnicas, aprendizagem e colaboradores
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-800">
              {(data?.classRanking || []).map((cls) => {
                const maxClassPts = Math.max(
                  1,
                  ...(data?.classRanking || []).map((c) => c.totalPoints)
                );
                const widthPct = Math.round((cls.totalPoints / maxClassPts) * 100);
                return (
                  <div key={cls.id} className="p-4 sm:p-5 flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-8 h-8 rounded font-mono-tech font-bold text-sm flex items-center justify-center ${
                            cls.position === 1
                              ? 'bg-[#FFB800] text-[#0F172A]'
                              : 'bg-slate-800 text-slate-200'
                          }`}
                        >
                          {cls.position}º
                        </span>
                        <div>
                          <div className="font-bold text-white text-sm sm:text-base">
                            <span className="text-[#FFB800] font-mono-tech mr-2">[{cls.code}]</span>
                            {cls.name}
                          </div>
                          <div className="text-xs text-slate-400">
                            {cls.courseArea} • Turno: {cls.shift} • {cls.participantsCount}{' '}
                            participante(s) • {cls.completedActivities} atividade(s)
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-condensed font-extrabold text-2xl text-[#FFB800] tabular-nums">
                          {cls.totalPoints} PTS
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Média: {cls.averagePoints} pts/aluno
                        </div>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#005CAA] transition-all duration-500"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeSlide === 'highlights' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[#FFB800] font-bold uppercase tracking-wider text-sm">
              <Sparkles size={18} />
              <span>Destaques Recentes Validados pela Comissão Técnica</span>
            </div>

            {(data?.highlights || []).length === 0 ? (
              <div className="bg-[#11203B] border border-slate-700 rounded-md p-10 text-center text-slate-300">
                <Activity size={32} className="mx-auto text-blue-400 mb-2" />
                <p className="font-semibold">Aguardando as primeiras evidências aprovadas do dia!</p>
                <p className="text-xs text-slate-400 mt-1">
                  Assim que a comissão validar missões como Caça aos Riscos e Técnico Seguro, os
                  destaques aparecerão automaticamente aqui.
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {(data?.highlights || []).map((h) => (
                  <div
                    key={h.id}
                    className="bg-[#132342] border border-slate-700 border-t-4 border-t-[#FFB800] rounded-md p-4 flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono-tech mb-2">
                        <span className="text-blue-300">DIA {h.eventDay}</span>
                        <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">
                          +{h.awardedPoints} PTS
                        </span>
                      </div>
                      <h3 className="font-bold text-white text-base">{h.missionTitle}</h3>
                      <p className="text-xs text-slate-400 mt-1">{h.category}</p>
                    </div>
                    <div className="pt-3 border-t border-slate-700/80 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded bg-[#0047B6] text-xs font-bold flex items-center justify-center">
                        {h.initials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">
                          {h.participantName}
                        </div>
                        <div className="text-[11px] font-mono-tech text-slate-400 truncate">
                          {h.classCode}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {!isFullscreen && (
        <footer className="bg-[#081020] border-t border-slate-800 py-3 px-6 text-center text-xs text-slate-400">
          <Link to="/" className="text-blue-300 hover:underline mr-4">
            ← Página Inicial da Campanha
          </Link>
          <span>
            {data?.schoolName || 'Escola SENAI "Morvan Figueiredo"'} • Atualização automática via
            WebSocket
          </span>
        </footer>
      )}
    </div>
  );
};

