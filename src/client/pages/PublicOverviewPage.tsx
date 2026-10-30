import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  Award,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  Radio,
  Trophy,
  Users,
} from 'lucide-react';
import { InstitutionalBrand } from '../components/InstitutionalBrand';
import { apiFetch } from '../lib/api';
import { getRealtimeSocket } from '../lib/socket';

interface OverviewResponse {
  schoolName: string;
  eventTitle: string;
  eventTheme: string;
  eventSlogan: string;
  officialLogoUrl: string | null;
  updatedAt: string;
  indicators: {
    totalRegistered: number;
    activeParticipants: number;
    participationRatePercent: number;
    evidencesSent: number;
    missionsCompleted: number;
    quizzesCompleted: number;
    publishedActivities: number;
    badgesUnlocked: number;
    totalPointsAccumulated: number;
  };
  evolution: Array<{
    date: string;
    evidencesSent: number;
    quizzesAnswered: number;
    pointsGenerated: number;
  }>;
  topClasses: Array<{
    position: number;
    code: string;
    name: string;
    participantsCount: number;
    totalPoints: number;
    completedActivities: number;
  }>;
  missionsProgress: Array<{
    id: string;
    title: string;
    category: string;
    eventDay: number;
    eventDateLabel: string;
    status: string;
    points: number;
    submissionsCount: number;
  }>;
}

