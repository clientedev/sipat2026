import React, { useRef, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Printer,
  QrCode,
  Share2,
  Shield,
  ShieldCheck,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import { BadgeIcon } from './BadgeIcon';

export interface CertificateData {
  verificationCode: string;
  studentName: string;
  registrationCode: string;
  classGroup: string;
  courseArea?: string;
  schoolName: string;
  unit: string;
  institution: string;
  eventTitle: string;
  eventTheme: string;
  eventSlogan: string;
  eventDates: string;
  workloadHours: number;
  totalPoints: number;
  rankPosition?: number;
  level: number;
  levelTitle: string;
  approvedMissionsCount: number;
  completedQuizzesCount: number;
  totalActivities: number;
  badges: Array<{
    slug: string;
    name: string;
    description: string;
    iconName: string;
    accentColor: string;
  }>;
  signatures: Array<{
    title: string;
    name: string;
    role: string;
  }>;
  issuedAt: string;
  verificationUrl: string;
}

interface CertificateModalProps {
  data: CertificateData;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({ data, onClose }) => {
  const [copied, setCopied] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(data.verificationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleShare = () => {
    const text = `🎓 Concluí minha participação na ${data.eventTitle} da ${data.schoolName}! Conquistei ${data.totalPoints} pontos, nível ${data.level} (${data.levelTitle}) e ${data.workloadHours}h de formação em cultura preventiva! Código de validação: ${data.verificationCode}`;
    if (navigator.share) {
      navigator.share({ title: 'Certificado SIPAT 2026 - SENAI', text, url: window.location.origin }).catch(() => {});
    } else {
      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + window.location.origin)}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Estilos específicos para impressão em formato A4 Paisagem */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #senai-certificate-print-area, #senai-certificate-print-area * {
            visibility: visible;
          }
          #senai-certificate-print-area {
            position: fixed;
            left: 0;
            top: 0;
            width: 100vw;
            height: 100vh;
            margin: 0;
            padding: 20px;
            box-shadow: none;
            border: none;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[96vh] flex flex-col overflow-hidden shadow-2xl border border-slate-300">
        {/* Barra superior de ações */}
        <div className="bg-[#1E293B] text-white px-5 py-3.5 border-b-2 border-[#E30613] flex items-center justify-between gap-3 shrink-0 no-print">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
            <Award size={18} />
            <span className="text-white">Certificado Oficial SENAI • 20 Horas</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 bg-[#E30613] hover:bg-[#C2040F] text-white text-xs font-bold px-3.5 py-1.5 rounded-md cursor-pointer transition-colors shadow-2xs"
            >
              <Printer size={15} />
              <span>Imprimir / Salvar PDF</span>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold px-3 py-1.5 rounded-md cursor-pointer transition-colors"
            >
              <Share2 size={15} />
              <span className="hidden sm:inline">Compartilhar</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 cursor-pointer transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Área do Diploma (Exibição e Impressão) */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100 flex justify-center">
          <div
            id="senai-certificate-print-area"
            ref={printAreaRef}
            className="w-full max-w-[850px] bg-white text-[#1E293B] p-6 sm:p-10 rounded-lg shadow-md border-8 border-double border-[#D97706] relative overflow-hidden select-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(227, 6, 19, 0.015) 0%, transparent 70%)',
            }}
          >
            {/* Moldura Interna com Detalhe Vermelho SENAI */}
            <div className="border border-[#E30613]/40 p-5 sm:p-7 relative rounded flex flex-col justify-between min-h-[520px]">
              {/* Marca d'água sutil ao fundo */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                <img src="/brand/senai-oficial.png" alt="" className="w-96 object-contain" />
              </div>

              {/* Cabeçalho Oficial SENAI */}
              <div className="flex items-start justify-between gap-4 border-b-2 border-slate-200 pb-4 relative z-10">
                <div className="flex items-center gap-3.5">
                  <img
                    src="/brand/senai-oficial.png"
                    alt="SENAI"
                    className="h-10 sm:h-12 w-auto object-contain shrink-0"
                  />
                  <div className="border-l-2 border-slate-300 pl-3 leading-tight">
                    <span className="text-[11px] font-bold text-slate-700 tracking-wider uppercase block">
                      SERVIÇO NACIONAL DE APRENDIZAGEM INDUSTRIAL
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-[#1E293B] tracking-tight block">
                      Escola SENAI &quot;Morvan Figueiredo&quot; — Mooca
                    </span>
                    <span className="text-[10px] font-bold text-[#E30613] uppercase tracking-wide">
                      CIPA • Comissão Interna de Prevenção de Acidentes e Assédio
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0 hidden sm:block">
                  <span className="inline-block bg-[#E30613] text-white font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded">
                    SIPAT 2026
                  </span>
                  <span className="text-[11px] font-mono-tech text-slate-500 block mt-1">
                    Carga: {data.workloadHours} Horas
                  </span>
                </div>
              </div>

              {/* Corpo do Diploma */}
              <div className="text-center py-6 sm:py-8 space-y-4 relative z-10">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D97706]">
                  <Sparkles size={16} />
                  <span>Certificado de Participação e Formação Preventiva</span>
                  <Sparkles size={16} />
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E293B] tracking-tight">
                  CERTIFICADO
                </h1>

                <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
                  Certificamos com distinção para os devidos fins institucionais que
                </p>

                {/* Nome do Aluno em Destaque */}
                <div className="py-1">
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#E30613] border-b-2 border-[#E30613] pb-1 inline-block tracking-tight px-4">
                    {data.studentName}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 max-w-2xl mx-auto leading-relaxed">
                  Matrícula/RA <strong>{data.registrationCode}</strong>, da turma{' '}
                  <strong>{data.classGroup}</strong>, participou ativamente da{' '}
                  <strong>SIPAT 2026 (Semana Interna de Prevenção de Acidentes do Trabalho)</strong>,
                  realizada no período de <strong>{data.eventDates}</strong> na {data.schoolName},
                  cumprindo carga horária complementar de <strong>{data.workloadHours} horas</strong>{' '}
                  em desafios práticos de percepção de riscos (NR-01 e NR-26), segurança em oficinas e
                  máquinas (NR-06, NR-10 e NR-12), ergonomia aplicada (NR-17) e segurança da informação.
                </p>

                {/* Destaque de Desempenho e Medalhas */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 sm:p-4 max-w-2xl mx-auto flex flex-wrap items-center justify-around gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Pontuação</span>
                    <strong className="text-base font-extrabold text-[#E30613]">{data.totalPoints} PTS</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Nível Preventivo</span>
                    <strong className="text-xs font-bold text-slate-800">Nível {data.level} • {data.levelTitle}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Atividades Validadas</span>
                    <strong className="text-xs font-bold text-slate-800">{data.totalActivities} Concluídas</strong>
                  </div>
                </div>

                {/* Medalhas Conquistadas */}
                {data.badges.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                      Medalhas Oficiais Conquistadas
                    </span>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      {data.badges.map((b) => (
                        <div
                          key={b.slug}
                          className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-800 shadow-2xs"
                        >
                          <BadgeIcon iconName={b.iconName} accentColor={b.accentColor} unlocked size="sm" />
                          <span>{b.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Rodapé com Assinaturas Oficiais e Código de Validação */}
              <div className="border-t-2 border-slate-200 pt-5 mt-4 relative z-10">
                <div className="grid grid-cols-2 gap-8 text-center text-xs mb-4">
                  <div className="flex flex-col items-center">
                    <div className="w-48 border-b border-slate-400 mb-1" />
                    <span className="font-bold text-slate-800">{data.signatures[0].name}</span>
                    <span className="text-[10px] text-slate-500">{data.signatures[0].title}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-48 border-b border-slate-400 mb-1" />
                    <span className="font-bold text-slate-800">{data.signatures[1].name}</span>
                    <span className="text-[10px] text-slate-500">{data.signatures[1].title}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-slate-500 pt-3 border-t border-slate-200/80">
                  <div className="flex items-center gap-2 font-mono-tech">
                    <ShieldCheck size={14} className="text-[#10B981]" />
                    <span>Autenticação Digital: <strong className="text-slate-800">{data.verificationCode}</strong></span>
                  </div>
                  <div>
                    <span>Emitido em: {data.issuedAt}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé com Código Copiável */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs no-print">
          <div className="flex items-center gap-2 text-slate-600">
            <span className="font-medium">Código para validação oficial:</span>
            <code className="bg-white border border-slate-300 px-2 py-1 rounded font-bold text-[#E30613] font-mono-tech">
              {data.verificationCode}
            </code>
            <button
              type="button"
              onClick={handleCopyCode}
              className="text-slate-600 hover:text-slate-900 p-1 cursor-pointer"
              title="Copiar Código"
            >
              {copied ? <CheckCircle2 size={15} className="text-emerald-600" /> : <Copy size={15} />}
            </button>
          </div>

          <p className="text-[11px] text-slate-500">
            Válido para aproveitamento de carga horária complementar no SENAI-SP.
          </p>
        </div>
      </div>
    </div>
  );
};
