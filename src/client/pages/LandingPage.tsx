import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  HardHat,
  LogIn,
  QrCode,
  Shield,
  ShieldCheck,
  Trophy,
  Users,
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
    <div className="min-h-screen flex flex-col bg-[#F4F6F9] text-[#0F172A]">
      {/* Faixa superior técnica de sinalização preventiva */}
      <div className="bg-[#0F172A] text-white border-b-2 border-[#FFB800]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tech">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#FFB800]" />
            <span className="uppercase tracking-wider text-[#FFB800] font-semibold">
              CAMPANHA OFICIAL SIPAT 2026
            </span>
            <span className="hidden sm:inline text-slate-400">|</span>
            <span className="hidden sm:inline text-slate-200">
              16 A 19 DE NOVEMBRO DE 2026 • {schoolName.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/ranking"
              className="text-slate-200 hover:text-[#FFB800] flex items-center gap-1.5 transition-colors"
            >
              <Trophy size={13} />
              <span>Ranking Ao Vivo</span>
            </Link>
            <Link
              to="/acompanhamento"
              className="text-slate-200 hover:text-[#FFB800] flex items-center gap-1.5 transition-colors"
            >
              <BarChart3 size={13} />
              <span>Indicadores Públicos</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Cabeçalho Institucional SENAI */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          <InstitutionalBrand
            officialLogoUrl={publicConfig?.officialLogoUrl}
            schoolName={schoolName}
            variant="dark"
          />

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-700">
            <a href="#objetivos" className="hover:text-[#0047B6] transition-colors">
              Objetivos
            </a>
            <a href="#programacao" className="hover:text-[#0047B6] transition-colors">
              Programação 16–19 Nov
            </a>
            <a href="#conquistas" className="hover:text-[#0047B6] transition-colors">
              Pontuação & Medalhas
            </a>
            <Link to="/ranking" className="hover:text-[#0047B6] transition-colors">
              Ranking
            </Link>
          </nav>

          <div className="flex items-center gap-2.5">
            {user ? (
              <Link
                to={user.role === 'PARTICIPANT' ? '/app' : '/admin'}
                className="inline-flex items-center gap-2 bg-[#0047B6] hover:bg-[#003894] text-white font-semibold text-sm px-4 py-2.5 rounded-md transition-colors"
              >
                <span>Ir para Meu Painel</span>
                <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm px-3.5 py-2.5 rounded-md transition-colors"
                >
                  <LogIn size={16} />
                  <span>Entrar</span>
                </Link>
                <Link
                  to={registerHref}
                  className="inline-flex items-center gap-1.5 bg-[#0047B6] hover:bg-[#003894] text-white font-semibold text-sm px-4 py-2.5 rounded-md transition-colors"
                >
                  <QrCode size={16} />
                  <span>Inscrever-se</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Principal Institucional */}
      <section className="senai-blueprint-grid text-white relative overflow-hidden border-b-4 border-[#FFB800]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 bg-[#002B5C] border border-blue-400/30 px-3 py-1.5 rounded text-xs font-mono-tech uppercase tracking-wider">
              <Calendar size={14} className="text-[#FFB800]" />
              <span>16 a 19 de Novembro de 2026 • {schoolName}</span>
            </div>

            <div className="space-y-3">
              <p className="text-[#FFB800] font-condensed font-bold uppercase tracking-widest text-sm sm:text-base">
                SEMANA INTERNA DE PREVENÇÃO DE ACIDENTES DO TRABALHO
              </p>
              <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight tracking-tight">
                {theme}
              </h1>
              <div className="inline-block bg-[#FFB800] text-[#111827] font-condensed font-extrabold uppercase tracking-wider px-3.5 py-1 text-lg sm:text-xl">
                {slogan}
              </div>
            </div>

            <p className="text-blue-100 text-base sm:text-lg leading-relaxed max-w-2xl">
              Participe da competição educativa gamificada da {schoolName}. Realize missões práticas
              nas áreas autorizadas, identifique riscos reais, responda quizzes técnicos, conquiste
              medalhas e impulsione sua turma ao topo do ranking!
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to={registerHref}
                className="inline-flex items-center gap-2 bg-[#FFB800] hover:bg-[#e6a600] text-[#0F172A] font-bold px-6 py-3.5 rounded-md text-sm sm:text-base transition-colors"
              >
                <QrCode size={18} />
                <span>Realizar Inscrição Agora</span>
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold px-5 py-3.5 rounded-md text-sm sm:text-base transition-colors"
              >
                <LogIn size={18} />
                <span>Acesso do Participante / Comissão</span>
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/15 max-w-xl">
              <div>
                <div className="font-condensed font-bold text-2xl sm:text-3xl text-[#FFB800]">
                  4 DIAS
                </div>
                <div className="text-xs text-blue-100">De desafios técnicos e gincana</div>
              </div>
              <div>
                <div className="font-condensed font-bold text-2xl sm:text-3xl text-white">
                  100% AO VIVO
                </div>
                <div className="text-xs text-blue-100">Missões e ranking em tempo real</div>
              </div>
              <div>
                <div className="font-condensed font-bold text-2xl sm:text-3xl text-white">
                  5 MEDALHAS
                </div>
                <div className="text-xs text-blue-100">Insígnias oficiais de prevenção</div>
              </div>
            </div>
          </div>

          {/* Card Lateral de Inscrição por QR Code + Fotografia Industrial */}
          <div className="lg:col-span-5">
            <div className="bg-white text-[#0F172A] rounded-md border-2 border-slate-200 overflow-hidden shadow-sm">
              <div className="h-36 relative bg-slate-900 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=900&q=80"
                  alt="Segurança do Trabalho em Ambiente Técnico SENAI"
                  className="w-full h-full object-cover opacity-75"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/40 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white">
                  <div>
                    <span className="text-[11px] font-mono-tech uppercase text-[#FFB800] block">
                      INSCRIÇÃO RÁPIDA MOBILE
                    </span>
                    <span className="font-bold text-base">Aponte a câmera para o QR Code</span>
                  </div>
                  <HardHat size={26} className="text-[#FFB800]" />
                </div>
              </div>

              <div className="p-6 flex flex-col items-center text-center">
                {publicConfig?.registrationOpen && publicConfig?.qrDataUrl ? (
                  <>
                    <div className="p-3 bg-white border-2 border-[#0047B6] rounded-md">
                      <img
                        src={publicConfig.qrDataUrl}
                        alt="QR Code Oficial de Inscrição SIPAT 2026"
                        className="w-44 h-44 object-contain"
                      />
                    </div>
                    <p className="text-xs text-slate-600 mt-3 max-w-xs">
                      Escaneie com o celular para abrir o cadastro rápido com captura de foto, escolha
                      de turma e acesso imediato às missões.
                    </p>
                    <Link
                      to={registerHref}
                      className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-[#0047B6] hover:bg-[#003894] text-white font-semibold py-2.5 px-4 rounded-md text-sm transition-colors"
                    >
                      <span>Abrir Formulário neste Dispositivo</span>
                      <ArrowRight size={16} />
                    </Link>
                  </>
                ) : (
                  <div className="py-6 space-y-3">
                    <AlertTriangle size={32} className="mx-auto text-amber-600" />
                    <p className="font-semibold text-slate-800">
                      Período de inscrições controlado pela coordenação
                    </p>
                    <p className="text-xs text-slate-600">
                      Caso já possua cadastro, acesse normalmente pelo botão Entrar.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pilares e Objetivos Pedagógicos */}
      <section id="objetivos" className="py-14 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs font-mono-tech uppercase tracking-wider text-[#0047B6] font-semibold">
                FORMAÇÃO TÉCNICA E CULTURA PREVENTIVA
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] mt-1">
                Objetivos da SIPAT 2026 na {schoolName}
              </h2>
            </div>
            <p className="text-sm text-slate-600 max-w-md">
              Atividades práticas alinhadas às Normas Regulamentadoras e aos cursos técnicos e de
              aprendizagem industrial da unidade.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: <AlertTriangle size={22} />,
                code: 'EIXO 01 • NR-01 / NR-26',
                title: 'Percepção de Riscos e Sinalização',
                desc: 'Identificação proativa de condições inseguras, leitura correta de sinalizações de segurança e comunicação preventiva.',
              },
              {
                icon: <HardHat size={22} />,
                code: 'EIXO 02 • NR-06 / NR-10 / NR-12',
                title: 'EPIs e Segurança nas Oficinas',
                desc: 'Uso correto de EPIs, ferramentas íntegras, desenergização elétrica, cilindros, gases refrigerantes e bancadas 5S.',
              },
              {
                icon: <Activity size={22} />,
                code: 'EIXO 03 • NR-17',
                title: 'Ergonomia e Organização',
                desc: 'Postura consciente, ajuste de monitores e cadeiras, iluminação adequada, levantamento de cargas e pausas ativas.',
              },
              {
                icon: <ShieldCheck size={22} />,
                code: 'EIXO 04 • MULTIDISCIPLINAR',
                title: 'TI, Logística e Climatização',
                desc: 'Prevenção a phishing e golpes digitais, armazenagem segura em logística e protocolos nas oficinas térmicas.',
              },
            ].map((item) => (
              <div
                key={item.code}
                className="bg-[#F8FAFC] border border-slate-200 border-t-4 border-t-[#0047B6] rounded-md p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-mono-tech font-semibold text-slate-500">
                      {item.code}
                    </span>
                    <div className="w-9 h-9 rounded bg-[#0047B6]/10 text-[#0047B6] flex items-center justify-center">
                      {item.icon}
                    </div>
                  </div>
                  <h3 className="font-bold text-base text-[#0F172A] mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Programação Oficial dos 4 Dias */}
      <section id="programacao" className="py-14 bg-[#F4F6F9] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-8">
            <span className="text-xs font-mono-tech uppercase tracking-wider text-[#0047B6] font-semibold">
              CRONOGRAMA OFICIAL DE ATIVIDADES
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] mt-1">
              Quatro Dias de Desafios Práticos (16 a 19 de Novembro)
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            {SIPAT_EVENT_DAYS.map((d) => {
              const active = selectedDay === d.day;
              return (
                <button
                  key={d.day}
                  type="button"
                  onClick={() => setSelectedDay(d.day)}
                  className={`text-left p-4 rounded-md border transition-all cursor-pointer ${
                    active
                      ? 'bg-[#0047B6] text-white border-[#0047B6] shadow-sm'
                      : 'bg-white text-[#0F172A] border-slate-200 hover:border-[#0047B6]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-mono-tech text-xs font-semibold ${
                        active ? 'text-[#FFB800]' : 'text-[#0047B6]'
                      }`}
                    >
                      DIA 0{d.day} • {d.shortDate}
                    </span>
                    <span className={`text-xs ${active ? 'text-blue-100' : 'text-slate-400'}`}>
                      {d.weekday}
                    </span>
                  </div>
                  <div className="font-bold text-sm sm:text-base mt-1.5 line-clamp-2">{d.theme}</div>
                </button>
              );
            })}
          </div>

          <div className="bg-white border border-slate-200 rounded-md p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-5 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-lg text-[#0F172A]">
                  Dia {selectedDay} ({SIPAT_EVENT_DAYS[selectedDay - 1].date}) —{' '}
                  {SIPAT_EVENT_DAYS[selectedDay - 1].theme}
                </h3>
                <p className="text-sm text-slate-600">{SIPAT_EVENT_DAYS[selectedDay - 1].focus}</p>
              </div>
              <Link
                to={registerHref}
                className="text-sm font-semibold text-[#0047B6] hover:underline flex items-center gap-1"
              >
                <span>Participar das atividades</span>
                <ArrowRight size={15} />
              </Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dayMissions.map((m) => (
                <div
                  key={m.id}
                  className="border border-slate-200 rounded-md p-4 bg-[#F8FAFC] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-mono-tech uppercase px-2 py-0.5 rounded bg-blue-50 text-[#0047B6] border border-blue-200 font-semibold">
                        {m.category}
                      </span>
                      <span className="font-mono-tech font-bold text-xs bg-[#FFB800]/20 text-amber-900 px-2 py-0.5 rounded">
                        +{m.points} PTS
                      </span>
                    </div>
                    <h4 className="font-bold text-base text-[#0F172A] mb-1.5">{m.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{m.summary}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <ClipboardCheck size={14} className="text-[#15803D]" />
                      {m.status === 'PUBLISHED' ? 'Disponível no painel' : 'Liberação agendada'}
                    </span>
                    <span className="font-mono-tech">{m.eventDateLabel}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Medalhas e Acompanhamento Público */}
      <section id="conquistas" className="py-14 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-mono-tech uppercase tracking-wider text-[#0047B6] font-semibold">
                RECONHECIMENTO E GAMIFICAÇÃO
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] mt-1">
                Medalhas Oficiais da Competição
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/ranking"
                className="inline-flex items-center gap-2 bg-[#0F172A] hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2.5 rounded-md transition-colors"
              >
                <Trophy size={16} className="text-[#FFB800]" />
                <span>Abrir Ranking Ao Vivo (Modo TV)</span>
              </Link>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {(publicConfig?.badges || []).map((badge) => (
              <div
                key={badge.slug}
                className="border border-slate-200 rounded-md p-4 bg-[#F8FAFC] flex flex-col gap-3"
              >
                <BadgeIcon iconName={badge.iconName} accentColor={badge.accentColor} unlocked />
                <div>
                  <h3 className="font-bold text-sm text-[#0F172A]">{badge.name}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {badge.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Banner de Transparência e LGPD */}
          <div className="mt-10 bg-[#F8FAFC] border border-slate-200 border-l-4 border-l-[#0047B6] rounded-md p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <Shield className="text-[#0047B6] shrink-0 mt-0.5" size={24} />
              <div>
                <h4 className="font-bold text-sm text-[#0F172A]">
                  Compromisso Institucional com a Privacidade e a LGPD (Lei nº 13.709/2018)
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
                  Todas as evidências fotográficas e em vídeo enviadas pelos estudantes e
                  colaboradores são privadas por padrão, analisadas exclusivamente pela comissão
                  avaliadora autorizada da {schoolName}, com proteção especial a menores de idade e
                  controle de exibição pública no ranking.
                </p>
              </div>
            </div>
            <Link
              to="/acompanhamento"
              className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 px-3.5 py-2 rounded-md"
            >
              <Users size={15} className="text-[#0047B6]" />
              <span>Painel Público de Indicadores</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Rodapé Institucional */}
      <footer className="bg-[#0F172A] text-slate-300 mt-auto">
        <div className="h-1.5 safety-hazard-bar" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={18} className="text-[#FFB800]" />
            <div>
              <p className="font-bold text-white">{schoolName} • SIPAT 2026</p>
              <p className="text-slate-400">
                16 a 19 de Novembro de 2026 — &quot;{theme}&quot; • {slogan}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/ranking" className="hover:text-white">
              Ranking Público
            </Link>
            <Link to="/acompanhamento" className="hover:text-white">
              Acompanhamento Geral
            </Link>
            <Link to="/login" className="hover:text-white">
              Área Restrita / Avaliadores
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
