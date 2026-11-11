import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  ExternalLink,
  Eye,
  FileCheck,
  Flame,
  HardHat,
  Heart,
  HelpCircle,
  Info,
  Layers,
  LogIn,
  MapPin,
  Menu,
  MessageCircle,
  MessageSquare,
  Phone,
  Play,
  QrCode,
  Radio,
  Send,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  Trophy,
  UserCheck,
  Users,
  Video,
  X,
} from 'lucide-react';
import { SIPAT_EVENT_DAYS } from '@shared/constants';
import { BadgeIcon } from '../components/BadgeIcon';
import { CertificateData, CertificateModal } from '../components/CertificateModal';
import { InstitutionalBrand } from '../components/InstitutionalBrand';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { getRealtimeSocket } from '../lib/socket';

interface SocialFeedPost {
  id: string;
  authorName: string;
  authorInitials: string;
  avatarUrl: string | null;
  classCode: string;
  className: string;
  courseArea: string;
  missionTitle: string;
  missionCategory: string;
  eventDay: number;
  eventDateLabel: string;
  textResponse: string;
  structuredData?: {
    environment?: string;
    hazardType?: string;
    consequences?: string;
    preventiveMeasures?: string;
  };
  mediaUrl: string | null;
  mediaMime?: string | null;
  hasVideo?: boolean;
  awardedPoints: number;
  feedback: string | null;
  reactionsCount: number;
  commentsCount: number;
  submittedAt: string;
}

