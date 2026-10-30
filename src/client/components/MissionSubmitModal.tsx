import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileVideo,
  ImagePlus,
  Send,
  Users,
  X,
} from 'lucide-react';
import { apiFetch } from '../lib/api';

export interface ParticipantMissionItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  instructions: string;
  evaluationCriteria: string;
  safetyNotice: string | null;
  bannerUrl: string | null;
  category: string;
  difficulty: string;
  participationMode: 'INDIVIDUAL' | 'TEAM';
  submissionType: string;
  eventDay: number;
  eventDateLabel: string;
  status: string;
  opensAt: string | null;
  closesAt: string | null;
  points: number;
  requiresPhoto: boolean;
  requiresVideo: boolean;
  requiresText: boolean;
  requiresApproval: boolean;
  config: {
    question?: string;
    options?: Array<{ id: string; text: string }>;
    items?: Array<{ id: string; label: string }>;
  } | null;
  mySubmission: {
    id: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_CORRECTION';
    awardedPoints: number;
    feedback: string | null;
    submittedAt: string;
    evaluatedAt: string | null;
    textResponse: string | null;
    structuredData: any;
    hasMedia: boolean;
    mediaMime: string | null;
    mediaUrl: string | null;
  } | null;
}

interface MissionSubmitModalProps {
  mission: ParticipantMissionItem;
  onClose: () => void;
  onSubmitted: () => void;
}

