import React, { useCallback, useEffect, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck,
  Filter,
  GraduationCap,
  RotateCcw,
  Search,
  Send,
  Shield,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { CertificateData, CertificateModal } from '../CertificateModal';

interface CertificateCandidate {
  id: string;
  fullName: string;
  email: string;
  registrationCode: string;
  classGroup: {
    id: string;
    code: string;
    name: string;
    courseArea: string;
    shift: string;
  } | null;
  totalPoints: number;
  level: number;
  approvedMissions: number;
  totalMissionsCount: number;
  completedQuizzes: number;
  totalQuizzesCount: number;
  avgQuizScore: number;
  badgesCount: number;
  progressPercent: number;
  isReleased: boolean;
  isEligible: boolean;
  certificate: {
    id: string;
    verificationCode: string;
    releasedAt: string;
    releasedByName: string;
    workloadHours: number;
    status: string;
  } | null;
}

interface CandidatesSummary {
  totalCandidates: number;
  releasedCount: number;
  pendingCount: number;
  eligibleCount: number;
  averageProgress: number;
}

export const AdminCertificatesTab: React.FC = () => {
  const [candidates, setCandidates] = useState<CertificateCandidate[]>([]);
  const [summary, setSummary] = useState<CandidatesSummary | null>(null);
  const [classes, setClasses] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'RELEASED' | 'ELIGIBLE'>('ALL');

  // Seleção múltipla
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pré-visualização de certificado
  const [previewCertData, setPreviewCertData] = useState<CertificateData | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (classFilter) params.set('classGroupId', classFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const [candRes, clsRes] = await Promise.all([
        apiFetch<{ candidates: CertificateCandidate[]; summary: CandidatesSummary }>(
          `/api/admin/certificates/candidates?${params.toString()}`
        ),
        apiFetch<{ classes: Array<{ id: string; code: string; name: string }> }>('/api/admin/classes'),
      ]);

      setCandidates(candRes.candidates);
      setSummary(candRes.summary);
      setClasses(clsRes.classes);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err?.message || 'Falha ao carregar candidatos a certificados.' });
    } finally {
      setLoading(false);
    }
  }, [search, classFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadData]);

  const toggleSelectAll = () => {
    if (selectedIds.size === candidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(candidates.map((c) => c.id)));
    }
  };

  const selectOnlyEligible = () => {
    const eligibleIds = candidates.filter((c) => c.isEligible && !c.isReleased).map((c) => c.id);
    setSelectedIds(new Set(eligibleIds));
  };

  const toggleSelectCandidate = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleReleaseCertificates = async (targetUserIds?: string[]) => {
    const ids = targetUserIds || Array.from(selectedIds);
    if (ids.length === 0) {
      setStatusMsg({ type: 'error', text: 'Selecione ao menos um participante para liberar o certificado.' });
      return;
    }

    if (
      !window.confirm(
        `Confirma a homologação e liberação oficial de certificado de 20 horas para ${ids.length} participante(s)?`
      )
    ) {
      return;
    }

    try {
      setProcessing(true);
      setStatusMsg(null);
      const res = await apiFetch<{ ok: boolean; releasedCount: number; skippedIncomplete?: number }>('/api/admin/certificates/release', {
        method: 'POST',
        body: JSON.stringify({ userIds: ids }),
      });

      setStatusMsg({
        type: 'success',
        text: `🎓 ${res.releasedCount} certificado(s) liberado(s).${
          res.skippedIncomplete ? ` ${res.skippedIncomplete} aluno(s) ignorado(s) por não terem concluído todos os desafios.` : ''
        }`,
      });
      setSelectedIds(new Set());
      await loadData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err?.message || 'Falha ao liberar certificados.' });
    } finally {
      setProcessing(false);
    }
  };

  const handleRevokeCertificates = async (targetUserIds?: string[]) => {
    const ids = targetUserIds || Array.from(selectedIds);
    if (ids.length === 0) return;

    if (
      !window.confirm(
        `Deseja realmente revogar a liberação de certificado de ${ids.length} participante(s)? O acesso ao certificado será bloqueado.`
      )
    ) {
      return;
    }

    try {
      setProcessing(true);
      setStatusMsg(null);
      const res = await apiFetch<{ ok: boolean; revokedCount: number }>('/api/admin/certificates/revoke', {
        method: 'POST',
        body: JSON.stringify({ userIds: ids }),
      });

      setStatusMsg({
        type: 'success',
        text: `Certificado(s) de ${res.revokedCount} participante(s) revogado(s) com sucesso.`,
      });
      setSelectedIds(new Set());
      await loadData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err?.message || 'Falha ao revogar certificados.' });
    } finally {
      setProcessing(false);
    }
  };

  const handleOpenPreview = (c: CertificateCandidate) => {
    const certData: CertificateData = {
      verificationCode: c.certificate?.verificationCode || `SENAI-SIPAT2026-MF-${c.id.slice(0, 8).toUpperCase()}`,
      studentName: c.fullName,
      registrationCode: c.registrationCode,
      classGroup: c.classGroup ? `[${c.classGroup.code}] ${c.classGroup.name}` : 'Turma Técnica SENAI',
      courseArea: c.classGroup?.courseArea || 'Formação Técnica Profissional',
      schoolName: 'Escola SENAI "Morvan Figueiredo"',
      unit: 'Escola SENAI "Morvan Figueiredo" — Mooca, São Paulo',
      institution: 'Serviço Nacional de Aprendizagem Industrial - SENAI-SP',
      eventTitle: 'SIPAT 2026',
      eventTheme: 'Segurança começa com você: prevenir é uma atitude de todos!',
      eventSlogan: 'Sua atitude faz a diferença!',
      eventDates: '16 a 19 de novembro de 2026',
      workloadHours: c.certificate?.workloadHours || 20,
      totalPoints: c.totalPoints,
      level: c.level,
      levelTitle: 'Participante Ativo',
      approvedMissionsCount: c.approvedMissions,
      completedQuizzesCount: c.completedQuizzes,
      totalActivities: c.approvedMissions + c.completedQuizzes,
      badges: [],
      signatures: [
        {
          title: 'Coordenação Geral da SIPAT 2026 / CIPA',
          name: c.certificate?.releasedByName || 'Prof. Coordenador de Segurança do Trabalho',
          role: 'Presidente da CIPA - Gestão 2026',
        },
        {
          title: 'Direção Escolar',
          name: 'Direção da Escola SENAI "Morvan Figueiredo"',
          role: 'Diretor de Unidade de Formação Profissional',
        },
      ],
      issuedAt: c.certificate?.releasedAt
        ? new Date(c.certificate.releasedAt).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })
        : new Date().toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }),
      verificationUrl: `https://www.sp.senai.br/unidade/mooca/sipat/validar?code=${
        c.certificate?.verificationCode || 'SENAI-SIPAT2026-MF'
      }`,
    };
    setPreviewCertData(certData);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho Institucional do Módulo */}
      <div className="bg-white border border-slate-200 border-l-4 border-l-[#E30613] rounded-lg p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-red-50 text-[#E30613] rounded-md">
                <GraduationCap size={22} />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Homologação & Disparo de Certificados Oficiais (20 Horas)
                </h2>
                <p className="text-xs text-slate-500">
                  Escola SENAI "Morvan Figueiredo" • Unidade Mooca • SIPAT 2026
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mt-2 max-w-3xl leading-relaxed">
              O aluno <strong className="text-slate-900">só tem acesso ao certificado oficial</strong> após a
              coordenação analisar o progresso e disparar a liberação nesta tela. Acompanhe a participação nas missões,
              quizzes e pontuação de cada cadastrado antes de homologar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadData()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
            >
              <RotateCcw size={13} />
              <span>Atualizar Lista</span>
            </button>
            <button
              type="button"
              onClick={selectOnlyEligible}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md border border-blue-200 transition-colors"
            >
              <CheckCircle2 size={13} />
              <span>Selecionar Aptos ({summary?.eligibleCount || 0})</span>
            </button>
            <button
              type="button"
              disabled={selectedIds.size === 0 || processing}
              onClick={() => handleReleaseCertificates()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold bg-[#E30613] hover:bg-[#C2040F] disabled:opacity-50 text-white rounded-md shadow-xs transition-colors cursor-pointer"
            >
              <Send size={14} />
              <span>Disparar Certificados ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Métricas e Indicadores da Campanha */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
            <div className="text-[11px] font-mono-tech text-slate-500 uppercase flex items-center gap-1">
              <Users size={12} className="text-slate-400" />
              <span>Total Inscritos</span>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{summary.totalCandidates}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Participantes da escola</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs border-t-2 border-t-emerald-500">
            <div className="text-[11px] font-mono-tech text-slate-500 uppercase flex items-center gap-1">
              <FileCheck size={12} className="text-emerald-600" />
              <span>Liberados</span>
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{summary.releasedCount}</div>
            <div className="text-[10px] text-emerald-600/80 mt-0.5">Certificados emitidos</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs border-t-2 border-t-amber-500">
            <div className="text-[11px] font-mono-tech text-slate-500 uppercase flex items-center gap-1">
              <Clock size={12} className="text-amber-600" />
              <span>Aguardando</span>
            </div>
            <div className="text-2xl font-black text-amber-600 mt-1">{summary.pendingCount}</div>
            <div className="text-[10px] text-amber-600/80 mt-0.5">Pendentes de disparo</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs border-t-2 border-t-blue-500">
            <div className="text-[11px] font-mono-tech text-slate-500 uppercase flex items-center gap-1">
              <CheckCircle2 size={12} className="text-blue-600" />
              <span>Aptos / Elegíveis</span>
            </div>
            <div className="text-2xl font-black text-blue-600 mt-1">{summary.eligibleCount}</div>
            <div className="text-[10px] text-blue-600/80 mt-0.5">Concluíram todos os desafios</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs border-t-2 border-t-purple-500 col-span-2 sm:col-span-1">
            <div className="text-[11px] font-mono-tech text-slate-500 uppercase flex items-center gap-1">
              <Award size={12} className="text-purple-600" />
              <span>Média Progresso</span>
            </div>
            <div className="text-2xl font-black text-purple-600 mt-1">{summary.averageProgress}%</div>
            <div className="text-[10px] text-purple-600/80 mt-0.5">Atividades completadas</div>
          </div>
        </div>
      )}

      {/* Alertas de Status */}
      {statusMsg && (
        <div
          className={`p-3.5 rounded-md text-xs font-medium flex items-center justify-between ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{statusMsg.text}</span>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-5 relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, RA/matrícula ou e-mail..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613] outline-hidden"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full py-1.5 px-3 text-xs border border-slate-300 rounded-md focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613] outline-hidden bg-white"
            >
              <option value="">Todas as Turmas do SENAI Mooca</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.code}] {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full py-1.5 px-3 text-xs border border-slate-300 rounded-md focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613] outline-hidden bg-white"
            >
              <option value="ALL">Status: Todos</option>
              <option value="PENDING">Apenas Aguardando Disparo</option>
              <option value="ELIGIBLE">Apenas Aptos / Elegíveis</option>
              <option value="RELEASED">Apenas Já Homologados / Liberados</option>
            </select>
          </div>
        </div>

        {/* Barra de Seleção e Ações em Lote */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none font-medium text-slate-700">
              <input
                type="checkbox"
                checked={candidates.length > 0 && selectedIds.size === candidates.length}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded text-[#E30613] focus:ring-[#E30613] border-slate-300"
              />
              <span>
                Selecionar todos os {candidates.length} listados ({selectedIds.size} selecionados)
              </span>
            </label>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleReleaseCertificates()}
                disabled={processing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors cursor-pointer"
              >
                <Send size={12} />
                <span>Disparar Selecionados ({selectedIds.size})</span>
              </button>
              <button
                type="button"
                onClick={() => handleRevokeCertificates()}
                disabled={processing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-red-100 hover:text-red-700 text-slate-700 rounded text-xs font-semibold transition-colors cursor-pointer"
              >
                <span>Revogar Selecionados</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lista de Alunos e Progresso Individual */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1E293B] text-white text-[11px] font-mono-tech uppercase">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={candidates.length > 0 && selectedIds.size === candidates.length}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 rounded text-[#E30613] focus:ring-[#E30613]"
                  />
                </th>
                <th className="py-3 px-3">Participante / Aluno</th>
                <th className="py-3 px-3">Turma & Turno</th>
                <th className="py-3 px-3 w-44">Progresso Geral</th>
                <th className="py-3 px-3 text-center">Missões</th>
                <th className="py-3 px-3 text-center">Quizzes</th>
                <th className="py-3 px-3 text-center">Pontos</th>
                <th className="py-3 px-3">Status do Certificado</th>
                <th className="py-3 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <div className="inline-block animate-spin w-6 h-6 border-2 border-[#E30613] border-t-transparent rounded-full mb-2" />
                    <div>Carregando participantes e progresso na SIPAT 2026...</div>
                  </td>
                </tr>
              ) : candidates.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    Nenhum participante encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                candidates.map((c) => {
                  const isSelected = selectedIds.has(c.id);

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-red-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectCandidate(c.id)}
                          className="w-3.5 h-3.5 rounded text-[#E30613] focus:ring-[#E30613] border-slate-300"
                        />
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{c.fullName}</div>
                        <div className="text-[11px] text-slate-500 font-mono-tech flex items-center gap-1.5 mt-0.5">
                          <span>RA: {c.registrationCode}</span>
                          <span>•</span>
                          <span className="truncate max-w-[140px]">{c.email}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {c.classGroup ? (
                          <div>
                            <span className="font-mono-tech font-bold text-[#E30613]">
                              [{c.classGroup.code}]
                            </span>
                            <div className="text-slate-700 truncate max-w-[160px] font-medium">
                              {c.classGroup.name}
                            </div>
                            <div className="text-[10px] text-slate-400">{c.classGroup.shift}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Sem turma vinculada</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-bold text-slate-800">{c.progressPercent}%</span>
                          <span className="text-slate-400 text-[10px]">
                            {c.approvedMissions + c.completedQuizzes} / {c.totalMissionsCount + c.totalQuizzesCount} ativ.
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              c.progressPercent >= 75
                                ? 'bg-emerald-500'
                                : c.progressPercent >= 30
                                ? 'bg-blue-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${c.progressPercent}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="font-bold text-slate-800">
                          {c.approvedMissions} <span className="text-slate-400 font-normal">/ {c.totalMissionsCount}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">aprovadas</div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="font-bold text-slate-800">
                          {c.completedQuizzes} <span className="text-slate-400 font-normal">/ {c.totalQuizzesCount}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {c.completedQuizzes > 0 ? `Méd. ${c.avgQuizScore}%` : '—'}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="font-extrabold text-[#E30613] font-mono-tech">
                          {c.totalPoints}
                        </span>
                        <div className="text-[10px] text-slate-400">Nível {c.level}</div>
                      </td>

                      <td className="py-3 px-3">
                        {c.isReleased && c.certificate ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 size={11} />
                              <span>LIBERADO</span>
                            </span>
                            <div className="font-mono-tech text-[10px] text-slate-600 mt-0.5">
                              {c.certificate.verificationCode}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Por {c.certificate.releasedByName} em{' '}
                              {new Date(c.certificate.releasedAt).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                        ) : c.isEligible ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                              <Clock size={11} />
                              <span>APTO PARA DISPARO</span>
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Concluiu todos os desafios
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                              <span>Em andamento</span>
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {c.approvedMissions + c.completedQuizzes} de {c.totalMissionsCount + c.totalQuizzesCount} desafios
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {c.isReleased ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenPreview(c)}
                                className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                                title="Visualizar Certificado Oficial"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRevokeCertificates([c.id])}
                                className="px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Revogar liberação"
                              >
                                Revogar
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleReleaseCertificates([c.id])}
                              disabled={processing}
                              className="px-2.5 py-1 text-[11px] font-bold bg-[#E30613] hover:bg-[#C2040F] text-white rounded transition-colors cursor-pointer"
                            >
                              Disparar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Pré-visualização do Certificado */}
      {previewCertData && (
        <CertificateModal data={previewCertData} onClose={() => setPreviewCertData(null)} />
      )}
    </div>
  );
};