export const LandingPage: React.FC = () => {
  const { publicConfig, user } = useAuth();
  const [feedPosts, setFeedPosts] = useState<SocialFeedPost[]>([]);
  const [rankingData, setRankingData] = useState<{
    podium: Array<{
      position: number;
      userId: string;
      displayName: string;
      classCode: string;
      totalPoints: number;
    }>;
    classRanking: Array<{
      position: number;
      code: string;
      name: string;
      totalPoints: number;
      participantsCount: number;
    }>;
  } | null>(null);
  const [feedFilter, setFeedFilter] = useState<'ALL' | 'RISK_HUNT' | 'VIDEO' | '7_ERRORS' | 'PROGRAM'>('ALL');
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [activeStory, setActiveStory] = useState<string | null>(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const schoolName = publicConfig?.schoolName || 'Escola SENAI "Morvan Figueiredo"';
  const theme =
    publicConfig?.eventTheme || 'Segurança começa com você: prevenir é uma atitude de todos!';
  const slogan = publicConfig?.eventSlogan || 'Sua atitude faz a diferença!';

  const registerHref = publicConfig?.activeQrCode
    ? `/inscricao?code=${encodeURIComponent(publicConfig.activeQrCode)}`
    : '/inscricao';

  // Carrega publicações sociais e ranking público em tempo real
  useEffect(() => {
    apiFetch<{ feed: SocialFeedPost[] }>('/api/public/feed')
      .then((res) => {
        if (res.feed) setFeedPosts(res.feed);
      })
      .catch(() => {});

    apiFetch<any>('/api/public/ranking')
      .then((res) => {
        if (res) setRankingData(res);
      })
      .catch(() => {});

  }, []);


  // Abre emissão de Certificado Oficial
  const handleOpenCertificate = async () => {
    if (user?.role === 'PARTICIPANT') {
      try {
        const res = await apiFetch<{ released?: boolean; certificate?: CertificateData }>('/api/participant/certificate');
        if (res.released && res.certificate) {
          setCertificateData(res.certificate);
          setShowCertificateModal(true);
        } else {
          window.location.href = '/app?tab=profile';
        }
        return;
      } catch {
        // fallback
      }
    }

    // Modelo Oficial de Certificado para visualização institucional
    const sampleCert: CertificateData = {
      verificationCode: 'SENAI-SIPAT2026-MODELO-OFICIAL',
      studentName: user?.fullName || 'Nome do Aluno Participante',
      registrationCode: user?.registrationCode || 'RA-00000000',
      classGroup: 'Turma Técnica Oficial • SENAI Morvan Figueiredo',
      courseArea: 'Cultura de Segurança e Formação Profissional',
      schoolName: 'Escola SENAI "Morvan Figueiredo"',
      unit: 'Escola SENAI "Morvan Figueiredo" — Mooca, São Paulo',
      institution: 'Serviço Nacional de Aprendizagem Industrial - SENAI-SP',
      eventTitle: 'SIPAT 2026',
      eventTheme: 'Segurança começa com você: prevenir é uma atitude de todos!',
      eventSlogan: 'Sua atitude faz a diferença!',
      eventDates: '16 a 19 de novembro de 2026',
      workloadHours: 20,
      totalPoints: 0,
      level: 1,
      levelTitle: 'Participante Oficial',
      approvedMissionsCount: 0,
      completedQuizzesCount: 0,
      totalActivities: 0,
      badges: [],
      signatures: [
        {
          title: 'Coordenação Geral da SIPAT 2026 / CIPA',
          name: 'Comissão Interna de Prevenção de Acidentes',
          role: 'CIPA - Gestão 2026',
        },
        {
          title: 'Direção Escolar',
          name: 'Direção da Escola SENAI "Morvan Figueiredo"',
          role: 'Diretor de Unidade de Formação Profissional',
        },
      ],
      issuedAt: new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      verificationUrl: `${window.location.origin}/validar?code=SENAI-SIPAT2026-MODELO-OFICIAL`,
    };

    setCertificateData(sampleCert);
    setShowCertificateModal(true);
  };

  // Filtragem dos posts da rede social
  const filteredPosts = feedPosts.filter((p) => {
    if (feedFilter === 'RISK_HUNT') return p.missionCategory.includes('Risco') || p.missionTitle.includes('Caça');
    if (feedFilter === 'VIDEO') return p.hasVideo || p.missionTitle.includes('Vídeo') || p.missionTitle.includes('60');
    if (feedFilter === '7_ERRORS') return p.missionTitle.includes('7 Erros') || p.missionCategory.includes('Prática');
    return true;
  });

  const dayMissions = (publicConfig?.programPreview || []).filter(
    (m) => m.eventDay === selectedDay
  );

  const STORIES = [
    {
      id: 'live',
      label: 'Ao Vivo: TV',
      icon: <Radio size={18} className="text-white animate-pulse" />,
      bg: 'bg-[#E30613]',
      tag: 'TELÃO DA ESCOLA',
      action: '/ranking',
    },
    {
      id: 'riscos',
      label: 'Caça aos Riscos',
      icon: <Camera size={18} className="text-white" />,
      bg: 'bg-amber-600',
      tag: 'DIA 1 • 16/NOV',
      action: '#caca',
    },
    {
      id: 'video',
      label: 'Vídeos 60s',
      icon: <Video size={18} className="text-white" />,
      bg: 'bg-blue-600',
      tag: 'DIA 2 • 17/NOV',
      action: '#video',
    },
    {
      id: 'erros',
      label: '7 Erros Bancada',
      icon: <Eye size={18} className="text-white" />,
      bg: 'bg-emerald-600',
      tag: 'OFICINAS 5S',
      action: '#erros',
    },
    {
      id: 'ergo',
      label: 'Ergonomia NR-17',
      icon: <Activity size={18} className="text-white" />,
      bg: 'bg-indigo-600',
      tag: 'DIA 3 • 18/NOV',
      action: '#ergo',
    },
    {
      id: 'gincana',
      label: 'Grande Gincana',
      icon: <Trophy size={18} className="text-white" />,
      bg: 'bg-yellow-600',
      tag: 'DIA 4 • 19/NOV',
      action: '#gincana',
    },
    {
      id: 'cert',
      label: 'Certificado 20h',
      icon: <Award size={18} className="text-white" />,
      bg: 'bg-rose-700',
      tag: 'EMISSÃO OFICIAL',
      action: 'cert',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F9] text-[#1E293B]">
      {/* Modal de Certificado Oficial */}
      {showCertificateModal && certificateData && (
        <CertificateModal data={certificateData} onClose={() => setShowCertificateModal(false)} />
      )}

      {/* 1. Barra Superior Institucional SENAI-SP (Padrão Oficial Mooca) */}
      <div className="bg-[#1E293B] text-slate-200 border-b-2 border-[#E30613] text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-1.5 sm:py-2 flex items-center justify-between gap-2">
          {/* Lado Esquerdo */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="inline-flex items-center gap-1.5 font-bold text-white uppercase tracking-wider text-[10px] sm:text-[11px] shrink-0">
              <span className="w-2 h-2 rounded-full bg-[#E30613] animate-pulse" />
              <span className="sm:hidden">SENAI Mooca • SIPAT 2026</span>
              <span className="hidden sm:inline">SENAI-SP • ESCOLA MORVAN FIGUEIREDO</span>
            </span>
            <span className="hidden lg:inline text-slate-500">|</span>
            <span className="hidden lg:flex items-center gap-1 text-slate-300 truncate">
              <MapPin size={12} className="text-[#E30613] shrink-0" />
              <span>Rua Oratório, 215 - Mooca, SP</span>
            </span>
            <span className="hidden xl:inline text-slate-500">|</span>
            <span className="hidden xl:flex items-center gap-1 text-slate-300">
              <Phone size={12} className="text-[#E30613] shrink-0" />
              (11) 2076-3200
            </span>
          </div>

          {/* Lado Direito */}
          <div className="flex items-center gap-2 sm:gap-4 font-semibold text-[11px] sm:text-xs shrink-0">
            <a
              href="/docs/MANUAL_SIPAT_2026_SENAI_MOOCA.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
              title="Baixar Manual Oficial em PDF"
            >
              <BookOpen size={13} className="text-[#E30613]" />
              <span className="hidden xs:inline">Manual PDF</span>
            </a>
            <span className="hidden sm:inline text-slate-600">|</span>
            <button
              type="button"
              onClick={handleOpenCertificate}
              className="hidden sm:flex text-[#F59E0B] hover:text-amber-400 items-center gap-1 cursor-pointer transition-colors"
            >
              <Award size={13} />
              <span>Certificado 20h</span>
            </button>
            <span className="text-slate-600">|</span>
            <Link
              to="/ranking"
              className="text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
            >
              <Trophy size={13} className="text-[#F59E0B]" />
              <span>Modo TV</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Cabeçalho Principal (Header Branco com Marca Original SENAI) */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3">
          {/* Marca Institucional */}
          <Link to="/" className="shrink-0 min-w-0" onClick={() => setMobileMenuOpen(false)}>
            <InstitutionalBrand
              officialLogoUrl={publicConfig?.officialLogoUrl}
              schoolName={schoolName}
              variant="dark"
            />
          </Link>

          {/* Navegação Desktop (lg+) */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-7 text-sm font-bold text-slate-700">
            <button
              type="button"
              onClick={() => setFeedFilter('ALL')}
              className={`hover:text-[#E30613] transition-colors cursor-pointer flex items-center gap-1.5 ${
                feedFilter === 'ALL' ? 'text-[#E30613]' : ''
              }`}
            >
              <Flame size={16} className={feedFilter === 'ALL' ? 'text-[#E30613]' : 'text-slate-400'} />
              <span>Mural dos Desafios</span>
            </button>
            <button
              type="button"
              onClick={() => setFeedFilter('PROGRAM')}
              className={`hover:text-[#E30613] transition-colors cursor-pointer flex items-center gap-1.5 ${
                feedFilter === 'PROGRAM' ? 'text-[#E30613]' : ''
              }`}
            >
              <Calendar size={16} className={feedFilter === 'PROGRAM' ? 'text-[#E30613]' : 'text-slate-400'} />
              <span>Programação 16–19 Nov</span>
            </button>
            <Link to="/ranking" className="hover:text-[#E30613] transition-colors flex items-center gap-1.5">
              <Trophy size={16} className="text-[#F59E0B]" />
              <span>Ranking ao Vivo</span>
            </Link>
            <button
              type="button"
              onClick={handleOpenCertificate}
              className="hover:text-[#E30613] transition-colors cursor-pointer flex items-center gap-1.5 text-amber-800"
            >
              <Award size={16} className="text-[#D97706]" />
              <span>Certificado 20h</span>
            </button>
          </nav>

          {/* Ações Direitas (Desktop & Mobile) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {user ? (
              <Link
                to={user.role === 'PARTICIPANT' ? '/app' : '/admin'}
                className="inline-flex items-center gap-1.5 sm:gap-2 bg-[#E30613] hover:bg-[#C2040F] text-white font-bold text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5 rounded-md shadow-xs transition-colors"
              >
                <span>Meu Painel</span>
                <ArrowRight size={14} className="sm:size-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:inline-flex items-center gap-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5 rounded-md transition-colors"
                >
                  <LogIn size={14} className="text-slate-600 sm:size-4" />
                  <span>Entrar</span>
                </Link>
                <Link
                  to={registerHref}
                  className="inline-flex items-center gap-1.5 sm:gap-2 bg-[#E30613] hover:bg-[#C2040F] text-white font-bold text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5 rounded-md shadow-xs transition-colors"
                >
                  <QrCode size={14} className="sm:size-4" />
                  <span>Inscrever-se</span>
                </Link>
              </>
            )}

            {/* Botão Hamburger (Mobile / Tablet - lg:hidden) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="lg:hidden p-2 rounded-md border border-slate-200 text-slate-700 hover:text-[#E30613] hover:bg-slate-50 transition-colors cursor-pointer"
              aria-label="Abrir menu de navegação"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Menu Mobile Drawer Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-slate-200 shadow-xl px-4 py-5 space-y-4">
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setFeedFilter('ALL');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-bold transition-colors cursor-pointer text-left ${
                  feedFilter === 'ALL'
                    ? 'bg-red-50 text-[#E30613]'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Flame size={18} className="text-[#E30613]" />
                <span>Mural Social dos Desafios</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFeedFilter('PROGRAM');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-bold transition-colors cursor-pointer text-left ${
                  feedFilter === 'PROGRAM'
                    ? 'bg-red-50 text-[#E30613]'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Calendar size={18} className="text-[#E30613]" />
                <span>Programação Oficial (16 a 19 Nov)</span>
              </button>

              <Link
                to="/ranking"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Trophy size={18} className="text-[#F59E0B]" />
                <span>Ranking das Turmas & Modo TV</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleOpenCertificate();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-bold text-amber-900 bg-amber-50/70 hover:bg-amber-100/70 border border-amber-200/60 transition-colors cursor-pointer text-left"
              >
                <Award size={18} className="text-amber-600" />
                <span>Emitir Certificado Oficial (20h)</span>
              </button>

              <a
                href="/docs/MANUAL_SIPAT_2026_SENAI_MOOCA.pdf"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <BookOpen size={18} className="text-[#E30613]" />
                <span>Manual em PDF com Prints do Sistema</span>
              </a>
            </div>

            {/* Separador e Ações do Usuário */}
            <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
              {!user && (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full inline-flex items-center justify-center gap-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm py-2.5 px-4 rounded-lg transition-colors"
                >
                  <LogIn size={16} />
                  <span>Acessar Minha Conta (Login)</span>
                </Link>
              )}
              <Link
                to={user ? (user.role === 'PARTICIPANT' ? '/app' : '/admin') : registerHref}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#E30613] hover:bg-[#C2040F] text-white font-bold text-sm py-2.5 px-4 rounded-lg shadow-xs transition-colors"
              >
                {user ? (
                  <>
                    <span>Ir para Meu Painel</span>
                    <ArrowRight size={16} />
                  </>
                ) : (
                  <>
                    <QrCode size={16} />
                    <span>Fazer Inscrição pelo QR Code</span>
                  </>
                )}
              </Link>
            </div>

            {/* Rodapé do Menu Mobile com Informações Oficiais */}
            <div className="pt-2 text-[11px] text-slate-500 space-y-0.5 border-t border-slate-100">
              <div className="font-bold text-slate-700">Escola SENAI &quot;Morvan Figueiredo&quot;</div>
              <div>Rua Oratório, 215 • Mooca, São Paulo - SP</div>
              <div className="text-slate-400 font-mono-tech">(11) 2076-3200</div>
            </div>
          </div>
        )}
      </header>

      {/* 3. Barra de Destaques em Formato STORIES (Rede Social da Segurança) */}
      <section className="bg-white border-b border-slate-200 py-2.5 sm:py-3 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-3 sm:gap-6">
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 border-r border-slate-200 pr-4">
            <Sparkles size={16} className="text-[#E30613]" />
            <span>Destaques SIPAT</span>
          </div>

          <div className="flex items-center gap-3 sm:gap-5 overflow-x-auto scrollbar-none py-1 w-full">
            {STORIES.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => {
                  if (st.action === 'cert') {
                    handleOpenCertificate();
                  } else if (st.action === '/ranking') {
                    window.location.href = '/ranking';
                  } else if (st.id === 'riscos') {
                    setFeedFilter('RISK_HUNT');
                  } else if (st.id === 'video') {
                    setFeedFilter('VIDEO');
                  } else if (st.id === 'erros') {
                    setFeedFilter('7_ERRORS');
                  } else {
                    setFeedFilter('PROGRAM');
                  }
                }}
                className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer"
              >
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full p-0.5 border-2 border-[#E30613] shadow-xs group-hover:scale-105 transition-transform flex items-center justify-center ${st.bg}`}
                >
                  {st.icon}
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 text-center max-w-[72px] sm:max-w-[85px] truncate">
                  {st.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Layout Principal da Rede Social (Timeline Social + Sidebar Informativa) */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 grid lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Coluna Esquerda: Feed Social das Atitudes Seguras (8 colunas) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Caixa de Criação / Desafio Social (Composer) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center gap-3 pb-3 sm:pb-4 border-b border-slate-100">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#E30613] text-white flex items-center justify-center font-bold text-sm sm:text-base shrink-0 shadow-2xs">
                {user ? user.fullName[0]?.toUpperCase() : 'S'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-[#1E293B] truncate">
                  {user ? `Olá, ${user.fullName.split(' ')[0]}!` : 'Participe da Rede Social da SIPAT 2026!'}
                </p>
                <p className="text-xs text-slate-500 line-clamp-1">
                  Qual atitude preventiva você praticou hoje na Escola SENAI Mooca?
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenCertificate}
                className="hidden md:inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs px-3.5 py-2 rounded-md transition-colors cursor-pointer shrink-0"
              >
                <Award size={15} className="text-[#D97706]" />
                <span>Emitir Certificado (20h)</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <Link
                  to={user ? '/app' : registerHref}
                  className="inline-flex items-center gap-1.5 bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-[#E30613] text-xs font-semibold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md border border-slate-200 transition-colors"
                >
                  <Camera size={14} className="text-[#E30613]" />
                  <span>Caça aos Riscos</span>
                </Link>
                <Link
                  to={user ? '/app' : registerHref}
                  className="inline-flex items-center gap-1.5 bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-[#E30613] text-xs font-semibold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md border border-slate-200 transition-colors"
                >
                  <Video size={14} className="text-[#E30613]" />
                  <span>Vídeo em 60s</span>
                </Link>
                <Link
                  to={user ? '/app' : registerHref}
                  className="inline-flex items-center gap-1.5 bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-[#E30613] text-xs font-semibold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md border border-slate-200 transition-colors"
                >
                  <HelpCircle size={14} className="text-amber-600" />
                  <span>Quizzes</span>
                </Link>
              </div>

              <Link
                to={user ? '/app' : registerHref}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-[#E30613] hover:bg-[#C2040F] text-white text-xs font-bold px-4 py-2 rounded-md shadow-2xs transition-colors shrink-0"
              >
                <span>{user ? 'Enviar Desafio' : 'Fazer Inscrição'}</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Abas de Filtragem do Feed */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none pb-1">
            <div className="inline-flex p-1 bg-white border border-slate-200 rounded-lg shadow-2xs text-xs font-bold gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setFeedFilter('ALL')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  feedFilter === 'ALL'
                    ? 'bg-[#E30613] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#1E293B]'
                }`}
              >
                <Flame size={14} />
                <span>Em Alta ({filteredPosts.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setFeedFilter('RISK_HUNT')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  feedFilter === 'RISK_HUNT'
                    ? 'bg-[#E30613] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#1E293B]'
                }`}
              >
                <Camera size={14} />
                <span>Caça aos Riscos</span>
              </button>
              <button
                type="button"
                onClick={() => setFeedFilter('VIDEO')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  feedFilter === 'VIDEO'
                    ? 'bg-[#E30613] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#1E293B]'
                }`}
              >
                <Video size={14} />
                <span>Vídeos 60s</span>
              </button>
              <button
                type="button"
                onClick={() => setFeedFilter('PROGRAM')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  feedFilter === 'PROGRAM'
                    ? 'bg-[#E30613] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#1E293B]'
                }`}
              >
                <Calendar size={14} />
                <span>Cronograma</span>
              </button>
            </div>

            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide hidden md:inline shrink-0">
              Tempo Real • SIPAT 2026
            </span>
          </div>

          {/* Renderização Condicional: Se aba de Cronograma for clicada */}
          {feedFilter === 'PROGRAM' ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <span className="text-xs font-bold text-[#E30613] uppercase tracking-wider">
                    CRONOGRAMA OFICIAL • 16 A 19 DE NOVEMBRO
                  </span>
                  <h3 className="text-xl font-extrabold text-[#1E293B] mt-1">
                    Atividades e Desafios da Escola SENAI Mooca
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setFeedFilter('ALL')}
                  className="text-xs font-bold text-[#E30613] hover:underline cursor-pointer"
                >
                  ← Voltar ao Feed Social
                </button>
              </div>

              {/* Botões dos 4 Dias */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {SIPAT_EVENT_DAYS.map((d) => (
                  <button
                    key={d.day}
                    type="button"
                    onClick={() => setSelectedDay(d.day)}
                    className={`p-3.5 rounded-lg border text-left cursor-pointer transition-colors ${
                      selectedDay === d.day
                        ? 'bg-[#E30613] text-white border-[#E30613] shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-[10px] font-extrabold uppercase">Dia {d.day} • {d.shortDate}</div>
                    <div className="font-bold text-xs mt-1 truncate">{d.theme}</div>
                  </button>
                ))}
              </div>

              {/* Missões do Dia */}
              <div className="grid sm:grid-cols-2 gap-4">
                {dayMissions.map((m) => (
                  <div key={m.id} className="p-4 rounded-lg border border-slate-200 bg-[#F8FAFC] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white text-[#E30613] border border-red-200">
                        {m.category}
                      </span>
                      <span className="font-extrabold text-xs text-[#E30613]">+{m.points} PTS</span>
                    </div>
                    <h4 className="font-bold text-sm text-[#1E293B]">{m.title}</h4>
                    <p className="text-xs text-slate-600 line-clamp-2">{m.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Linha do Tempo do Feed Social dos Alunos */
            <div className="space-y-6">
              {filteredPosts.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-4 shadow-xs">
                  <div className="w-16 h-16 mx-auto rounded-full bg-red-50 text-[#E30613] flex items-center justify-center">
                    <Camera size={30} />
                  </div>
                  <div className="max-w-md mx-auto space-y-1.5">
                    <h4 className="font-extrabold text-base text-[#1E293B]">
                      Mural Oficial de Atitudes Seguras
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      As postagens de desafios, fotos e vídeos de 60 segundos enviados pelos alunos e homologados pela Comissão Avaliadora aparecerão aqui em tempo real.
                    </p>
                  </div>
                  <div className="pt-2 flex flex-wrap justify-center gap-3">
                    <Link
                      to={registerHref}
                      className="inline-flex items-center gap-2 bg-[#E30613] hover:bg-[#C2040F] text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-xs transition-colors"
                    >
                      <Sparkles size={14} />
                      <span>Cadastre-se e Envie seu Desafio</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setFeedFilter('PROGRAM')}
                      className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Calendar size={14} />
                      <span>Ver Cronograma Oficial</span>
                    </button>
                  </div>
                </div>
              ) : (
                filteredPosts.map((post) => {

                  return (
                    <article
                      key={post.id}
                      className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:border-slate-300 transition-colors"
                    >
                    {/* Cabeçalho da Postagem Social */}
                    <div className="p-5 flex items-start justify-between gap-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full border-2 border-[#E30613] p-0.5 shrink-0 overflow-hidden bg-slate-50 shadow-2xs">
                          {post.avatarUrl ? (
                            <img src={post.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <div className="w-full h-full rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm">
                              {post.authorInitials}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm sm:text-base text-[#1E293B]">
                              {post.authorName}
                            </span>
                            <span className="bg-red-50 text-[#E30613] text-[10px] font-bold px-1.5 py-0.2 rounded border border-red-200">
                              ALUNO SENAI
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                            <span className="font-mono-tech font-semibold text-slate-700">{post.classCode}</span>
                            <span>•</span>
                            <span className="truncate max-w-[200px]">{post.courseArea}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center gap-1 font-extrabold text-xs bg-red-100 text-[#E30613] px-2.5 py-1 rounded-full">
                          <Trophy size={13} />
                          +{post.awardedPoints} PTS
                        </span>
                        <span className="block text-[11px] text-slate-400 mt-1 font-mono-tech">
                          {post.eventDateLabel}
                        </span>
                      </div>
                    </div>

                    {/* Conteúdo do Desafio */}
                    <div className="p-5 space-y-4">
                      {/* Badge da Missão e Selo CIPA */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-bold uppercase tracking-wider text-[#E30613] bg-red-50 px-2.5 py-1 rounded border border-red-200">
                          {post.missionTitle}
                        </span>

                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 size={13} className="text-emerald-600" />
                          Validado pela Comissão CIPA
                        </span>
                      </div>

                      {/* Relato / Descrição da Atitude Preventiva */}
                      <p className="text-sm text-slate-700 leading-relaxed font-normal">
                        {post.textResponse}
                      </p>

                      {/* Box Estruturado para Caça aos Riscos */}
                      {post.structuredData && (
                        <div className="bg-slate-50 border-l-4 border-l-[#E30613] border border-slate-200 rounded-r-lg p-3.5 text-xs space-y-1.5">
                          {post.structuredData.environment && (
                            <div>
                              <strong className="text-slate-900">Local Inspeção: </strong>
                              <span className="text-slate-700">{post.structuredData.environment}</span>
                            </div>
                          )}
                          {post.structuredData.hazardType && (
                            <div>
                              <strong className="text-slate-900">Classificação: </strong>
                              <span className="text-[#E30613] font-bold">{post.structuredData.hazardType}</span>
                            </div>
                          )}
                          {post.structuredData.preventiveMeasures && (
                            <div>
                              <strong className="text-slate-900">Medida Preventiva: </strong>
                              <span className="text-slate-700">{post.structuredData.preventiveMeasures}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Imagem ou Vídeo da Evidência Real */}
                      {post.mediaUrl && (
                        <div className="rounded-xl overflow-hidden border border-slate-200 bg-black relative max-h-[440px] flex items-center justify-center">
                          {post.hasVideo ? (
                            <div className="relative w-full h-80 bg-slate-900 flex items-center justify-center">
                              <img src={post.mediaUrl} alt="" className="w-full h-full object-cover opacity-70" />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() => alert('Reproduzindo vídeo de segurança (60s) enviado pelo estudante.')}
                                  className="w-16 h-16 rounded-full bg-[#E30613] hover:bg-[#C2040F] text-white flex items-center justify-center shadow-lg cursor-pointer transition-transform hover:scale-110"
                                >
                                  <Play size={28} className="ml-1" />
                                </button>
                              </div>
                              <div className="absolute bottom-3 left-3 bg-black/75 text-white font-mono-tech text-xs px-2.5 py-1 rounded">
                                PÍLULA DE SEGURANÇA • 0:58
                              </div>
                            </div>
                          ) : (
                            <img
                              src={post.mediaUrl}
                              alt="Evidência do Desafio SIPAT"
                              className="w-full h-auto max-h-[440px] object-cover hover:scale-[1.01] transition-transform"
                            />
                          )}
                        </div>
                      )}

                      {/* Parecer do Avaliador CIPA e Medalha Desbloqueada */}
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                            Avaliação da equipe SIPAT
                          </span>
                          <p className="text-slate-700 italic">
                            &quot;{post.feedback}&quot;
                          </p>
                        </div>

                      </div>
                    </div>

                    {/* Curtir e comentar acontecem dentro da rede (login), 1 curtida por pessoa */}
                    <div className="px-5 py-3 border-t border-slate-100 bg-[#F8FAFC] flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-4 text-slate-600 font-semibold">
                        <span className="inline-flex items-center gap-1.5">
                          <Heart size={15} className="text-[#E30613]" /> {post.reactionsCount} curtida(s)
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MessageSquare size={15} /> {post.commentsCount} comentário(s)
                        </span>
                      </div>
                      <Link
                        to={user ? (user.role === 'PARTICIPANT' ? `/app?post=${post.id}` : '/admin') : '/login'}
                        className="inline-flex items-center gap-1.5 bg-[#E30613] hover:bg-[#C2040F] text-white font-bold px-3 py-1.5 rounded-md"
                      >
                        {user ? 'Curtir e comentar' : 'Entre para curtir'}
                      </Link>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        )}
        </div>

        {/* Coluna Direita: Widgets Sociais, Certificados & Mini-Ranking (4 colunas) */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Widget 1: Emissão do Certificado Oficial SIPAT (Destaque Dourado) */}
          <div className="bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 rounded-xl p-0.5 shadow-md">
            <div className="bg-[#1E293B] text-white rounded-[10px] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest bg-amber-500 text-slate-950 px-2 py-0.5 rounded">
                  CERTIFICAÇÃO OFICIAL
                </span>
                <Sparkles size={16} className="text-amber-400" />
              </div>

              <div>
                <h4 className="text-lg font-extrabold text-white leading-tight">
                  Certificado de Participação SIPAT 2026
                </h4>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  Garanta suas <strong>20 horas complementares</strong> de formação em cultura
                  preventiva e segurança do trabalho com autenticação digital oficial SENAI-SP.
                </p>
              </div>

              <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Carga Horária:</span>
                  <strong className="text-white">20 Horas</strong>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Reconhecimento:</span>
                  <strong className="text-amber-400">Escola SENAI Mooca</strong>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Validação:</span>
                  <strong className="text-emerald-400 font-mono-tech">Digital / QR Code</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenCertificate}
                className="w-full bg-[#E30613] hover:bg-[#C2040F] text-white font-extrabold py-3 px-4 rounded-lg text-xs uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
              >
                <Award size={17} />
                <span>Emitir / Visualizar Certificado</span>
              </button>
            </div>
          </div>

          {/* Widget Manual Oficial com Prints em PDF */}
          <div className="bg-gradient-to-br from-red-50 to-slate-50 border border-red-200 rounded-xl p-4.5 space-y-2.5 shadow-xs">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-[#E30613]" />
              <h4 className="font-extrabold text-sm text-[#1E293B]">Manual Oficial (PDF)</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Guia completo ilustrado com <strong>prints reais de todas as telas</strong> para alunos, docentes e avaliadores da CIPA.
            </p>
            <a
              href="/docs/MANUAL_SIPAT_2026_SENAI_MOOCA.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 bg-[#1E293B] hover:bg-slate-900 text-white font-bold py-2.5 px-3 rounded-lg text-xs transition-colors shadow-xs"
            >
              <BookOpen size={15} className="text-[#E30613]" />
              <span>Baixar Manual em PDF</span>
            </a>
          </div>

          {/* Widget 2: Mini-Podium do Ranking ao Vivo */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Trophy size={18} className="text-[#F59E0B]" />
                <h4 className="font-extrabold text-sm text-[#1E293B]">Líderes da Competição</h4>
              </div>
              <Link to="/ranking" className="text-xs font-bold text-[#E30613] hover:underline">
                Ver Telão →
              </Link>
            </div>

            {rankingData?.podium && rankingData.podium.length > 0 ? (
              <div className="space-y-3">
                {rankingData.podium.slice(0, 3).map((ldr) => {
                  const medalBg =
                    ldr.position === 1
                      ? 'bg-amber-400 text-slate-900'
                      : ldr.position === 2
                      ? 'bg-slate-300 text-slate-900'
                      : 'bg-amber-700 text-white';
                  return (
                    <div
                      key={ldr.userId || ldr.position}
                      className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-extrabold text-[11px] ${medalBg}`}
                        >
                          {ldr.position}º
                        </span>
                        <div>
                          <div className="font-bold text-slate-900">{ldr.displayName}</div>
                          <div className="text-[10px] text-slate-500 font-mono-tech">{ldr.classCode}</div>
                        </div>
                      </div>
                      <strong className="text-xs font-extrabold text-[#E30613]">
                        {ldr.totalPoints} PTS
                      </strong>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center space-y-1.5">
                <p className="text-xs font-bold text-slate-700">Aguardando primeiras pontuações</p>
                <p className="text-[11px] text-slate-500">
                  Cadastre-se pelo QR Code e conclua desafios para liderar o pódio da SIPAT!
                </p>
              </div>
            )}

            <Link
              to="/ranking"
              className="w-full inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 px-3 rounded-md text-xs transition-colors"
            >
              <ExternalLink size={14} />
              <span>Abrir Ranking em Tempo Real</span>
            </Link>
          </div>

          {/* Widget 3: Turmas Mais Engajadas da Unidade Mooca */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-[#E30613]" />
                <h4 className="font-extrabold text-sm text-[#1E293B]">Disputa por Turmas</h4>
              </div>
              <span className="text-[11px] font-mono-tech text-slate-400">SENAI Mooca</span>
            </div>

            <div className="space-y-3 text-xs">
              {(rankingData?.classRanking && rankingData.classRanking.length > 0
                ? rankingData.classRanking.slice(0, 4)
                : (publicConfig?.classes || []).slice(0, 4)
              ).map((t: any) => {
                const maxPoints = rankingData?.classRanking?.[0]?.totalPoints || 1;
                const pct =
                  maxPoints > 0 && t.totalPoints
                    ? Math.min(100, Math.round((t.totalPoints / maxPoints) * 100))
                    : 0;
                return (
                  <div key={t.code || t.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 truncate max-w-[200px]">
                        {t.code} {t.name ? `• ${t.name.split('–')[0].trim()}` : ''}
                      </span>
                      <span className="font-extrabold text-[#E30613] shrink-0">{t.totalPoints || 0} pts</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
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

          {/* Widget 4: Cartaz QR Code de Inscrição Mobile */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs text-center">
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#E30613] uppercase tracking-wide">
              <QrCode size={16} />
              <span>Inscrição Rápida pelo Celular</span>
            </div>

            {publicConfig?.qrDataUrl ? (
              <div className="p-3 bg-white border-2 border-slate-200 rounded-lg inline-block shadow-2xs">
                <img
                  src={publicConfig.qrDataUrl}
                  alt="QR Code Oficial"
                  className="w-36 h-36 object-contain mx-auto"
                />
              </div>
            ) : (
              <div className="w-36 h-36 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center mx-auto text-xs text-slate-400">
                QR Code Oficial
              </div>
            )}

            <p className="text-[11px] text-slate-500 leading-tight">
              Aponte a câmera do seu celular para cadastrar foto de perfil, escolher turma e acessar as missões.
            </p>

            <Link
              to={registerHref}
              className="w-full inline-flex items-center justify-center gap-1.5 bg-[#E30613] hover:bg-[#C2040F] text-white font-bold py-2 px-3 rounded-md text-xs transition-colors"
            >
              <span>Abrir Cadastro Mobile</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </aside>
      </main>

      {/* 5. Rodapé Oficial no Padrão SENAI-SP (Mooca) */}
      <footer className="bg-[#1E293B] text-slate-300 mt-auto border-t-4 border-[#E30613]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid md:grid-cols-3 gap-8 pb-8 border-b border-slate-700/80 text-xs">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <img
                  src="/brand/senai-oficial.png"
                  alt="SENAI"
                  className="h-8 w-auto object-contain"
                />
                <span className="font-bold text-white text-sm">
                  SENAI Morvan Figueiredo
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Escola SENAI &quot;Morvan Figueiredo&quot; — Unidade Mooca da rede SENAI-SP. Formação
                técnica, aprendizagem industrial e excelência em segurança do trabalho.
              </p>
            </div>

            <div>
              <h5 className="font-bold text-white uppercase tracking-wider mb-3 text-xs">
                Localização & Contato
              </h5>
              <p className="text-slate-400 leading-relaxed">
                Rua Oratório, 215 - Mooca<br />
                São Paulo - SP • CEP 03117-000<br />
                Telefone / WhatsApp: (11) 2076-3200<br />
                E-mail: senaimooca@sp.senai.br
              </p>
            </div>

            <div>
              <h5 className="font-bold text-white uppercase tracking-wider mb-3 text-xs">
                SIPAT 2026 • Acesso Rápido
              </h5>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <button
                    type="button"
                    onClick={handleOpenCertificate}
                    className="hover:text-white transition-colors cursor-pointer text-amber-400 font-bold"
                  >
                    Emitir Certificado de Participação (20h)
                  </button>
                </li>
                <li>
                  <Link to={registerHref} className="hover:text-white transition-colors">
                    Inscrição com QR Code
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-white transition-colors">
                    Área do Participante / Login
                  </Link>
                </li>
                <li>
                  <Link to="/ranking" className="hover:text-white transition-colors">
                    Ranking ao Vivo (Modo TV)
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <p>
              © 2026 SENAI-SP • {schoolName} • Tema: &quot;{theme}&quot;
            </p>
            <p className="text-slate-500">
              Sua atitude faz a diferença!
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
