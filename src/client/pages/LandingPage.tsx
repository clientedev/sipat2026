import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  ExternalLink,
  Eye,
  FileCheck,
  Flame,
  HardHat,
  Info,
  LogIn,
  MapPin,
  Phone,
  QrCode,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserCheck,
  Users,
  Video,
} from 'lucide-react';
import { SIPAT_EVENT_DAYS } from '@shared/constants';
import { BadgeIcon } from '../components/BadgeIcon';
import { InstitutionalBrand } from '../components/InstitutionalBrand';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const { publicConfig, user } = useAuth();
  const [selectedDay, setSelectedDay] = useState<number>(1);

  const schoolName = publicConfig?.schoolName || 'Escola SENAI "Morvan Figueiredo"';
  const theme =
    publicConfig?.eventTheme || 'Segurança começa com você: prevenir é uma atitude de todos!';
  const slogan = publicConfig?.eventSlogan || 'Sua atitude faz a diferença!';

  const dayMissions = (publicConfig?.programPreview || []).filter(
    (m) => m.eventDay === selectedDay
  );

  const registerHref = publicConfig?.activeQrCode
    ? `/inscricao?code=${encodeURIComponent(publicConfig.activeQrCode)}`
    : '/inscricao';

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#1E293B]">
      {/* 1. Barra Superior Institucional SENAI-SP (Padrão Oficial Mooca) */}
      <div className="bg-[#1E293B] text-slate-200 border-b-2 border-[#E30613]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-bold text-white uppercase tracking-wider text-[11px]">
              <span className="w-2 h-2 rounded-full bg-[#E30613] animate-pulse" />
              SENAI-SP • UNIDADE MOOCA
            </span>
            <span className="hidden md:inline text-slate-500">|</span>
            <span className="hidden md:flex items-center gap-1 text-slate-300">
              <MapPin size={13} className="text-[#E30613]" />
              Rua Oratório, 215 - Mooca, São Paulo - SP
            </span>
            <span className="hidden lg:inline text-slate-500">|</span>
            <span className="hidden lg:flex items-center gap-1 text-slate-300">
              <Phone size={13} className="text-[#E30613]" />
              (11) 2076-3200
            </span>
          </div>

          <div className="flex items-center gap-4 font-medium">
            <Link
              to="/ranking"
              className="text-slate-200 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <Trophy size={14} className="text-[#F59E0B]" />
              <span>Ranking ao Vivo</span>
            </Link>
            <span className="text-slate-600">|</span>
            <Link
              to="/acompanhamento"
              className="text-slate-200 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <BarChart3 size={14} className="text-[#3B82F6]" />
              <span>Painel Público</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Cabeçalho Principal (Header Limpo com Logo Original SENAI) */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          <InstitutionalBrand
            officialLogoUrl={publicConfig?.officialLogoUrl}
            schoolName={schoolName}
            variant="dark"
          />

          <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold text-slate-700">
            <a href="#como-funciona" className="hover:text-[#E30613] transition-colors">
              Como Participar
            </a>
            <a href="#programacao" className="hover:text-[#E30613] transition-colors">
              Programação 16–19 Nov
            </a>
            <a href="#medalhas" className="hover:text-[#E30613] transition-colors">
              Medalhas & Pontos
            </a>
            <Link to="/ranking" className="hover:text-[#E30613] transition-colors">
              Ranking das Turmas
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to={user.role === 'PARTICIPANT' ? '/app' : '/admin'}
                className="inline-flex items-center gap-2 bg-[#E30613] hover:bg-[#C2040F] text-white font-bold text-sm px-4 sm:px-5 py-2.5 rounded-md shadow-xs transition-colors"
              >
                <span>Acessar Meu Painel</span>
                <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm px-3.5 sm:px-4 py-2.5 rounded-md transition-colors"
                >
                  <LogIn size={16} className="text-slate-600" />
                  <span>Entrar</span>
                </Link>
                <Link
                  to={registerHref}
                  className="inline-flex items-center gap-2 bg-[#E30613] hover:bg-[#C2040F] text-white font-bold text-sm px-4 sm:px-5 py-2.5 rounded-md shadow-xs transition-colors"
                >
                  <QrCode size={16} />
                  <span>Inscrever-se</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 3. Hero Principal com Identidade Oficial SENAI-SP */}
      <section className="relative bg-gradient-to-b from-white via-[#FFF7F7] to-[#F8FAFC] border-b border-slate-200 overflow-hidden">
        {/* Detalhe de fundo sutil */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-100/50 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16 grid lg:grid-cols-12 gap-10 items-center relative z-10">
          <div className="lg:col-span-7 space-y-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 bg-red-50 text-[#E30613] border border-red-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                <ShieldCheck size={14} />
                SIPAT 2026 • 16 a 19 de Novembro
              </span>
              <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-semibold">
                SENAI Morvan Figueiredo (Mooca)
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1E293B] leading-[1.15] tracking-tight">
                {theme}
              </h1>
              <div className="inline-block bg-[#E30613] text-white font-bold px-4 py-1.5 rounded text-base sm:text-lg shadow-xs">
                {slogan}
              </div>
            </div>

            <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl">
              Bem-vindo à plataforma oficial e gamificada da SIPAT da <strong>{schoolName}</strong>.
              Participe dos desafios diários de segurança do trabalho, registre situações de risco,
              responda quizzes técnicos, conquiste medalhas e leve sua turma ao 1º lugar do ranking!
            </p>

            {/* Ações principais com alta facilidade de interação */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to={registerHref}
                className="inline-flex items-center justify-center gap-2.5 bg-[#E30613] hover:bg-[#C2040F] text-white font-bold px-6 py-3.5 rounded-md text-base shadow-sm hover:shadow transition-all"
              >
                <QrCode size={20} />
                <span>Fazer Inscrição pelo QR Code</span>
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-semibold px-5 py-3.5 rounded-md text-base shadow-2xs transition-colors"
              >
                <LogIn size={18} className="text-[#E30613]" />
                <span>Já sou cadastrado (Login)</span>
              </Link>
              <Link
                to="/ranking"
                className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-3.5 rounded-md text-base transition-colors"
              >
                <Trophy size={18} className="text-[#F59E0B]" />
                <span>Ver Ranking ao Vivo</span>
              </Link>
            </div>

            {/* Destaques Rápidos */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200 max-w-xl">
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <div className="font-extrabold text-2xl text-[#E30613]">4 DIAS</div>
                <div className="text-xs text-slate-500 font-medium">16 a 19 de Novembro</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <div className="font-extrabold text-2xl text-[#1E293B]">AO VIVO</div>
                <div className="text-xs text-slate-500 font-medium">Ranking em tempo real</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <div className="font-extrabold text-2xl text-[#F59E0B]">5 MEDALHAS</div>
                <div className="text-xs text-slate-500 font-medium">Insígnias exclusivas</div>
              </div>
            </div>
          </div>

          {/* Card Lateral de Inscrição Rápida por QR Code */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-[#1E293B] text-white p-4 flex items-center justify-between border-b-2 border-[#E30613]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded bg-[#E30613] flex items-center justify-center text-white font-bold">
                    <QrCode size={18} />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#F59E0B] block">
                      CADASTRO MOBILE
                    </span>
                    <span className="font-bold text-sm">Inscrição Rápida no Celular</span>
                  </div>
                </div>
                <HardHat size={22} className="text-[#F59E0B]" />
              </div>

              <div className="p-6 flex flex-col items-center text-center">
                {publicConfig?.registrationOpen && publicConfig?.qrDataUrl ? (
                  <>
                    <div className="p-3 bg-white border-2 border-slate-200 rounded-lg shadow-2xs">
                      <img
                        src={publicConfig.qrDataUrl}
                        alt="QR Code Oficial de Inscrição SIPAT 2026"
                        className="w-48 h-48 object-contain"
                      />
                    </div>
                    <p className="text-xs text-slate-600 mt-3 max-w-xs leading-relaxed">
                      Abra a câmera do seu smartphone para cadastrar seu nome, turma e foto de perfil.
                    </p>
                    <Link
                      to={registerHref}
                      className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-[#E30613] hover:bg-[#C2040F] text-white font-bold py-2.5 px-4 rounded-md text-sm transition-colors shadow-2xs"
                    >
                      <span>Abrir Formulário Neste Aparelho</span>
                      <ArrowRight size={16} />
                    </Link>
                  </>
                ) : (
                  <div className="py-8 space-y-3">
                    <AlertTriangle size={32} className="mx-auto text-[#F59E0B]" />
                    <p className="font-bold text-slate-800 text-sm">
                      Período de inscrições gerenciado pela coordenação
                    </p>
                    <p className="text-xs text-slate-500">
                      Utilize suas credenciais de acesso clicando no botão Entrar.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Como Participar da SIPAT em 3 Passos Simples */}
      <section id="como-funciona" className="py-14 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#E30613]">
              DINÂMICA DA COMPETIÇÃO
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1E293B] mt-1">
              Como Funciona a Gamificação em 3 Passos
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Participe individualmente e pontue para a sua turma no ranking geral da escola.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-6 relative flex flex-col justify-between hover:border-red-300 transition-colors">
              <div>
                <div className="w-12 h-12 rounded-lg bg-red-100 text-[#E30613] font-extrabold text-xl flex items-center justify-center mb-4">
                  1
                </div>
                <h3 className="text-lg font-bold text-[#1E293B] mb-2">Cadastre-se com sua Turma</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Escaneie o QR Code ou acesse a página de cadastro. Escolha seu curso no SENAI Mooca,
                  adicione sua foto e crie sua senha de acesso.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-200 text-xs font-semibold text-[#E30613] flex items-center gap-1">
                <span>Rápido e otimizado para celulares</span>
                <CheckCircle2 size={15} />
              </div>
            </div>

            <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-6 relative flex flex-col justify-between hover:border-red-300 transition-colors">
              <div>
                <div className="w-12 h-12 rounded-lg bg-red-100 text-[#E30613] font-extrabold text-xl flex items-center justify-center mb-4">
                  2
                </div>
                <h3 className="text-lg font-bold text-[#1E293B] mb-2">Cumpra os Desafios Diários</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  A cada dia do evento (16 a 19/Nov), novas missões práticas são liberadas: Caça aos
                  Riscos com fotos, Encontre os 7 Erros, Vídeo de 60s e quizzes educativos.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-200 text-xs font-semibold text-[#E30613] flex items-center gap-1">
                <span>Liberações agendadas ao longo do dia</span>
                <Clock size={15} />
              </div>
            </div>

            <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-6 relative flex flex-col justify-between hover:border-red-300 transition-colors">
              <div>
                <div className="w-12 h-12 rounded-lg bg-red-100 text-[#E30613] font-extrabold text-xl flex items-center justify-center mb-4">
                  3
                </div>
                <h3 className="text-lg font-bold text-[#1E293B] mb-2">Conquiste Medalhas e o Topo</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Ganhe pontos validados pela comissão avaliadora, desbloqueie medalhas exclusivas e
                  acompanhe a disputa em tempo real nos telões da escola!
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-200 text-xs font-semibold text-[#E30613] flex items-center gap-1">
                <span>Premiação para os melhores colocados</span>
                <Trophy size={15} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Programação Interativa dos 4 Dias (16 a 19 de Novembro) */}
      <section id="programacao" className="py-14 bg-[#F8FAFC] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#E30613]">
                CRONOGRAMA DE ATIVIDADES
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1E293B] mt-1">
                Quatro Dias de Desafios Técnicos na Unidade Mooca
              </h2>
            </div>
            <p className="text-sm text-slate-600 max-w-md">
              Selecione o dia abaixo para visualizar as missões programadas, pontuações e objetivos:
            </p>
          </div>

          {/* Abas dos 4 Dias com Visual Limpo e Destacado */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            {SIPAT_EVENT_DAYS.map((d) => {
              const active = selectedDay === d.day;
              return (
                <button
                  key={d.day}
                  type="button"
                  onClick={() => setSelectedDay(d.day)}
                  className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                    active
                      ? 'bg-[#E30613] text-white border-[#E30613] shadow-sm'
                      : 'bg-white text-[#1E293B] border-slate-200 hover:border-[#E30613] shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-extrabold ${
                        active ? 'text-white' : 'text-[#E30613]'
                      }`}
                    >
                      DIA 0{d.day} • {d.shortDate}
                    </span>
                    <span className={`text-xs ${active ? 'text-red-100' : 'text-slate-400'}`}>
                      {d.weekday}
                    </span>
                  </div>
                  <div className="font-bold text-sm sm:text-base mt-1.5 line-clamp-2">{d.theme}</div>
                </button>
              );
            })}
          </div>

          {/* Conteúdo do Dia Selecionado */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-slate-200">
              <div>
                <h3 className="font-extrabold text-xl text-[#1E293B]">
                  Dia {selectedDay} ({SIPAT_EVENT_DAYS[selectedDay - 1].date}) —{' '}
                  {SIPAT_EVENT_DAYS[selectedDay - 1].theme}
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  {SIPAT_EVENT_DAYS[selectedDay - 1].focus}
                </p>
              </div>
              <Link
                to={registerHref}
                className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-[#E30613] font-bold text-xs px-3.5 py-2 rounded-md transition-colors"
              >
                <span>Acessar Atividades</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {dayMissions.map((m) => (
                <div
                  key={m.id}
                  className="border border-slate-200 rounded-lg p-5 bg-[#F8FAFC] flex flex-col justify-between hover:border-slate-300 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-white text-[#E30613] border border-red-200">
                        {m.category}
                      </span>
                      <span className="font-extrabold text-xs bg-red-100 text-[#E30613] px-2.5 py-0.5 rounded-full">
                        +{m.points} PTS
                      </span>
                    </div>
                    <h4 className="font-bold text-base text-[#1E293B] mb-1.5">{m.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{m.summary}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-medium text-emerald-700">
                      <ClipboardCheck size={14} />
                      {m.status === 'PUBLISHED' ? 'Atividade Ativa' : 'Agendada'}
                    </span>
                    <span className="font-semibold text-slate-600">{m.eventDateLabel}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6. Medalhas Oficiais e Reconhecimento */}
      <section id="medalhas" className="py-14 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#E30613]">
                CONQUISTAS E INSÍGNIAS
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1E293B] mt-1">
                Medalhas Oficiais da SIPAT 2026
              </h2>
            </div>
            <Link
              to="/ranking"
              className="inline-flex items-center gap-2 bg-[#1E293B] hover:bg-slate-800 text-white text-sm font-bold px-4 py-2.5 rounded-md transition-colors"
            >
              <Trophy size={16} className="text-[#F59E0B]" />
              <span>Ver Ranking Completo ao Vivo</span>
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {(publicConfig?.badges || []).map((badge) => (
              <div
                key={badge.slug}
                className="border border-slate-200 rounded-xl p-5 bg-[#F8FAFC] flex flex-col gap-3 hover:border-red-200 transition-colors"
              >
                <div className="flex items-center justify-center p-3 bg-white rounded-lg border border-slate-200">
                  <BadgeIcon iconName={badge.iconName} accentColor={badge.accentColor} unlocked />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#1E293B]">{badge.name}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {badge.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Banner Institucional de Privacidade e LGPD */}
          <div className="mt-10 bg-[#F8FAFC] border border-slate-200 border-l-4 border-l-[#E30613] rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <ShieldCheck className="text-[#E30613] shrink-0 mt-0.5" size={26} />
              <div>
                <h4 className="font-bold text-base text-[#1E293B]">
                  Proteção de Dados e Privacidade LGPD (Lei nº 13.709/2018)
                </h4>
                <p className="text-xs text-slate-600 mt-1.5 max-w-3xl leading-relaxed">
                  Todas as fotos e vídeos submetidos pelos participantes são estritamente privados,
                  analisados apenas pela comissão avaliadora autorizada da {schoolName}. Nomes no
                  ranking contam com modo de proteção de privacidade configurável, e dados de
                  menores de idade recebem proteção especial.
                </p>
              </div>
            </div>
            <Link
              to="/acompanhamento"
              className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 px-4 py-2.5 rounded-md shadow-2xs"
            >
              <Users size={16} className="text-[#E30613]" />
              <span>Painel de Indicadores</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 7. Rodapé Oficial no Padrão SENAI-SP (Mooca) */}
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
                <li>
                  <Link to="/acompanhamento" className="hover:text-white transition-colors">
                    Painel Público de Acompanhamento
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
