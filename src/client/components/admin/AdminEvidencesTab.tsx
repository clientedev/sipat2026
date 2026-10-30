import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileVideo,
  Image as ImageIcon,
  RefreshCw,
  RotateCcw,
  Search,
  XCircle,
} from 'lucide-react';
import { apiFetch, getStoredToken } from '../../lib/api';

interface AdminSubmissionItem {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_CORRECTION';
  textResponse: string | null;
  structuredData: Record<string, any> | null;
  teamName: string | null;
  teamMembersText: string | null;
  mediaUrl: string | null;
  mediaMime: string | null;
  isPublicHighlight: boolean;
  awardedPoints: number;
  feedback: string | null;
  submittedAt: string;
  evaluatedAt: string | null;
  evaluatedBy: { fullName: string; role: string } | null;
  participant: {
    id: string;
    fullName: string;
    email: string;
    registrationCode: string | null;
    isMinor: boolean;
    imageConsent: boolean;
    classGroup: { id: string; code: string; name: string } | null;
  };
  mission: {
    id: string;
    slug: string;
    title: string;
    category: string;
    eventDay: number;
    points: number;
    submissionType: string;
    evaluationCriteria: string;
  };
}

/**
 * Componente que carrega mídias privadas via fetch autenticado (Bearer + Cookie) respeitando a LGPD
 */
