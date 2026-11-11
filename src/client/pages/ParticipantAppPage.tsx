import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  FlaskConical,
  GraduationCap,
  Home,
  LogOut,
  PlayCircle,
  Radio,
  Shield,
  Smartphone,
  Trash2,
  Trophy,
  User as UserIcon,
  X,
} from 'lucide-react';
import { SIPAT_EVENT_DAYS, SIPAT_LEVELS } from '@shared/constants';
import { BadgeIcon } from '../components/BadgeIcon';
import { CertificateData, CertificateModal } from '../components/CertificateModal';
import { InstitutionalBrand } from '../components/InstitutionalBrand';
import { MissionSubmitModal, ParticipantMissionItem } from '../components/MissionSubmitModal';
import { QuizRunnerModal } from '../components/QuizRunnerModal';
import { Avatar } from '../components/social/Avatar';
import { FeedView } from '../components/social/FeedView';
import { ProfileView } from '../components/social/ProfileView';
import { RankingView } from '../components/social/RankingView';
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
    linkUrl?: string | null;
    isRead: boolean;
    createdAt: string;
  }>;
  unreadNotificationsCount: number;
  certificateStatus: {
    requiredMissions: number;
    doneMissions: number;
    requiredQuizzes: number;
    doneQuizzes: number;
    totalRequired: number;
    totalDone: number;
    progressPercent: number;
    isComplete: boolean;
    released: boolean;
  };
}

type MainTab = 'feed' | 'activities' | 'ranking' | 'profile';

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

/**
 * Rede social dos alunos da SIPAT:
 *  - MURAL: publicações dos colegas (participações aprovadas) com curtidas e comentários
 *  - ATIVIDADES: missões e quizzes cadastrados pela coordenação, que geram os pontos
 *  - RANKING: posição na escola, na turma e entre turmas
 *  - PERFIL: o seu perfil (e o de qualquer colega), medalhas, extrato e privacidade
 */