export const MissionSubmitModal: React.FC<MissionSubmitModalProps> = ({
  mission,
  onClose,
  onSubmitted,
}) => {
  const existing = mission.mySubmission;
  const canEdit =
    mission.status === 'PUBLISHED' && (!existing || existing.status === 'NEEDS_CORRECTION');

  const [textResponse, setTextResponse] = useState(existing?.textResponse || '');
  const [teamName, setTeamName] = useState('');
  const [teamMembersText, setTeamMembersText] = useState('');

  // Campos estruturados para Caça aos Riscos
  const [environment, setEnvironment] = useState(existing?.structuredData?.environment || '');
  const [hazardType, setHazardType] = useState(
    existing?.structuredData?.hazardType || 'Mecânico / Acidente'
  );
  const [hazardDescription, setHazardDescription] = useState(
    existing?.structuredData?.hazardDescription || ''
  );
  const [consequences, setConsequences] = useState(existing?.structuredData?.consequences || '');
  const [preventiveMeasures, setPreventiveMeasures] = useState(
    existing?.structuredData?.preventiveMeasures || ''
  );

  // Campos para Encontre os 7 Erros e Múltipla Escolha
  const [selectedErrorIds, setSelectedErrorIds] = useState<string[]>(
    existing?.structuredData?.selectedIds || []
  );
  const [selectedOptionId, setSelectedOptionId] = useState<string>(
    existing?.structuredData?.selectedOptionId || ''
  );

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const toggleSevenErrorItem = (id: string) => {
    setSelectedErrorIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setMediaFile(f);
    setMediaPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const formData = new FormData();
      if (mission.participationMode === 'TEAM') {
        formData.append('teamName', teamName);
        formData.append('teamMembersText', teamMembersText);
      }

      if (mission.submissionType === 'RISK_HUNT') {
        const struct = {
          environment,
          hazardType,
          hazardDescription,
          consequences,
          preventiveMeasures,
        };
        formData.append('structuredData', JSON.stringify(struct));
        formData.append(
          'textResponse',
          `${environment} — ${hazardDescription} | Prevenção: ${preventiveMeasures}`
        );
      } else if (mission.submissionType === 'SEVEN_ERRORS') {
        formData.append('structuredData', JSON.stringify({ selectedIds: selectedErrorIds }));
        formData.append('textResponse', textResponse);
      } else if (mission.submissionType === 'MULTIPLE_CHOICE') {
        if (!selectedOptionId) {
          throw new Error('Selecione uma alternativa antes de enviar.');
        }
        formData.append('structuredData', JSON.stringify({ selectedOptionId }));
        formData.append('textResponse', textResponse);
      } else {
        formData.append('textResponse', textResponse);
      }

      if (mediaFile) {
        formData.append('media', mediaFile);
      }

      await apiFetch(`/api/participant/missions/${mission.id}/submit`, {
        method: 'POST',
        body: formData,
      });

      onSubmitted();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro ao enviar participação.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-slate-300 rounded-md max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-xl">
        {/* Cabeçalho da Missão */}
        <div className="bg-[#0047B6] text-white px-5 py-4 border-b-4 border-[#FFB800] flex items-start justify-between gap-4 shrink-0">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono-tech uppercase text-blue-200">
              <span>
                DIA {mission.eventDay} ({mission.eventDateLabel})
              </span>
              <span>•</span>
              <span>{mission.category}</span>
              <span>•</span>
              <span className="bg-[#FFB800] text-[#0F172A] px-2 py-0.5 rounded font-bold">
                VALE {mission.points} PTS
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold mt-1">{mission.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 cursor-pointer"
          >
            <X size={22} />
          </button>
        </div>

        {/* Corpo com scroll */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          {mission.safetyNotice && (
            <div className="bg-amber-50 border border-amber-300 border-l-4 border-l-[#FFB800] p-3.5 rounded flex items-start gap-3 text-xs text-amber-950">
              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold uppercase tracking-wider text-[11px]">
                  Orientação Técnica de Segurança
                </p>
                <p className="mt-0.5 leading-relaxed">{mission.safetyNotice}</p>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Objetivo da Atividade
            </h3>
            <p className="text-slate-700 leading-relaxed">{mission.description}</p>
          </div>

          <div className="bg-[#F8FAFC] border border-slate-200 rounded p-4 space-y-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#0047B6] mb-1">
                Instruções Passo a Passo
              </h4>
              <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                {mission.instructions}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Critérios de Avaliação
              </h4>
              <p className="text-xs text-slate-600">{mission.evaluationCriteria}</p>
            </div>
          </div>

          {/* Status atual caso já exista submissão */}
          {existing && (
            <div
              className={`p-4 rounded border-l-4 ${
                existing.status === 'APPROVED'
                  ? 'bg-emerald-50 border-emerald-200 border-l-emerald-600 text-emerald-950'
                  : existing.status === 'REJECTED'
                  ? 'bg-red-50 border-red-200 border-l-red-600 text-red-950'
                  : existing.status === 'NEEDS_CORRECTION'
                  ? 'bg-amber-50 border-amber-200 border-l-amber-600 text-amber-950'
                  : 'bg-blue-50 border-blue-200 border-l-[#0047B6] text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between gap-2 font-bold text-xs uppercase">
                <span className="flex items-center gap-1.5">
                  {existing.status === 'APPROVED' ? (
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  ) : (
                    <Clock size={16} />
                  )}
                  Status:{' '}
                  {existing.status === 'APPROVED'
                    ? `APROVADA (+${existing.awardedPoints} PTS)`
                    : existing.status === 'PENDING'
                    ? 'AGUARDANDO AVALIAÇÃO TÉCNICA'
                    : existing.status === 'NEEDS_CORRECTION'
                    ? 'AJUSTE SOLICITADO PELO AVALIADOR (REENVIO LIBERADO)'
                    : 'REPROVADA'}
                </span>
                <span className="font-mono-tech text-[11px] opacity-75">
                  {new Date(existing.submittedAt).toLocaleString('pt-BR')}
                </span>
              </div>

              {existing.feedback && (
                <p className="text-xs mt-2">
                  <strong>Parecer da Comissão:</strong> {existing.feedback}
                </p>
              )}

              {existing.mediaUrl && (
                <div className="mt-3">
                  {existing.mediaMime?.startsWith('video/') ? (
                    <video
                      src={existing.mediaUrl}
                      controls
                      className="max-h-52 rounded border border-slate-300 bg-black"
                    />
                  ) : (
                    <img
                      src={existing.mediaUrl}
                      alt="Evidência enviada"
                      className="max-h-48 rounded border border-slate-300 object-contain bg-white"
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Formulário de envio */}
          {canEdit && (
            <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-200">
              {error && (
                <div className="bg-red-50 border border-red-200 border-l-4 border-l-red-600 p-3 rounded text-xs text-red-800 flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {mission.participationMode === 'TEAM' && (
                <div className="bg-blue-50/60 border border-blue-200 rounded p-3.5 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0047B6]">
                    <Users size={15} />
                    <span>Identificação de Equipe / Dupla (Opcional se individual)</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="Nome da Equipe / Bancada"
                      className="border border-slate-300 bg-white rounded px-3 py-2 text-xs"
                    />
                    <input
                      type="text"
                      value={teamMembersText}
                      onChange={(e) => setTeamMembersText(e.target.value)}
                      placeholder="Integrantes da equipe"
                      className="border border-slate-300 bg-white rounded px-3 py-2 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Campos Específicos: CAÇA AOS RISCOS */}
              {mission.submissionType === 'RISK_HUNT' && (
                <div className="space-y-3 bg-[#F8FAFC] border border-slate-200 rounded p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#0047B6]">
                    Formulário Técnico – Caça aos Riscos
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Ambiente / Área Autorizada *
                      </label>
                      <input
                        type="text"
                        required
                        value={environment}
                        onChange={(e) => setEnvironment(e.target.value)}
                        placeholder="Ex: Escada Bloco A, Pátio, Oficina..."
                        className="w-full border border-slate-300 bg-white rounded px-3 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Classificação do Risco *
                      </label>
                      <select
                        value={hazardType}
                        onChange={(e) => setHazardType(e.target.value)}
                        className="w-full border border-slate-300 bg-white rounded px-3 py-2 text-xs"
                      >
                        <option>Mecânico / Acidente</option>
                        <option>Elétrico</option>
                        <option>Ergonômico</option>
                        <option>Físico (Ruído, Calor, Iluminação, Umidade)</option>
                        <option>Químico / Gases</option>
                        <option>Organização / Sinalização (5S)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Descrição do Perigo / Situação Identificada *
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={hazardDescription}
                      onChange={(e) => setHazardDescription(e.target.value)}
                      placeholder="Descreva objetivamente a condição insegura observada..."
                      className="w-full border border-slate-300 bg-white rounded px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Possíveis Consequências *
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={consequences}
                      onChange={(e) => setConsequences(e.target.value)}
                      placeholder="Quais lesões, danos ou acidentes essa condição pode causar?"
                      className="w-full border border-slate-300 bg-white rounded px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Medidas Preventivas Recomendadas *
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={preventiveMeasures}
                      onChange={(e) => setPreventiveMeasures(e.target.value)}
                      placeholder="Qual medida técnica ou organizacional elimina ou controla esse risco?"
                      className="w-full border border-slate-300 bg-white rounded px-3 py-2 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Campos Específicos: ENCONTRE OS 7 ERROS */}
              {mission.submissionType === 'SEVEN_ERRORS' && mission.config?.items && (
                <div className="space-y-2.5 bg-[#F8FAFC] border border-slate-200 rounded p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#0047B6]">
                      Checklist de Inspeção da Bancada (Marque os 7 Erros)
                    </h4>
                    <span className="text-xs font-mono-tech font-bold text-slate-700">
                      Selecionados: {selectedErrorIds.length}/7
                    </span>
                  </div>
                  <div className="space-y-2">
                    {mission.config.items.map((item) => {
                      const checked = selectedErrorIds.includes(item.id);
                      return (
                        <label
                          key={item.id}
                          className={`flex items-start gap-2.5 p-2.5 rounded border text-xs cursor-pointer transition-colors ${
                            checked
                              ? 'bg-amber-50 border-amber-400 text-slate-900 font-medium'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSevenErrorItem(item.id)}
                            className="mt-0.5 accent-[#0047B6]"
                          />
                          <span>{item.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Campos Específicos: MÚLTIPLA ESCOLHA EM MISSÃO */}
              {mission.submissionType === 'MULTIPLE_CHOICE' && mission.config?.options && (
                <div className="space-y-2.5 bg-[#F8FAFC] border border-slate-200 rounded p-4">
                  <h4 className="text-xs font-bold text-[#0F172A]">{mission.config.question}</h4>
                  <div className="space-y-2">
                    {mission.config.options.map((opt) => (
                      <label
                        key={opt.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded border text-xs cursor-pointer ${
                          selectedOptionId === opt.id
                            ? 'bg-blue-50 border-[#0047B6] font-medium text-[#0F172A]'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="missionOption"
                          checked={selectedOptionId === opt.id}
                          onChange={() => setSelectedOptionId(opt.id)}
                          className="mt-0.5 accent-[#0047B6]"
                        />
                        <span>{opt.text}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Resposta escrita geral (quando não for RISK_HUNT, pois RISK_HUNT já possui 4 campos escritos) */}
              {mission.submissionType !== 'RISK_HUNT' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Relato Técnico / Resposta Escrita {mission.requiresText ? '*' : '(Opcional)'}
                  </label>
                  <textarea
                    required={mission.requiresText}
                    rows={4}
                    value={textResponse}
                    onChange={(e) => setTextResponse(e.target.value)}
                    placeholder="Registre aqui sua análise técnica, medidas preventivas ou compromisso..."
                    className="w-full border border-slate-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-[#0047B6]"
                  />
                </div>
              )}

              {/* Upload de Evidência Fotográfica ou Vídeo direto pela Câmera */}
              {(mission.requiresPhoto ||
                mission.requiresVideo ||
                mission.submissionType === 'TEXT') && (
                <div className="bg-[#F8FAFC] border border-slate-200 rounded p-4 space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    {mission.requiresVideo
                      ? 'Evidência em Vídeo Curto (Obrigatório • MP4/WEBM/MOV até 60MB) *'
                      : mission.requiresPhoto
                      ? 'Evidência Fotográfica (Obrigatório • JPEG/PNG/WEBP até 10MB) *'
                      : 'Anexar Fotografia Ilustrativa (Opcional)'}
                  </label>

                  <input
                    ref={cameraRef}
                    type="file"
                    accept={
                      mission.requiresVideo
                        ? 'video/mp4,video/webm,video/quicktime'
                        : 'image/jpeg,image/png,image/webp'
                    }
                    capture="environment"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <input
                    ref={galleryRef}
                    type="file"
                    accept={
                      mission.requiresVideo
                        ? 'video/mp4,video/webm,video/quicktime'
                        : 'image/jpeg,image/png,image/webp'
                    }
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => cameraRef.current?.click()}
                      className="inline-flex items-center gap-1.5 bg-[#0047B6] hover:bg-[#003894] text-white text-xs font-semibold px-3.5 py-2.5 rounded cursor-pointer"
                    >
                      {mission.requiresVideo ? <FileVideo size={15} /> : <Camera size={15} />}
                      <span>
                        {mission.requiresVideo ? 'Gravar com a Câmera' : 'Fotografar com a Câmera'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => galleryRef.current?.click()}
                      className="inline-flex items-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3.5 py-2.5 rounded cursor-pointer"
                    >
                      <ImagePlus size={15} />
                      <span>Escolher Arquivo do Celular / PC</span>
                    </button>
                  </div>

                  {mediaPreview && (
                    <div className="pt-2">
                      {mediaFile?.type.startsWith('video/') ? (
                        <video
                          src={mediaPreview}
                          controls
                          className="max-h-52 rounded border border-slate-300 bg-black"
                        />
                      ) : (
                        <img
                          src={mediaPreview}
                          alt="Prévia da evidência"
                          className="max-h-48 rounded border border-slate-300 object-contain bg-white"
                        />
                      )}
                      <p className="text-[11px] text-slate-500 mt-1 font-mono-tech">
                        {mediaFile?.name} ({Math.round((mediaFile?.size || 0) / 1024)} KB)
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 bg-[#15803D] hover:bg-emerald-800 disabled:opacity-60 text-white font-bold px-5 py-2.5 rounded text-xs cursor-pointer"
                >
                  {submitting ? (
                    <span>Enviando evidência...</span>
                  ) : (
                    <>
                      <Send size={15} />
                      <span>
                        {existing?.status === 'NEEDS_CORRECTION'
                          ? 'Reenviar Evidência Corrigida'
                          : 'Confirmar e Enviar Participação'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {!canEdit && !existing && (
            <div className="bg-slate-100 border border-slate-300 rounded p-4 text-xs text-slate-600 flex items-center gap-2">
              <ClipboardCheck size={16} />
              <span>Esta atividade não está aberta para submissões neste momento.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
