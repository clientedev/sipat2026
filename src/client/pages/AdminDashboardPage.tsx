import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  CheckSquare,
  ClipboardList,
  Copy,
  ExternalLink,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  QrCode,
  Shield,
  Trophy,
  Users,
} from 'lucide-react';
import { AdminEvidencesTab } from '../components/admin/AdminEvidencesTab';
import { AdminMissionsQuizzesTab } from '../components/admin/AdminMissionsQuizzesTab';
import { AdminParticipantsQrTab } from '../components/admin/AdminParticipantsQrTab';
import { AdminReportsSettingsTab } from '../components/admin/AdminReportsSettingsTab';
import { InstitutionalBrand } from '../components/InstitutionalBrand';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { getRealtimeSocket } from '../lib/socket';

export const AdminDashboardPage: React.FC = () => {
  const { user, publicConfig, logout } = useAuth();
  const navigate = useNavigate();

  const isEvaluatorOnly = user?.role === 'EVALUATOR';

  const [activeTab, setActiveTab] = useState<
    'overview' | 'evidences' | 'activities' | 'participants' | 'reports'
  >(isEvaluatorOnly ? 'evidences' : 'overview');

  const [dash, setDash] = useState<any | null>(null);
  const [copiedMsg, setCopiedMsg] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/dashboard');
      setDash(res);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void loadOverview();
    const socket = getRealtimeSocket();
    const onRefresh = () => void loadOverview();
    socket.on('submission:new', onRefresh);
    socket.on('ranking:updated', onRefresh);
    return () => {
      socket.off('submission:new', onRefresh);
      socket.off('ranking:updated', onRefresh);
    };
  }, [loadOverview]);

  const copyLink = (label: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedMsg(`Link de ${label} copiado!`);
    setTimeout(() => setCopiedMsg(null), 3500);
  };

  const navItems = [
    {
      id: 'overview',
      label: 'Painel de Indicadores',
      icon: <LayoutDashboard size={16} />,
      allowed: true,
    },
    {
      id: 'evidences',
      label: `Central de Evidências (${dash?.indicators?.pendingSubmissions ?? 0})`,
      icon: <CheckSquare size={16} />,
      allowed: true,
    },
    {
      id: 'activities',
      label: 'Missões, Agendador & Quizzes',
      icon: <ClipboardList size={16} />,
      allowed: !isEvaluatorOnly,
    },
    {
      id: 'participants',
      label: 'QR Code, Turmas & Alunos',
      icon: <QrCode size={16} />,
      allowed: !isEvaluatorOnly,
    },
    {
      id: 'reports',
      label: 'Relatórios, Marca & LGPD',
      icon: <FileBarChart size={16} />,
      allowed: !isEvaluatorOnly,
    },
  ].filter((i) => i.allowed);

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col">
      {/* Cabeçalho Institucional Administrativo */}
      <header className="bg-[#1E293B] text-white border-b-4 border-[#E30613] shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <InstitutionalBrand
                officialLogoUrl={publicConfig?.officialLogoUrl}
                schoolName={publicConfig?.schoolName}
                variant="light"
                compact
              />
            </Link>
            <span className="hidden md:inline-flex items-center gap-1.5 bg-[#E30613] text-white text-[11px] font-mono-tech font-bold px-2.5 py-1 rounded">
              <Shield size={12} className="text-[#FFB800]" />
              <span>{user?.role}</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/ranking"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-xs font-semibold px-3 py-1.5 rounded"
            >
              <Trophy size={14} className="text-[#FFB800]" />
              <span>Abrir Modo TV</span>
              <ExternalLink size={12} />
            </Link>
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate('/');
              }}
              className="inline-flex items-center gap-1.5 bg-red-600/90 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded cursor-pointer"
            >
              <LogOut size={14} />
              <span>Sair</span>
            </button>
          </div>
        </div>

        {/* Barra de Módulos Administrativos */}
        <div className="bg-[#162238] border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as any)}
                className={`px-4 py-3 text-xs font-bold flex items-center gap-2 whitespace-nowrap border-b-3 transition-colors cursor-pointer ${
                  activeTab === item.id
                    ? 'border-[#E30613] text-[#E30613] bg-white/5'
                    : 'border-transparent text-slate-300 hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {copiedMsg && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-2.5 rounded text-xs font-semibold">
            {copiedMsg}
          </div>
        )}

        {activeTab === 'overview' && dash && (
          <div className="space-y-6">
            {/* Cartões de Indicadores Administrativos */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                {
                  label: 'Inscritos',
                  value: dash.indicators.totalRegistered,
                  accent: 'border-t-[#E30613]',
                },
                {
                  label: 'Evidências Pendentes',
                  value: dash.indicators.pendingSubmissions,
                  accent: 'border-t-[#F59E0B]',
                },
                {
                  label: 'Missões Aprovadas',
                  value: dash.indicators.missionsCompleted,
                  accent: 'border-t-[#10B981]',
                },
                {
                  label: 'Quizzes Respondidos',
                  value: dash.indicators.quizzesCompleted,
                  accent: 'border-t-sky-600',
                },
                {
                  label: 'Agendadas no Relógio',
                  value: dash.indicators.scheduledActivities,
                  accent: 'border-t-amber-600',
                },
                {
                  label: 'Pontuação Total',
                  value: dash.indicators.totalPointsAccumulated,
                  accent: 'border-t-[#E30613]',
                },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className={`bg-white border border-slate-200 border-t-4 ${kpi.accent} rounded-md p-4`}
                >
                  <div className="text-[11px] font-mono-tech uppercase text-slate-500">
                    {kpi.label}
                  </div>
                  <div className="text-2xl font-condensed font-extrabold text-[#0F172A] mt-1 tabular-nums">
                    {kpi.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Links Públicos de Compartilhamento Rápido */}
            <div className="bg-white border border-slate-200 rounded-md p-5">
              <h2 className="font-bold text-sm uppercase tracking-wider text-[#E30613] mb-3">
                Endereços Públicos em Tempo Real (Sem Necessidade de Login)
              </h2>
              <div className="grid md:grid-cols-3 gap-3 text-xs">
                {[
                  {
                    label: 'Ranking Público / Modo TV',
                    url: dash.links.publicRankingUrl,
                    path: '/ranking',
                  },
                  {
                    label: 'Acompanhamento Geral SIPAT',
                    url: dash.links.publicOverviewUrl,
                    path: '/acompanhamento',
                  },
                  {
                    label: 'Link Direto de Inscrição Mobile',
                    url: dash.links.registrationUrl,
                    path: '/inscricao',
                  },
                ].map((lnk) => (
                  <div
                    key={lnk.label}
                    className="p-3.5 rounded border border-slate-200 bg-[#F8FAFC] flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{lnk.label}</div>
                      <div className="font-mono-tech text-[11px] text-slate-500 truncate mt-0.5">
                        {lnk.url}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => copyLink(lnk.label, lnk.url)}
                        className="inline-flex items-center gap-1 bg-[#E30613] hover:bg-[#C2040F] text-white font-semibold px-2.5 py-1.5 rounded cursor-pointer transition-colors"
                      >
                        <Copy size={12} />
                        <span>Copiar Link</span>
                      </button>
                      <Link
                        to={lnk.path}
                        target="_blank"
                        className="inline-flex items-center gap-1 border border-slate-300 bg-white text-slate-700 font-semibold px-2.5 py-1.5 rounded"
                      >
                        <ExternalLink size={12} />
                        <span>Abrir</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
              {/* Gráfico de Participação Diária */}
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-md p-5">
                <h3 className="font-bold text-sm text-[#1E293B] flex items-center gap-2 mb-4">
                  <BarChart3 size={17} className="text-[#E30613]" />
                  <span>Participação Diária e Pontos Gerados</span>
                </h3>
                <div className="space-y-3 text-xs">
                  {(dash.evolution || []).map((ev: any) => {
                    const maxPts = Math.max(
                      10,
                      ...(dash.evolution || []).map((x: any) => x.pointsGenerated)
                    );
                    const pct = Math.max(4, Math.round((ev.pointsGenerated / maxPts) * 100));
                    return (
                      <div key={ev.date}>
                        <div className="flex justify-between mb-1">
                          <span className="font-mono-tech font-bold">{ev.date}</span>
                          <span className="text-slate-600">
                            {ev.evidencesSent} evid. • {ev.quizzesAnswered} quizzes •{' '}
                            <strong>{ev.pointsGenerated} pts</strong>
                          </span>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded overflow-hidden">
                          <div className="h-full bg-[#E30613]" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Últimas Submissões Recebidas */}
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-md p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm text-[#1E293B] flex items-center gap-2">
                    <Activity size={17} className="text-[#E30613]" />
                    <span>Últimas Evidências Recebidas</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('evidences')}
                    className="text-xs font-bold text-[#E30613] hover:underline cursor-pointer"
                  >
                    Abrir Central de Análise →
                  </button>
                </div>
                <div className="divide-y divide-slate-200 text-xs">
                  {(dash.recentSubmissions || []).length === 0 ? (
                    <p className="py-6 text-center text-slate-500">
                      Nenhuma evidência enviada ainda.
                    </p>
                  ) : (
                    dash.recentSubmissions.map((s: any) => (
                      <div key={s.id} className="py-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">{s.missionTitle}</div>
                          <div className="text-slate-500 truncate">
                            {s.participantName} ({s.classCode})
                          </div>
                        </div>
                        <span
                          className={`font-mono-tech font-bold text-[10px] px-2 py-0.5 rounded shrink-0 ${
                            s.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-900'
                              : s.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {s.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Desempenho por Turma */}
            <div className="bg-white border border-slate-200 rounded-md p-5">
              <h3 className="font-bold text-sm text-[#1E293B] flex items-center gap-2 mb-3">
                <Users size={17} className="text-[#E30613]" />
                <span>Desempenho Geral por Turma</span>
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {(dash.classRanking || []).map((c: any) => (
                  <div
                    key={c.id}
                    className="p-3 rounded border border-slate-200 bg-[#F8FAFC] flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-mono-tech font-bold text-[#E30613]">
                        {c.position}º • {c.code}
                      </div>
                      <div className="font-semibold text-slate-800 truncate">{c.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {c.participantsCount} inscrito(s) • Média {c.averagePoints} pts
                      </div>
                    </div>
                    <div className="font-condensed font-extrabold text-lg text-[#1E293B] shrink-0">
                      {c.totalPoints} PTS
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'evidences' && <AdminEvidencesTab onReviewed={() => void loadOverview()} />}
        {activeTab === 'activities' && !isEvaluatorOnly && <AdminMissionsQuizzesTab />}
        {activeTab === 'participants' && !isEvaluatorOnly && <AdminParticipantsQrTab />}
        {activeTab === 'reports' && !isEvaluatorOnly && <AdminReportsSettingsTab />}
      </main>
    </div>
  );
};

