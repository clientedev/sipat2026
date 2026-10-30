import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  Bell,
  BookOpen,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  History,
  LogOut,
  PlayCircle,
  Radio,
  Shield,
  Smartphone,
  Trash2,
  Trophy,
} from 'lucide-react';
import { SIPAT_EVENT_DAYS, SIPAT_LEVELS } from '@shared/constants';
import { BadgeIcon } from '../components/BadgeIcon';
import { CertificateData, CertificateModal } from '../components/CertificateModal';
import { InstitutionalBrand } from '../components/InstitutionalBrand';
import {
  MissionSubmitModal,
  ParticipantMissionItem,
} from '../components/MissionSubmitModal';
import { QuizRunnerModal } from '../components/QuizRunnerModal';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { getRealtimeSocket } from '../lib/socket';

interface DashboardResponse {
  profile: {
    id: string;
    fullName: string;
    initials: string;
    email: string;
    registrationCode: string | null;
    avatarUrl: string | null;
    classGroup: { code: string; name: string; courseArea: string; shift: string } | null;
    totalPoints: number;
    rankPosition: number | null;
    totalParticipants: number;
    level: number;
    levelTitle: string;
    levelProgressPercent: number;
    nextLevelPoints: number | null;
    approvedMissionsCount: number;
    pendingMissionsCount: number;
    completedQuizzesCount: number;
    imageConsent: boolean;
  };
  missions: ParticipantMissionItem[];
  quizzes: Array<{
    id: string;
    slug: string;
    title: string;
    description: string;
    category: string;
    eventDay: number;
    eventDateLabel: string;
    status: string;
    opensAt: string | null;
    closesAt: string | null;
    durationSeconds: number;
    maxPoints: number;
    maxAttempts: number;
    questionsCount: number;
    attemptsUsed: number;
    bestScorePercent: number | null;
    bestAwardedPoints: number;
  }>;
  badges: Array<{
    id: string;
    slug: string;
    name: string;
    description: string;
    iconName: string;
    accentColor: string;
    unlocked: boolean;
    awardedAt: string | null;
  }>;
  pointHistory: Array<{
    id: string;
    delta: number;
    balanceAfter: number;
    sourceType: string;
    reason: string;
    createdAt: string;
  }>;
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
  }>;
  unreadNotificationsCount: number;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const ParticipantAppPage: React.FC = () => {
  const { publicConfig, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'missions' | 'quizzes' | 'badges' | 'history'>(
    'missions'
  );
  const [dayFilter, setDayFilter] = useState<number | 'ALL'>('ALL');
  const [selectedMission, setSelectedMission] = useState<ParticipantMissionItem | null>(null);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [liveToast, setLiveToast] = useState<string | null>(null);
  const [deferredPwaPrompt, setDeferredPwaPrompt] = useState<any>(null);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null);

  const handleOpenCertificate = async () => {
    try {
      const res = await apiFetch<{ certificate: CertificateData }>('/api/participant/certificate');
      setCertificateData(res.certificate);
      setShowCertificate(true);
    } catch {
      alert('Não foi possível gerar o certificado neste momento.');
    }
  };

  const loadDashboard = useCallback(async () => {
    try {
      const res = await apiFetch<DashboardResponse>('/api/participant/dashboard');
      setData(res);
    } catch {
      // session handled by AuthContext
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  // Atualizações instantâneas por WebSocket (novas missões liberadas pelo agendador, pontos, avaliações, medalhas)
  useEffect(() => {
    const socket = getRealtimeSocket();

    const onActivityReleased = (payload: { title: string; kind: string; points: number }) => {
      setLiveToast(
        `Nova atividade liberada agora: "${payload.title}" (+${payload.points} pts)!`
      );
      void loadDashboard();
    };

    const onNotificationNew = (notif: { title: string; message: string }) => {
      setLiveToast(`${notif.title} — ${notif.message}`);
      void loadDashboard();
    };

    const onSilentSync = () => {
      void loadDashboard();
    };

    socket.on('activity:released', onActivityReleased);
    socket.on('activity:closed', onSilentSync);
    socket.on('notification:new', onNotificationNew);
    socket.on('notification:refresh', onSilentSync);
    socket.on('points:updated', onSilentSync);
    socket.on('badge:unlocked', onSilentSync);

    return () => {
      socket.off('activity:released', onActivityReleased);
      socket.off('activity:closed', onSilentSync);
      socket.off('notification:new', onNotificationNew);
      socket.off('notification:refresh', onSilentSync);
      socket.off('points:updated', onSilentSync);
      socket.off('badge:unlocked', onSilentSync);
    };
  }, [loadDashboard]);

  // Suporte PWA Install Prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPwaPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPwaPrompt) return;
    deferredPwaPrompt.prompt();
    await deferredPwaPrompt.userChoice;
    setDeferredPwaPrompt(null);
  };

  const handleEnablePush = async () => {
    if (
      !publicConfig?.vapidPublicKey ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      setLiveToast('Notificações internas em tempo real já estão ativas no seu painel!');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicConfig.vapidPublicKey),
      });
      await apiFetch('/api/participant/push-subscribe', {
        method: 'POST',
        body: JSON.stringify(sub.toJSON()),
      });
      setPushSubscribed(true);
      setLiveToast('Notificações Push ativadas com sucesso neste dispositivo!');
    } catch {
      setLiveToast('Não foi possível registrar Push externo neste navegador.');
    }
  };

  const handleMarkNotificationsRead = async () => {
    await apiFetch('/api/participant/notifications/read-all', { method: 'POST' });
    void loadDashboard();
  };

  const handleAvatarUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append('avatar', f);
    try {
      await apiFetch('/api/auth/profile', { method: 'PATCH', body: fd });
      await Promise.all([loadDashboard(), refreshUser()]);
      setLiveToast('Foto de perfil atualizada com sucesso!');
    } catch (err: any) {
      setLiveToast(err?.message || 'Erro ao atualizar foto.');
    }
  };

  const handleToggleImageConsent = async (checked: boolean) => {
    try {
      await apiFetch('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ imageConsent: checked }),
      });
      await loadDashboard();
    } catch {
      // ignore
    }
  };

  const handleExportLgpdData = async () => {
    const exported = await apiFetch('/api/auth/lgpd-export');
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meus-dados-sipat2026-lgpd.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteLgpdAccount = async () => {
    const confirmed = window.confirm(
      'ATENÇÃO (LGPD): Deseja realmente excluir/anonimizar permanentemente seus dados pessoais e mídias desta conta? Esta ação não pode ser desfeita.'
    );
    if (!confirmed) return;
    await apiFetch('/api/auth/lgpd-account', { method: 'DELETE' });
    await logout();
    navigate('/');
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center text-sm text-slate-600">
        Carregando plataforma de desafios SIPAT 2026...
      </div>
    );
  }

  const { profile } = data;
  const filteredMissions =
    dayFilter === 'ALL'
      ? data.missions
      : data.missions.filter((m) => m.eventDay === dayFilter);

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col">
      {/* Barra Superior Institucional */}
      <header className="bg-[#1E293B] text-white border-b-4 border-[#E30613] sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link to="/">
            <InstitutionalBrand
              officialLogoUrl={publicConfig?.officialLogoUrl}
              schoolName={publicConfig?.schoolName}
              variant="light"
              compact
            />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="/docs/MANUAL_SIPAT_2026_SENAI_MOOCA.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 bg-[#E30613] hover:bg-[#C2040F] text-white font-bold text-xs px-3 py-1.5 rounded transition-colors shadow-2xs"
              title="Baixar Manual do Aluno em PDF com prints do sistema"
            >
              <BookOpen size={14} />
              <span>Manual PDF</span>
            </a>
            <button
              type="button"
              onClick={handleOpenCertificate}
              className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs px-3 py-1.5 rounded cursor-pointer transition-colors shadow-2xs"
            >
              <Award size={14} />
              <span>Certificado 20h</span>
            </button>
            {deferredPwaPrompt && (
              <button
                type="button"
                onClick={handleInstallPwa}
                className="hidden sm:inline-flex items-center gap-1.5 bg-[#FFB800] text-[#0F172A] font-bold text-xs px-3 py-1.5 rounded cursor-pointer"
              >
                <Smartphone size={14} />
                <span>Instalar App</span>
              </button>
            )}

            <Link
              to="/ranking"
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded text-xs font-semibold"
            >
              <Trophy size={14} className="text-[#FFB800]" />
              <span className="hidden sm:inline">Ranking Geral</span>
            </Link>

            {/* Botão de Notificações */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifPanel((v) => !v)}
                className="relative bg-white/10 hover:bg-white/20 p-2 rounded cursor-pointer"
                aria-label="Notificações"
              >
                <Bell size={18} />
                {data.unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#FFB800] text-[#0F172A] font-mono-tech font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                    {data.unreadNotificationsCount}
                  </span>
                )}
              </button>

              {showNotifPanel && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white text-[#0F172A] border border-slate-300 rounded-md shadow-xl z-40 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-slate-700">
                      Central de Avisos
                    </span>
                    <button
                      type="button"
                      onClick={handleMarkNotificationsRead}
                      className="text-[11px] text-[#E30613] font-semibold hover:underline cursor-pointer"
                    >
                      Marcar todas como lidas
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {data.notifications.length === 0 ? (
                      <p className="p-4 text-xs text-slate-500 text-center">
                        Nenhuma notificação registrada até o momento.
                      </p>
                    ) : (
                      data.notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3 text-xs ${n.isRead ? 'bg-white' : 'bg-red-50/60'}`}
                        >
                          <div className="font-bold text-[#1E293B]">{n.title}</div>
                          <div className="text-slate-600 mt-0.5">{n.message}</div>
                          <div className="text-[10px] font-mono-tech text-slate-400 mt-1">
                            {new Date(n.createdAt).toLocaleString('pt-BR')}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {publicConfig?.vapidPublicKey && !pushSubscribed && (
                    <div className="p-2.5 bg-slate-50 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={handleEnablePush}
                        className="w-full text-xs bg-[#E30613] hover:bg-[#C2040F] text-white font-semibold py-1.5 rounded cursor-pointer"
                      >
                        Ativar Notificações Push neste Dispositivo
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate('/');
              }}
              className="inline-flex items-center gap-1 bg-white/10 hover:bg-red-600 px-2.5 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer"
              title="Sair"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Alerta em Tempo Real via WebSocket */}
      {liveToast && (
        <div className="bg-[#0F172A] text-white border-b-2 border-[#FFB800]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Radio size={15} className="text-[#FFB800] animate-pulse shrink-0" />
              <span className="font-semibold">{liveToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setLiveToast(null)}
              className="text-slate-400 hover:text-white font-bold cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Crachá Digital Técnico do Participante */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 flex items-center gap-4">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-[#E30613] text-white border-2 border-slate-200 overflow-hidden flex items-center justify-center font-extrabold text-2xl shrink-0 shadow-xs">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                profile.initials
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-red-50 text-[#E30613] border border-red-200">
                  NÍVEL {profile.level} • {profile.levelTitle}
                </span>
                {profile.registrationCode && (
                  <span className="text-[11px] font-mono-tech text-slate-500">
                    ID: {profile.registrationCode}
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#1E293B] truncate mt-1">
                {profile.fullName}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 truncate">
                {profile.classGroup
                  ? `[${profile.classGroup.code}] ${profile.classGroup.name}`
                  : 'Participante SIPAT 2026'}
              </p>

              {/* Barra de Progresso de Nível */}
              <div className="mt-2.5 max-w-md">
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                  <span>Progresso de Nível Preventivo</span>
                  <span className="font-semibold text-[#E30613]">
                    {profile.nextLevelPoints
                      ? `${profile.totalPoints} / ${profile.nextLevelPoints} PTS`
                      : 'Nível Máximo Alcançado!'}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#E30613] transition-all duration-500"
                    style={{ width: `${profile.levelProgressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 grid grid-cols-3 gap-3">
            <div className="bg-[#F8FAFC] border border-slate-200 border-t-4 border-t-[#E30613] rounded-xl p-3.5 text-center shadow-2xs">
              <div className="font-extrabold text-2xl sm:text-3xl text-[#E30613] tabular-nums">
                {profile.totalPoints}
              </div>
              <div className="text-[11px] uppercase font-bold text-slate-500">Pontos</div>
            </div>
            <div className="bg-[#F8FAFC] border border-slate-200 border-t-4 border-t-[#F59E0B] rounded-xl p-3.5 text-center shadow-2xs">
              <div className="font-extrabold text-2xl sm:text-3xl text-[#1E293B] tabular-nums">
                {profile.rankPosition ? `${profile.rankPosition}º` : '—'}
              </div>
              <div className="text-[11px] uppercase font-bold text-slate-500">
                No Ranking
              </div>
            </div>
            <div className="bg-[#F8FAFC] border border-slate-200 border-t-4 border-t-[#10B981] rounded-xl p-3.5 text-center shadow-2xs">
              <div className="font-extrabold text-2xl sm:text-3xl text-[#10B981] tabular-nums">
                {profile.approvedMissionsCount + profile.completedQuizzesCount}
              </div>
              <div className="text-[11px] uppercase font-bold text-slate-500">Concluídas</div>
            </div>
          </div>
        </div>

        {/* Navegação de Seções do Aluno */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto border-t border-slate-200 gap-1">
          {[
            {
              id: 'missions',
              label: `Missões & Desafios (${data.missions.length})`,
              icon: <ClipboardCheck size={16} />,
            },
            {
              id: 'quizzes',
              label: `Quizzes Técnicos (${data.quizzes.length})`,
              icon: <PlayCircle size={16} />,
            },
            {
              id: 'badges',
              label: `Medalhas (${data.badges.filter((b) => b.unlocked).length}/${data.badges.length})`,
              icon: <Award size={16} />,
            },
            {
              id: 'history',
              label: 'Histórico & LGPD',
              icon: <History size={16} />,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap border-b-3 transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[#E30613] text-[#E30613] bg-red-50/50'
                  : 'border-transparent text-slate-600 hover:text-[#1E293B]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Área Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'missions' && (
          <div className="space-y-6">
            {/* Filtro por Dia da SIPAT */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setDayFilter('ALL')}
                className={`px-3.5 py-2 rounded text-xs font-bold uppercase font-mono-tech cursor-pointer transition-colors ${
                  dayFilter === 'ALL'
                    ? 'bg-[#E30613] text-white shadow-xs'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Todos os Dias
              </button>
              {SIPAT_EVENT_DAYS.map((d) => (
                <button
                  key={d.day}
                  type="button"
                  onClick={() => setDayFilter(d.day)}
                  className={`px-3.5 py-2 rounded text-xs font-bold uppercase font-mono-tech cursor-pointer transition-colors ${
                    dayFilter === d.day
                      ? 'bg-[#E30613] text-white shadow-xs'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Dia {d.day} ({d.shortDate})
                </button>
              ))}
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredMissions.map((m) => {
                const sub = m.mySubmission;
                return (
                  <div
                    key={m.id}
                    className="bg-white border border-slate-200 rounded-md overflow-hidden flex flex-col justify-between shadow-2xs"
                  >
                    <div>
                      {m.bannerUrl && (
                        <div className="h-32 bg-slate-900 relative overflow-hidden">
                          <img
                            src={m.bannerUrl}
                            alt={m.title}
                            className="w-full h-full object-cover opacity-85"
                          />
                          <div className="absolute top-2.5 left-2.5 bg-[#0F172A]/90 text-white text-[10px] font-mono-tech font-bold px-2 py-1 rounded">
                            DIA {m.eventDay} • {m.eventDateLabel}
                          </div>
                          <div className="absolute top-2.5 right-2.5 bg-[#E30613] text-white text-xs font-bold px-2.5 py-0.5 rounded">
                            +{m.points} PTS
                          </div>
                        </div>
                      )}

                      <div className="p-4 space-y-2">
                        <div className="flex items-center justify-between gap-2 text-[11px] font-mono-tech">
                          <span className="text-[#E30613] font-bold uppercase">{m.category}</span>
                          <span className="text-slate-500">
                            {m.participationMode === 'TEAM' ? 'Individual / Equipe' : 'Individual'}
                          </span>
                        </div>
                        <h3 className="font-bold text-base text-[#1E293B]">{m.title}</h3>
                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                          {m.summary}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 pt-3 border-t border-slate-100 bg-[#F8FAFC] flex items-center justify-between gap-2">
                      {sub ? (
                        <span
                          className={`text-[11px] font-mono-tech font-bold px-2.5 py-1 rounded flex items-center gap-1 ${
                            sub.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sub.status === 'PENDING'
                              ? 'bg-red-100 text-[#E30613]'
                              : sub.status === 'NEEDS_CORRECTION'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {sub.status === 'APPROVED' && <CheckCircle2 size={13} />}
                          {sub.status === 'PENDING' && <Clock size={13} />}
                          {sub.status === 'NEEDS_CORRECTION' && <AlertTriangle size={13} />}
                          {sub.status === 'APPROVED'
                            ? `APROVADA (+${sub.awardedPoints})`
                            : sub.status === 'PENDING'
                            ? 'EM ANÁLISE'
                            : sub.status === 'NEEDS_CORRECTION'
                            ? 'CORRIGIR ENVIO'
                            : 'REPROVADA'}
                        </span>
                      ) : m.status === 'SCHEDULED' ? (
                        <span className="text-[11px] font-mono-tech font-semibold text-amber-800 bg-amber-100 px-2.5 py-1 rounded flex items-center gap-1">
                          <Clock size={13} />
                          Agendada{' '}
                          {m.opensAt
                            ? new Date(m.opensAt).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono-tech font-semibold text-emerald-700">
                          Disponível agora
                        </span>
                      )}

                      <button
                        type="button"
                        disabled={m.status === 'SCHEDULED'}
                        onClick={() => setSelectedMission(m)}
                        className="bg-[#E30613] hover:bg-[#C2040F] disabled:bg-slate-300 disabled:text-slate-500 text-white text-xs font-bold px-3.5 py-2 rounded cursor-pointer transition-colors shadow-2xs"
                      >
                        {sub
                          ? sub.status === 'NEEDS_CORRECTION'
                            ? 'Corrigir'
                            : 'Ver Registro'
                          : m.status === 'SCHEDULED'
                          ? 'Aguardando'
                          : 'Participar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'quizzes' && (
          <div className="grid md:grid-cols-2 gap-5">
            {data.quizzes.map((q) => {
              const exhausted = q.attemptsUsed >= q.maxAttempts;
              return (
                <div
                  key={q.id}
                  className="bg-white border border-slate-200 border-l-4 border-l-[#E30613] rounded-md p-5 flex flex-col justify-between gap-4 shadow-2xs"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono-tech mb-2">
                      <span className="text-[#E30613] font-bold">
                        DIA {q.eventDay} ({q.eventDateLabel}) • {q.category}
                      </span>
                      <span className="bg-red-100 text-[#E30613] font-bold px-2 py-0.5 rounded">
                        ATÉ {q.maxPoints} PTS
                      </span>
                    </div>
                    <h3 className="font-bold text-base sm:text-lg text-[#1E293B]">{q.title}</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{q.description}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500 font-mono-tech">
                      <span>{q.questionsCount} questões</span>
                      <span>•</span>
                      <span>Tempo: {Math.round(q.durationSeconds / 60)} min</span>
                      <span>•</span>
                      <span>
                        Tentativas: {q.attemptsUsed}/{q.maxAttempts}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
                    {q.bestScorePercent !== null ? (
                      <div className="text-xs">
                        <span className="text-slate-500">Melhor desempenho: </span>
                        <strong className="text-emerald-700">
                          {q.bestScorePercent}% ({q.bestAwardedPoints} pts)
                        </strong>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">Ainda não respondido</span>
                    )}

                    <button
                      type="button"
                      disabled={q.status !== 'PUBLISHED' || exhausted}
                      onClick={() => setActiveQuizId(q.id)}
                      className="bg-[#E30613] hover:bg-[#C2040F] disabled:bg-slate-200 disabled:text-slate-500 text-white text-xs font-bold px-4 py-2.5 rounded cursor-pointer transition-colors shadow-2xs"
                    >
                      {q.status === 'SCHEDULED'
                        ? 'Agendado'
                        : exhausted
                        ? 'Concluído'
                        : q.attemptsUsed > 0
                        ? 'Nova Tentativa'
                        : 'Iniciar Quiz'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'badges' && (
          <div className="space-y-8">
            <div>
              <h2 className="font-bold text-lg text-[#0F172A] mb-3">
                Suas Medalhas e Insígnias de Segurança
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {data.badges.map((b) => (
                  <div
                    key={b.id}
                    className={`rounded-md border p-4 flex flex-col justify-between gap-3 ${
                      b.unlocked
                        ? 'bg-white border-[#E30613]'
                        : 'bg-slate-100 border-slate-200 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <BadgeIcon
                        iconName={b.iconName}
                        accentColor={b.accentColor}
                        unlocked={b.unlocked}
                        size="lg"
                      />
                      <span
                        className={`text-[10px] font-mono-tech font-bold px-2 py-0.5 rounded ${
                          b.unlocked
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {b.unlocked ? 'CONQUISTADA' : 'BLOQUEADA'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#1E293B]">{b.name}</h3>
                      <p className="text-xs text-slate-600 mt-1">{b.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-md p-5">
              <h3 className="font-bold text-base text-[#1E293B] mb-3">
                Escala de Níveis de Prevenção SIPAT 2026
              </h3>
              <div className="grid sm:grid-cols-5 gap-3">
                {SIPAT_LEVELS.map((lvl) => {
                  const reached = profile.totalPoints >= lvl.minPoints;
                  return (
                    <div
                      key={lvl.level}
                      className={`p-3 rounded border text-xs ${
                        reached
                          ? 'bg-red-50/60 border-[#E30613] text-[#1E293B]'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <div className="font-mono-tech font-bold text-[#E30613]">
                        NÍVEL {lvl.level}
                      </div>
                      <div className="font-bold mt-0.5">{lvl.title}</div>
                      <div className="text-[11px] mt-1">{lvl.minPoints}+ pontos</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md p-5">
              <h2 className="font-bold text-base text-[#1E293B] mb-4">
                Extrato Auditável de Pontuação
              </h2>
              {data.pointHistory.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  Nenhuma movimentação de pontos registrada ainda. Participe de uma missão ou quiz!
                </p>
              ) : (
                <div className="divide-y divide-slate-200">
                  {data.pointHistory.map((item) => (
                    <div
                      key={item.id}
                      className="py-3 flex items-center justify-between gap-4 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-[#1E293B]">{item.reason}</div>
                        <div className="text-[11px] font-mono-tech text-slate-500">
                          {new Date(item.createdAt).toLocaleString('pt-BR')} • Saldo após:{' '}
                          {item.balanceAfter} pts
                        </div>
                      </div>
                      <span
                        className={`font-mono-tech font-bold text-sm shrink-0 ${
                          item.delta >= 0 ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {item.delta >= 0 ? `+${item.delta}` : item.delta} PTS
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-5 space-y-5">
              <div className="bg-white border border-slate-200 rounded-md p-5 space-y-4">
                <div className="flex items-center gap-2 font-bold text-sm text-[#1E293B]">
                  <Shield size={18} className="text-[#E30613]" />
                  <span>Perfil, Privacidade e Direitos LGPD</span>
                </div>

                <div>
                  <label className="inline-flex items-center gap-2 bg-[#E30613] hover:bg-[#C2040F] text-white text-xs font-semibold px-3.5 py-2 rounded cursor-pointer">
                    <Camera size={14} />
                    <span>Atualizar Foto de Perfil</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleAvatarUpdate}
                    />
                  </label>
                </div>

                <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer pt-2 border-t border-slate-200">
                  <input
                    type="checkbox"
                    checked={profile.imageConsent}
                    onChange={(e) => handleToggleImageConsent(e.target.checked)}
                    className="mt-0.5 accent-[#E30613]"
                  />
                  <span>
                    Autorizo o uso institucional e educativo de imagem na campanha SIPAT 2026
                    (evidências permanecem privadas por padrão).
                  </span>
                </label>

                <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleExportLgpdData}
                    className="inline-flex items-center justify-center gap-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold py-2 px-3 rounded cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Baixar Cópia dos Meus Dados (Portabilidade LGPD)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteLgpdAccount}
                    className="inline-flex items-center justify-center gap-1.5 border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold py-2 px-3 rounded cursor-pointer"
                  >
                    <Trash2 size={14} />
                    <span>Solicitar Exclusão e Anonimização da Conta</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {selectedMission && (
        <MissionSubmitModal
          mission={selectedMission}
          onClose={() => setSelectedMission(null)}
          onSubmitted={() => {
            setLiveToast('Participação registrada com sucesso!');
            void loadDashboard();
          }}
        />
      )}

      {activeQuizId && (
        <QuizRunnerModal
          quizId={activeQuizId}
          onClose={() => setActiveQuizId(null)}
          onCompleted={() => void loadDashboard()}
        />
      )}

      {showCertificate && certificateData && (
        <CertificateModal
          data={certificateData}
          onClose={() => setShowCertificate(false)}
        />
      )}
    </div>
  );
};