export const PublicOverviewPage: React.FC = () => {
  const [data, setData] = useState<OverviewResponse | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await apiFetch<OverviewResponse>('/api/public/overview');
      setData(res);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void loadData();
    const socket = getRealtimeSocket();
    const onRefresh = () => void loadData();
    socket.on('ranking:updated', onRefresh);
    socket.on('activity:released', onRefresh);
    const interval = setInterval(() => void loadData(), 30_000);
    return () => {
      socket.off('ranking:updated', onRefresh);
      socket.off('activity:released', onRefresh);
      clearInterval(interval);
    };
  }, [loadData]);

  const maxDailyPoints = Math.max(
    10,
    ...(data?.evolution || []).map((e) => e.pointsGenerated)
  );

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col">
      <header className="bg-[#1E293B] text-white border-b-4 border-[#E30613] shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <InstitutionalBrand
            officialLogoUrl={data?.officialLogoUrl ? '/api/media/brand' : null}
            schoolName={data?.schoolName || 'Escola SENAI "Morvan Figueiredo"'}
            variant="light"
          />

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded text-xs font-mono-tech">
              <Radio size={14} className="text-[#FFB800]" />
              <span>PAINEL PÚBLICO DE ACOMPANHAMENTO</span>
            </span>
            <Link
              to="/ranking"
              className="bg-[#FFB800] text-[#0F172A] font-bold text-xs px-3.5 py-2 rounded-md flex items-center gap-1.5"
            >
              <Trophy size={14} />
              <span>Ver Ranking</span>
            </Link>
            <Link
              to="/"
              className="text-xs font-semibold text-blue-100 hover:text-white flex items-center gap-1"
            >
              <ArrowLeft size={14} />
              <span>Início</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div>
          <span className="text-xs font-mono-tech uppercase text-[#E30613] font-bold">
            TRANSPARÊNCIA E INDICADORES EM TEMPO REAL
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] mt-1">
            Acompanhamento Geral da {data?.eventTitle || 'SIPAT 2026'} —{' '}
            {data?.schoolName || 'Escola SENAI "Morvan Figueiredo"'}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Indicadores consolidados da mobilização educativa de prevenção de acidentes (16 a 19 de
            novembro de 2026).
          </p>
        </div>

        {/* Cartões de Indicadores Gerais */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            {
              label: 'Inscritos',
              val: data?.indicators.totalRegistered ?? 0,
              icon: <Users size={18} className="text-[#E30613]" />,
            },
            {
              label: 'Participação Ativa',
              val: `${data?.indicators.participationRatePercent ?? 0}%`,
              icon: <Activity size={18} className="text-emerald-600" />,
            },
            {
              label: 'Evidências Enviadas',
              val: data?.indicators.evidencesSent ?? 0,
              icon: <FileCheck2 size={18} className="text-sky-600" />,
            },
            {
              label: 'Missões Aprovadas',
              val: data?.indicators.missionsCompleted ?? 0,
              icon: <CheckCircle2 size={18} className="text-emerald-700" />,
            },
            {
              label: 'Quizzes Concluídos',
              val: data?.indicators.quizzesCompleted ?? 0,
              icon: <ClipboardList size={18} className="text-amber-600" />,
            },
            {
              label: 'Pontos Acumulados',
              val: data?.indicators.totalPointsAccumulated ?? 0,
              icon: <Award size={18} className="text-[#E30613]" />,
            },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-white border border-slate-200 border-t-4 border-t-[#E30613] rounded-md p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase font-mono-tech text-slate-500">
                  {card.label}
                </span>
                {card.icon}
              </div>
              <div className="text-2xl font-condensed font-extrabold text-[#0F172A] tabular-nums">
                {card.val}
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Evolução da Competição */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-base text-[#1E293B] flex items-center gap-2">
                  <BarChart3 size={18} className="text-[#E30613]" />
                  <span>Evolução Diária da Mobilização</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Evidências registradas, quizzes concluídos e pontuação gerada por data
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {(data?.evolution || []).map((day) => {
                const pct = Math.max(4, Math.round((day.pointsGenerated / maxDailyPoints) * 100));
                return (
                  <div key={day.date} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono-tech font-bold text-slate-700">{day.date}</span>
                      <span className="text-slate-600">
                        {day.evidencesSent} evidência(s) • {day.quizzesAnswered} quiz(zes) •{' '}
                        <strong className="text-[#E30613]">{day.pointsGenerated} pts</strong>
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-[#E30613] transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Engajamento das Principais Turmas */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-6">
            <h2 className="font-bold text-base text-[#1E293B] mb-1">
              Turmas Mais Engajadas
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Liderança coletiva por área tecnológica da unidade
            </p>
            <div className="space-y-3">
              {(data?.topClasses || []).map((cls) => (
                <div
                  key={cls.code}
                  className="p-3 rounded border border-slate-200 bg-[#F8FAFC] flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-mono-tech font-bold text-[#E30613]">
                      {cls.position}º • {cls.code}
                    </div>
                    <div className="text-xs font-semibold text-slate-800 truncate">{cls.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {cls.participantsCount} inscrito(s) • {cls.completedActivities} ativ.
                    </div>
                  </div>
                  <div className="font-condensed font-extrabold text-lg text-[#1E293B] shrink-0">
                    {cls.totalPoints} PTS
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mapa de Missões Publicadas e Realizadas */}
        <div className="bg-white border border-slate-200 rounded-md p-6">
          <h2 className="font-bold text-base text-[#1E293B] mb-4">
            Andamento das Missões da Campanha SIPAT 2026
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(data?.missionsProgress || []).map((m) => (
              <div
                key={m.id}
                className="border border-slate-200 rounded-md p-4 bg-[#F8FAFC] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono-tech mb-1.5">
                    <span className="text-[#E30613] font-bold">
                      DIA {m.eventDay} • {m.eventDateLabel}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-semibold ${
                        m.status === 'PUBLISHED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : m.status === 'SCHEDULED'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {m.status === 'PUBLISHED'
                        ? 'ABERTA'
                        : m.status === 'SCHEDULED'
                        ? 'AGENDADA'
                        : 'ENCERRADA'}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-[#1E293B]">{m.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{m.category}</p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">
                    {m.submissionsCount} participação(ões)
                  </span>
                  <span className="font-mono-tech font-bold text-[#E30613]">{m.points} PTS</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