const ProtectedMediaViewer: React.FC<{ url: string; mime: string | null }> = ({ url, mime }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    fetch(url, { headers, credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error('Forbidden');
        return r.blob();
      })
      .then((blob) => {
        if (!active) return;
        createdUrl = URL.createObjectURL(blob);
        setBlobUrl(createdUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [url]);

  if (failed) {
    return (
      <div className="p-4 bg-slate-100 border border-slate-300 rounded text-xs text-slate-500">
        Arquivo de mídia indisponível ou removido pela política de retenção LGPD.
      </div>
    );
  }
  if (!blobUrl) {
    return (
      <div className="p-6 bg-slate-100 border border-slate-200 rounded text-xs text-slate-500 text-center">
        Carregando mídia privada autenticada...
      </div>
    );
  }

  if (mime?.startsWith('video/')) {
    return (
      <video
        src={blobUrl}
        controls
        className="w-full max-h-80 rounded border border-slate-300 bg-black"
      />
    );
  }

  return (
    <img
      src={blobUrl}
      alt="Evidência enviada pelo participante"
      className="w-full max-h-80 object-contain rounded border border-slate-300 bg-slate-900/5"
    />
  );
};

export const AdminEvidencesTab: React.FC<{ onReviewed?: () => void }> = ({ onReviewed }) => {
  const [submissions, setSubmissions] = useState<AdminSubmissionItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminSubmissionItem | null>(null);

  const [pointsInput, setPointsInput] = useState<number>(0);
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [highlightInput, setHighlightInput] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set('status', statusFilter);
      if (search.trim()) qs.set('search', search.trim());
      const res = await apiFetch<{ submissions: AdminSubmissionItem[] }>(
        `/api/admin/submissions?${qs.toString()}`
      );
      setSubmissions(res.submissions);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const openItem = (sub: AdminSubmissionItem) => {
    setSelected(sub);
    setPointsInput(sub.status === 'APPROVED' ? sub.awardedPoints : sub.mission.points);
    setFeedbackInput(sub.feedback || '');
    setHighlightInput(sub.isPublicHighlight);
    setError(null);
  };

  const submitReview = async (decision: 'APPROVED' | 'NEEDS_CORRECTION' | 'REJECTED') => {
    if (!selected) return;
    setError(null);
    setSaving(true);
    try {
      await apiFetch(`/api/admin/submissions/${selected.id}/review`, {
        method: 'POST',
        body: JSON.stringify({
          status: decision,
          awardedPoints: decision === 'APPROVED' ? pointsInput : 0,
          feedback: feedbackInput,
          isPublicHighlight: decision === 'APPROVED' ? highlightInput : false,
        }),
      });
      setSelected(null);
      await loadList();
      onReviewed?.();
    } catch (err: any) {
      setError(err?.message || 'Erro ao registrar avaliação.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-md p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'PENDING', label: 'Pendentes' },
            { id: 'APPROVED', label: 'Aprovadas' },
            { id: 'NEEDS_CORRECTION', label: 'Em Correção' },
            { id: 'REJECTED', label: 'Reprovadas' },
            { id: 'ALL', label: 'Todas' },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded text-xs font-bold uppercase font-mono-tech cursor-pointer ${
                statusFilter === st.id
                  ? 'bg-[#E30613] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar aluno ou missão..."
              className="border border-slate-300 rounded pl-8 pr-3 py-1.5 text-xs w-56"
            />
          </div>
          <button
            type="button"
            onClick={() => void loadList()}
            className="p-2 border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
            title="Atualizar fila"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-5">
        {/* Lista de Evidências */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-600">
            Fila da Central de Evidências ({submissions.length})
          </div>

          {loading ? (
            <p className="p-8 text-center text-xs text-slate-500">Consultando banco de dados...</p>
          ) : submissions.length === 0 ? (
            <p className="p-8 text-center text-xs text-slate-500">
              Nenhuma evidência encontrada neste filtro.
            </p>
          ) : (
            <div className="divide-y divide-slate-200 max-h-[620px] overflow-y-auto">
              {submissions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => openItem(s)}
                  className={`w-full text-left p-4 hover:bg-blue-50/40 transition-colors flex items-start justify-between gap-3 cursor-pointer ${
                    selected?.id === s.id ? 'bg-blue-50 border-l-4 border-l-[#E30613]' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[11px] font-mono-tech">
                      <span className="font-bold text-[#E30613]">DIA {s.mission.eventDay}</span>
                      <span>•</span>
                      <span className="text-slate-500">
                        {new Date(s.submittedAt).toLocaleString('pt-BR')}
                      </span>
                      {s.mediaMime?.startsWith('video/') ? (
                        <FileVideo size={13} className="text-amber-600" />
                      ) : s.mediaUrl ? (
                        <ImageIcon size={13} className="text-[#E30613]" />
                      ) : null}
                    </div>
                    <div className="font-bold text-sm text-[#0F172A] truncate mt-0.5">
                      {s.mission.title}
                    </div>
                    <div className="text-xs text-slate-600 truncate">
                      {s.participant.fullName}{' '}
                      <span className="font-mono-tech text-slate-500">
                        ({s.participant.classGroup?.code || 'S/T'})
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`text-[10px] font-mono-tech font-bold px-2 py-0.5 rounded block ${
                        s.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-900'
                          : s.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : s.status === 'NEEDS_CORRECTION'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {s.status}
                    </span>
                    <span className="text-xs font-mono-tech text-slate-500 mt-1 block">
                      Máx: {s.mission.points} pts
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Painel de Análise Técnica da Evidência Selecionada */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-md p-5">
          {!selected ? (
            <div className="py-20 text-center text-slate-500 space-y-2">
              <Eye size={30} className="mx-auto text-slate-400" />
              <p className="font-semibold text-sm">Selecione uma submissão ao lado para avaliar</p>
              <p className="text-xs">
                Analise fotos, vídeos e relatos técnicos antes de atribuir pontuação.
              </p>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="pb-3 border-b border-slate-200">
                <span className="font-mono-tech uppercase text-[#E30613] font-bold">
                  ANÁLISE DE EVIDÊNCIA • DIA {selected.mission.eventDay}
                </span>
                <h3 className="text-base font-bold text-[#0F172A] mt-0.5">
                  {selected.mission.title}
                </h3>
                <p className="text-slate-600 mt-1">
                  <strong>Participante:</strong> {selected.participant.fullName} (
                  {selected.participant.registrationCode || selected.participant.email}) •{' '}
                  <strong>Turma:</strong> {selected.participant.classGroup?.name || 'Sem turma'}
                </p>
                {selected.teamName && (
                  <p className="text-blue-800 mt-1">
                    <strong>Equipe:</strong> {selected.teamName} ({selected.teamMembersText || '-'})
                  </p>
                )}
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded p-3">
                <strong className="text-slate-700 block mb-0.5">Critérios da Missão:</strong>
                <span className="text-slate-600">{selected.mission.evaluationCriteria}</span>
              </div>

              {selected.mediaUrl && (
                <div>
                  <strong className="text-slate-700 block mb-1.5">
                    Arquivo Multimídia Privado (Foto / Vídeo):
                  </strong>
                  <ProtectedMediaViewer url={selected.mediaUrl} mime={selected.mediaMime} />
                </div>
              )}

              {/* Dados estruturados Caça aos Riscos */}
              {selected.structuredData && selected.structuredData.environment && (
                <div className="bg-amber-50/70 border border-amber-200 rounded p-3.5 space-y-1.5">
                  <div className="font-bold text-amber-950 uppercase font-mono-tech">
                    Diagnóstico Estruturado – Caça aos Riscos
                  </div>
                  <p>
                    <strong>Ambiente:</strong> {selected.structuredData.environment} (
                    {selected.structuredData.hazardType})
                  </p>
                  <p>
                    <strong>Perigo Identificado:</strong>{' '}
                    {selected.structuredData.hazardDescription}
                  </p>
                  <p>
                    <strong>Possíveis Consequências:</strong> {selected.structuredData.consequences}
                  </p>
                  <p>
                    <strong>Medidas Preventivas:</strong>{' '}
                    {selected.structuredData.preventiveMeasures}
                  </p>
                </div>
              )}

              {selected.textResponse && (
                <div className="bg-[#F8FAFC] border border-slate-200 rounded p-3.5">
                  <strong className="text-slate-700 block mb-1">Relato do Participante:</strong>
                  <p className="text-slate-800 whitespace-pre-line leading-relaxed">
                    {selected.textResponse}
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded flex items-center gap-2">
                  <AlertTriangle size={15} />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Pontos a Atribuir (Limite: 0 a {selected.mission.points} pts)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={selected.mission.points}
                      value={pointsInput}
                      onChange={(e) =>
                        setPointsInput(
                          Math.min(
                            selected.mission.points,
                            Math.max(0, Number(e.target.value) || 0)
                          )
                        )
                      }
                      className="w-full border border-slate-300 rounded px-3 py-2 font-mono-tech font-bold"
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                      <input
                        type="checkbox"
                        disabled={!selected.participant.imageConsent}
                        checked={highlightInput && selected.participant.imageConsent}
                        onChange={(e) => setHighlightInput(e.target.checked)}
                        className="accent-[#E30613]"
                      />
                      <span>
                        Destacar atividade no mural (
                        {selected.participant.imageConsent
                          ? 'Consentimento ativo'
                          : 'Sem autorização pública LGPD'}
                        )
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Justificativa / Parecer Pedagógico (Obrigatório para correção/reprovação)
                  </label>
                  <textarea
                    rows={2}
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    placeholder="Escreva uma devolutiva técnica construtiva para o aluno..."
                    className="w-full border border-slate-300 rounded px-3 py-2"
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void submitReview('APPROVED')}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#15803D] hover:bg-emerald-800 text-white font-bold py-2.5 px-3 rounded cursor-pointer"
                  >
                    <CheckCircle2 size={15} />
                    <span>Aprovar (+{pointsInput} pts)</span>
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void submitReview('NEEDS_CORRECTION')}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 px-3 rounded cursor-pointer"
                  >
                    <RotateCcw size={15} />
                    <span>Pedir Correção</span>
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void submitReview('REJECTED')}
                    className="inline-flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-3 rounded cursor-pointer"
                  >
                    <XCircle size={15} />
                    <span>Reprovar</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