export const ParticipantAppPage: React.FC = () => {
  const { publicConfig, logout, refreshUser, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = (searchParams.get('tab') as MainTab) || 'feed';
  const [tab, setTab] = useState<MainTab>(
    ['feed', 'activities', 'ranking', 'profile'].includes(initialTab) ? initialTab : 'feed'
  );
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(searchParams.get('u'));
  const [focusPostId, setFocusPostId] = useState<string | null>(searchParams.get('post'));
  const [activityKind, setActivityKind] = useState<'missions' | 'quizzes'>('missions');
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dayFilter, setDayFilter] = useState<number | 'ALL'>('ALL');
  const [selectedMission, setSelectedMission] = useState<ParticipantMissionItem | null>(null);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [liveToast, setLiveToast] = useState<string | null>(null);
  const [deferredPwaPrompt, setDeferredPwaPrompt] = useState<any>(null);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null);
  const [pendingCertInfo, setPendingCertInfo] = useState<any | null>(null);

  // Mantém a URL coerente com a navegação (permite voltar/compartilhar link interno)
  const goTo = useCallback(
    (next: MainTab, opts?: { profileId?: string | null; postId?: string | null }) => {
      setTab(next);
      setViewingProfileId(opts?.profileId ?? null);
      setFocusPostId(opts?.postId ?? null);
      const qs: Record<string, string> = {};
      if (next !== 'feed') qs.tab = next;
      if (opts?.profileId) qs.u = opts.profileId;
      if (opts?.postId) qs.post = opts.postId;
      setSearchParams(qs, { replace: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setSearchParams]
  );

  const openProfile = useCallback(
    (userId: string) => goTo('profile', { profileId: userId === user?.id ? null : userId }),
    [goTo, user?.id]
  );

  const handleOpenCertificate = async () => {
    try {
      const res = await apiFetch<any>('/api/participant/certificate');
      if (res.released && res.certificate) {
        setCertificateData(res.certificate);
        setShowCertificate(true);
      } else {
        setPendingCertInfo(res.candidate || { message: res.message });
      }
    } catch {
      alert('Não foi possível verificar o certificado neste momento.');
    }
  };

  const loadDashboard = useCallback(async () => {
    try {
      const res = await apiFetch<DashboardResponse>('/api/participant/dashboard');
      setData(res);
    } catch {
      // sessão tratada pelo AuthContext
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  // Tempo real: atividades liberadas, avaliações, pontos e notificações sociais
  useEffect(() => {
    const socket = getRealtimeSocket();

    const onActivityReleased = (payload: { title: string; kind: string; points: number }) => {
      setLiveToast(`Nova atividade liberada: "${payload.title}" (+${payload.points} pts)!`);
      void loadDashboard();
    };
    const onNotificationNew = (notif: { title: string; message: string; type: string }) => {
      setLiveToast(`${notif.title} — ${notif.message}`);
      void loadDashboard();
    };
    const onSilentSync = () => void loadDashboard();

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
    if (!publicConfig?.vapidPublicKey || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setLiveToast('As notificações em tempo real já estão ativas no seu painel!');
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
      await apiFetch('/api/participant/push-subscribe', { method: 'POST', body: JSON.stringify(sub.toJSON()) });
      setPushSubscribed(true);
      setLiveToast('Notificações push ativadas neste dispositivo!');
    } catch {
      setLiveToast('Não foi possível ativar push neste navegador.');
    }
  };

  const handleMarkNotificationsRead = async () => {
    await apiFetch('/api/participant/notifications/read-all', { method: 'POST' });
    void loadDashboard();
  };

  const handleNotificationClick = (link?: string | null) => {
    setShowNotifPanel(false);
    if (!link) return;
    const url = new URL(link, window.location.origin);
    const post = url.searchParams.get('post');
    const t = url.searchParams.get('tab') as MainTab | null;
    if (post) goTo('feed', { postId: post });
    else if (t) goTo(t);
  };

  const uploadAvatar = async (f: File) => {
    const fd = new FormData();
    fd.append('avatar', f);
    try {
      await apiFetch('/api/auth/profile', { method: 'PATCH', body: fd });
      await Promise.all([loadDashboard(), refreshUser()]);
      setProfileRefreshKey((k) => k + 1);
      setLiveToast('Foto de perfil atualizada!');
    } catch (err: any) {
      setLiveToast(err?.message || 'Erro ao atualizar foto.');
    }
  };

  const handleAvatarUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) await uploadAvatar(f);
  };

  const handleToggleImageConsent = async (checked: boolean) => {
    try {
      await apiFetch('/api/auth/profile', { method: 'PATCH', body: JSON.stringify({ imageConsent: checked }) });
      await Promise.all([loadDashboard(), refreshUser()]);
      setProfileRefreshKey((k) => k + 1);
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
      'ATENÇÃO (LGPD): Deseja realmente excluir/anonimizar permanentemente seus dados pessoais, publicações, comentários e mídias? Esta ação não pode ser desfeita.'
    );
    if (!confirmed) return;
    await apiFetch('/api/auth/lgpd-account', { method: 'DELETE' });
    await logout();
    navigate('/');
  };

  const openActivities = useMemo(() => {
    if (!data) return [] as Array<{ id: string; title: string; points: number; kind: 'mission' | 'quiz' }>;
    const m = data.missions
      .filter((x) => x.status === 'PUBLISHED' && (!x.mySubmission || x.mySubmission.status === 'NEEDS_CORRECTION'))
      .map((x) => ({ id: x.id, title: x.title, points: x.points, kind: 'mission' as const }));
    const q = data.quizzes
      .filter((x) => x.status === 'PUBLISHED' && x.attemptsUsed < x.maxAttempts)
      .map((x) => ({ id: x.id, title: x.title, points: x.maxPoints, kind: 'quiz' as const }));
    return [...m, ...q];
  }, [data]);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center text-sm text-slate-600">
        Carregando a rede SIPAT...
      </div>
    );
  }

  const { profile } = data;
  const filteredMissions = dayFilter === 'ALL' ? data.missions : data.missions.filter((m) => m.eventDay === dayFilter);
  const needsCorrection = data.missions.filter((m) => m.mySubmission?.status === 'NEEDS_CORRECTION').length;

  const navItems: Array<{ id: MainTab; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'feed', label: 'Mural', icon: <Home size={20} /> },
    { id: 'activities', label: 'Atividades', icon: <ClipboardCheck size={20} />, badge: openActivities.length },
    { id: 'ranking', label: 'Ranking', icon: <Trophy size={20} /> },
    { id: 'profile', label: 'Perfil', icon: <UserIcon size={20} /> },
  ];

  const openActivity = (a: { id: string; kind: 'mission' | 'quiz' }) => {
    if (a.kind === 'quiz') setActiveQuizId(a.id);
    else {
      const m = data.missions.find((x) => x.id === a.id);
      if (m) setSelectedMission(m);
    }
  };

  // Chamada para ação no topo do mural: é assim que o aluno "publica" (participando de atividades)
  const feedHeader = (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
      <div className="flex items-center gap-3">
        <Avatar name={profile.fullName} initials={profile.initials} url={profile.avatarUrl} onClick={() => openProfile(profile.id)} />
        <button
          type="button"
          onClick={() => goTo('activities')}
          className="flex-1 text-left bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm rounded-full px-4 py-2.5 cursor-pointer"
        >
          {openActivities.length > 0
            ? `Participe de uma atividade e apareça no mural (${openActivities.length} aberta${openActivities.length > 1 ? 's' : ''})`
            : 'Nenhuma atividade aberta agora — fique de olho nas próximas!'}
        </button>
      </div>
      {needsCorrection > 0 && (
        <button
          type="button"
          onClick={() => goTo('activities')}
          className="mt-3 w-full text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-900 rounded-md px-3 py-2 flex items-center gap-2 cursor-pointer"
        >
          <AlertTriangle size={14} /> {needsCorrection} participação(ões) precisam de correção. Toque para revisar.
        </button>
      )}
    </div>
  );

  const ownProfileExtras = (
    <>
      {/* Medalhas que ainda podem ser conquistadas e escala de níveis */}
      <section className="bg-white border border-slate-200 rounded-xl p-4">
        <details>
          <summary className="font-bold text-sm text-[#1E293B] cursor-pointer">Todas as medalhas e níveis</summary>
          <div className="mt-4">
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
          </div>
        </details>
      </section>

      {/* Certificado: só aparece para emissão quando o aluno concluiu TODOS os desafios */}
      {data.certificateStatus.isComplete || data.certificateStatus.released ? (
        <section className="bg-white border border-amber-300 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={handleOpenCertificate}
            className="w-full flex items-center gap-3 p-4 hover:bg-amber-50/50 text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <GraduationCap size={20} />
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm text-[#1E293B]">
                {data.certificateStatus.released ? 'Emitir certificado (20h)' : 'Todos os desafios concluídos!'}
              </div>
              <div className="text-xs text-slate-500">
                {data.certificateStatus.released
                  ? 'Liberado pela coordenação. Toque para ver e baixar.'
                  : 'Aguardando a coordenação liberar o seu certificado.'}
              </div>
            </div>
            <Award size={18} className="text-amber-600" />
          </button>
        </section>
      ) : (
        <section className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-[#1E293B]">Desafios concluídos</span>
            <span className="font-mono-tech font-bold text-[#E30613]">
              {data.certificateStatus.totalDone}/{data.certificateStatus.totalRequired}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-[#E30613]" style={{ width: `${data.certificateStatus.progressPercent}%` }} />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Missões {data.certificateStatus.doneMissions}/{data.certificateStatus.requiredMissions} • Quizzes{' '}
            {data.certificateStatus.doneQuizzes}/{data.certificateStatus.requiredQuizzes}. O certificado de 20h fica
            disponível quando você concluir todos.
          </p>
        </section>
      )}

      <details className="bg-white border border-slate-200 rounded-xl p-4">
        <summary className="font-bold text-sm text-[#1E293B] cursor-pointer">Extrato de pontos</summary>
        <div className="mt-3">
            <div className="">
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
        </div>
      </details>

      <details className="bg-white border border-slate-200 rounded-xl p-4" open={!profile.imageConsent}>
        <summary className="font-bold text-sm text-[#1E293B] cursor-pointer">Privacidade e dados (LGPD)</summary>
        {!profile.imageConsent && (
          <p className="mt-3 text-xs bg-blue-50 border border-blue-200 text-blue-900 rounded-md p-2.5">
            Sem a autorização de uso de imagem, suas publicações aparecem no mural só com texto (sem foto/vídeo) e sua
            foto de perfil fica visível apenas para você e para a equipe.
          </p>
        )}
        <div className="mt-3">
              <div className="space-y-4">
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
      </details>
    </>
  );

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col pb-16 lg:pb-0">
      {/* Barra superior */}
      <header className="bg-[#1E293B] text-white border-b-4 border-[#E30613] sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <button type="button" onClick={() => goTo('feed')} className="min-w-0 cursor-pointer">
            <InstitutionalBrand officialLogoUrl={publicConfig?.officialLogoUrl} schoolName={publicConfig?.schoolName} variant="light" compact fullFrom="xl" />
          </button>

          <nav className="hidden lg:flex items-center gap-1 whitespace-nowrap shrink-0">
            {navItems.map((n) => (
              <button
                key={n.id}
                title={n.label}
                type="button"
                onClick={() => goTo(n.id)}
                className={`relative px-3 py-1.5 rounded text-sm font-semibold flex items-center gap-1.5 cursor-pointer ${
                  tab === n.id ? 'bg-white/15 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                {n.icon}
                <span className="hidden xl:inline">{n.label}</span>
                {!!n.badge && (
                  <span className="bg-[#E30613] text-white text-[10px] font-bold rounded-full px-1.5">{n.badge}</span>
                )}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 shrink-0">
            {deferredPwaPrompt && (
              <button
                type="button"
                onClick={handleInstallPwa}
                className="hidden sm:inline-flex items-center gap-1.5 bg-[#FFB800] text-[#0F172A] font-bold text-xs px-3 py-1.5 rounded cursor-pointer"
              >
                <Smartphone size={14} /> Instalar
              </button>
            )}
            <a
              href="/docs/MANUAL_SIPAT_2026_SENAI_MOOCA.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex bg-white/10 hover:bg-white/20 p-2 rounded"
              title="Manual do aluno (PDF)"
            >
              <BookOpen size={17} />
            </a>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifPanel((v) => !v)}
                className="relative bg-white/10 hover:bg-white/20 p-2 rounded cursor-pointer"
                aria-label="Notificações"
              >
                <Bell size={18} />
                {data.unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#FFB800] text-[#0F172A] font-bold text-[10px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center">
                    {data.unreadNotificationsCount}
                  </span>
                )}
              </button>

              {showNotifPanel && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white text-[#0F172A] border border-slate-300 rounded-md shadow-xl z-40 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-slate-700">Notificações</span>
                    <button
                      type="button"
                      onClick={handleMarkNotificationsRead}
                      className="text-[11px] text-[#E30613] font-semibold hover:underline cursor-pointer"
                    >
                      Marcar todas como lidas
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {data.notifications.length === 0 ? (
                      <p className="p-4 text-xs text-slate-500 text-center">Nenhuma notificação por enquanto.</p>
                    ) : (
                      data.notifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => handleNotificationClick(n.linkUrl)}
                          className={`w-full text-left p-3 text-xs cursor-pointer hover:bg-slate-50 ${n.isRead ? 'bg-white' : 'bg-red-50/60'}`}
                        >
                          <div className="font-bold text-[#1E293B]">{n.title}</div>
                          <div className="text-slate-600 mt-0.5">{n.message}</div>
                          <div className="text-[10px] font-mono-tech text-slate-400 mt-1">
                            {new Date(n.createdAt).toLocaleString('pt-BR')}
                          </div>
                        </button>
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
                        Ativar notificações push neste dispositivo
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
              className="inline-flex items-center gap-1 bg-white/10 hover:bg-red-600 px-2.5 py-2 rounded text-xs font-semibold transition-colors cursor-pointer"
              title="Sair"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {liveToast && (
        <div className="bg-[#0F172A] text-white border-b-2 border-[#FFB800]">
          <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Radio size={15} className="text-[#FFB800] animate-pulse shrink-0" />
              <span className="font-semibold">{liveToast}</span>
            </div>
            <button type="button" onClick={() => setLiveToast(null)} className="text-slate-400 hover:text-white font-bold cursor-pointer">
              Fechar
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-5 grid lg:grid-cols-12 gap-5">
        {/* Coluna esquerda: cartão do aluno (desktop) */}
        <aside className="hidden lg:block lg:col-span-3 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 sticky top-20">
            <button type="button" onClick={() => openProfile(profile.id)} className="flex items-center gap-3 text-left w-full cursor-pointer">
              <Avatar size="lg" name={profile.fullName} initials={profile.initials} url={profile.avatarUrl} />
              <div className="min-w-0">
                <div className="font-bold text-[#1E293B] truncate">{profile.fullName}</div>
                <div className="text-xs text-slate-500 truncate">{profile.classGroup?.code || 'Sem turma'}</div>
              </div>
            </button>
            <div className="mt-3 text-[11px] font-bold uppercase text-[#E30613]">
              Nível {profile.level} • {profile.levelTitle}
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-[#E30613]" style={{ width: `${profile.levelProgressPercent}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <div>
                <div className="font-extrabold text-lg text-[#E30613] tabular-nums">{profile.totalPoints}</div>
                <div className="text-[10px] uppercase font-bold text-slate-500">pontos</div>
              </div>
              <div>
                <div className="font-extrabold text-lg text-[#1E293B] tabular-nums">
                  {profile.rankPosition ? `${profile.rankPosition}º` : '—'}
                </div>
                <div className="text-[10px] uppercase font-bold text-slate-500">ranking</div>
              </div>
              <div>
                <div className="font-extrabold text-lg text-emerald-600 tabular-nums">
                  {profile.approvedMissionsCount + profile.completedQuizzesCount}
                </div>
                <div className="text-[10px] uppercase font-bold text-slate-500">feitas</div>
              </div>
            </div>
            {profile.pendingMissionsCount > 0 && (
              <p className="mt-3 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded px-2 py-1.5 flex items-center gap-1.5">
                <Clock size={12} /> {profile.pendingMissionsCount} participação(ões) em avaliação
              </p>
            )}
          </div>
        </aside>

        {/* Conteúdo principal */}
        <main className="lg:col-span-6 min-w-0">
          {tab === 'feed' && (
            <FeedView
              onOpenProfile={openProfile}
              header={feedHeader}
              focusPostId={focusPostId}
              hasClass={Boolean(profile.classGroup)}
            />
          )}

          {tab === 'activities' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <h1 className="font-bold text-lg text-[#1E293B]">Atividades da SIPAT</h1>
                <p className="text-xs text-slate-600 mt-1">
                  Cadastradas pela coordenação. Cada participação aprovada soma pontos, conta para o ranking e vira uma
                  publicação no mural (se você quiser).
                </p>
                <div className="inline-flex bg-slate-100 rounded-full p-1 text-xs font-bold mt-3">
                  <button
                    type="button"
                    onClick={() => setActivityKind('missions')}
                    className={`px-3.5 py-1.5 rounded-full flex items-center gap-1.5 cursor-pointer ${activityKind === 'missions' ? 'bg-[#1E293B] text-white' : 'text-slate-600'}`}
                  >
                    <ClipboardCheck size={14} /> Missões ({data.missions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivityKind('quizzes')}
                    className={`px-3.5 py-1.5 rounded-full flex items-center gap-1.5 cursor-pointer ${activityKind === 'quizzes' ? 'bg-[#1E293B] text-white' : 'text-slate-600'}`}
                  >
                    <PlayCircle size={14} /> Quizzes ({data.quizzes.length})
                  </button>
                </div>
              </div>

              {activityKind === 'missions' && (
                data.missions.length === 0 ? (
                  <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-xl p-6 text-center">
                    Nenhuma missão publicada ainda.
                  </p>
                ) : (
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

            <div className="grid md:grid-cols-2 gap-4">
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

                        {/* Informações do Laboratório / Oficina Didática */}
                        {m.laboratory && (
                          <div className="bg-blue-50/70 border border-blue-200/80 rounded p-2 text-xs text-blue-950 mt-2 flex items-start gap-1.5">
                            <FlaskConical size={14} className="text-[#0047B6] shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <div className="font-bold text-[11px] text-[#0047B6] flex items-center gap-1">
                                <span>{m.laboratory.name}</span>
                                <span className="font-mono-tech text-[10px] text-blue-700">({m.laboratory.blockLocation})</span>
                              </div>
                              {m.laboratory.requiredEpis && (
                                <div className="text-[10px] text-slate-600 mt-0.5">
                                  <strong>EPIs no Local:</strong> {m.laboratory.requiredEpis}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
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
                            : 'Ver registro'
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
                )
              )}

              {activityKind === 'quizzes' && (
                data.quizzes.length === 0 ? (
                  <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-xl p-6 text-center">
                    Nenhum quiz publicado ainda.
                  </p>
                ) : (
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
                )
              )}
            </div>
          )}

          {tab === 'ranking' && <RankingView onOpenProfile={openProfile} />}

          {tab === 'profile' && (
            <ProfileView
              userId={viewingProfileId || profile.id}
              onOpenProfile={openProfile}
              onBack={viewingProfileId ? () => goTo('feed') : undefined}
              ownExtras={ownProfileExtras}
              onAvatarChange={uploadAvatar}
              refreshKey={profileRefreshKey}
            />
          )}
        </main>

        {/* Coluna direita: atividades abertas (desktop) */}
        <aside className="hidden lg:block lg:col-span-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 sticky top-20">
            <h2 className="font-bold text-sm text-[#1E293B] mb-3 flex items-center gap-1.5">
              <FlaskConical size={15} className="text-[#E30613]" /> Abertas para você
            </h2>
            {openActivities.length === 0 ? (
              <p className="text-xs text-slate-500">Nenhuma atividade pendente. Ótimo trabalho!</p>
            ) : (
              <ul className="space-y-2">
                {openActivities.slice(0, 6).map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => openActivity(a)}
                      className="w-full text-left text-xs bg-slate-50 hover:bg-red-50 border border-slate-200 rounded-md px-3 py-2 cursor-pointer"
                    >
                      <div className="font-semibold text-[#1E293B] line-clamp-2">{a.title}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {a.kind === 'quiz' ? 'Quiz' : 'Missão'} • até +{a.points} pts
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {/* Navegação inferior (celular) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 grid grid-cols-4">
        {navItems.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => goTo(n.id)}
            className={`relative py-2 flex flex-col items-center gap-0.5 text-[11px] font-semibold cursor-pointer ${
              tab === n.id ? 'text-[#E30613]' : 'text-slate-500'
            }`}
          >
            {n.icon}
            {n.label}
            {!!n.badge && (
              <span className="absolute top-1 right-1/4 bg-[#E30613] text-white text-[9px] font-bold rounded-full px-1.5">{n.badge}</span>
            )}
          </button>
        ))}
      </nav>

      {selectedMission && (
        <MissionSubmitModal
          mission={selectedMission}
          onClose={() => setSelectedMission(null)}
          onSubmitted={() => {
            setLiveToast('Participação enviada! Assim que for aprovada, os pontos entram e ela aparece no mural.');
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

      {/* Modal Informativo: Certificado em Homologação pela Coordenação */}
      {pendingCertInfo && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 rounded-xl max-w-md w-full p-6 shadow-2xl relative text-xs animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setPendingCertInfo(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold p-1 rounded-md"
            >
              <X size={18} />
            </button>

            <div className="text-center pb-4 border-b border-slate-100">
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                <GraduationCap size={28} />
              </div>
              <span className="font-mono-tech text-[10px] text-[#E30613] font-bold uppercase tracking-wider">
                SIPAT 2026 • CARGA HORÁRIA 20H
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                Certificado Oficial em Homologação
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Escola SENAI "Morvan Figueiredo" • Mooca, São Paulo
              </p>
            </div>

            <div className="py-4 space-y-3">
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-3 text-amber-900 text-[11px] leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-950">
                  <Clock size={13} className="text-amber-600" />
                  <span>Aguardando Liberação da Coordenação</span>
                </div>
                Conforme as diretrizes da SIPAT 2026, os certificados de 20 horas com validação digital oficial
                são homologados e disparados individualmente pela comissão organizadora/CIPA através do painel pedagógico.
              </div>

              {pendingCertInfo.progressPercent !== undefined && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Seu Progresso Atual:</span>
                    <span className="font-extrabold text-[#E30613] font-mono-tech">
                      {pendingCertInfo.progressPercent}%
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-[#E30613] h-full rounded-full transition-all"
                      style={{ width: `${pendingCertInfo.progressPercent}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <div className="text-[10px] text-slate-400 font-mono-tech">MISSÕES</div>
                      <div className="font-bold text-slate-800 text-xs mt-0.5">
                        {pendingCertInfo.approvedMissionsCount} / {pendingCertInfo.totalMissionsCount}
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <div className="text-[10px] text-slate-400 font-mono-tech">QUIZZES</div>
                      <div className="font-bold text-slate-800 text-xs mt-0.5">
                        {pendingCertInfo.completedQuizzesCount} / {pendingCertInfo.totalQuizzesCount}
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <div className="text-[10px] text-slate-400 font-mono-tech">PONTOS</div>
                      <div className="font-black text-[#E30613] text-xs mt-0.5 font-mono-tech">
                        {pendingCertInfo.totalPoints}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center text-[11px] text-slate-500 pt-1">
                {pendingCertInfo.statusText ||
                  'Assim que a coordenação homologar sua participação, você receberá uma notificação e o download em alta resolução estará disponível aqui.'}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setPendingCertInfo(null)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors cursor-pointer text-xs"
              >
                Entendido, continuar atividades
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
