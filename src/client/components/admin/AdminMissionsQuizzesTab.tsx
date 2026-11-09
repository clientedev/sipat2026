import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CalendarClock,
  CheckCircle2,
  Copy,
  Edit3,
  FlaskConical,
  GraduationCap,
  Plus,
  Shield,
  StopCircle,
  Trash2,
  Users,
} from 'lucide-react';
import { SIPAT_EVENT_DAYS } from '@shared/constants';
import { apiFetch } from '../../lib/api';

function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export const AdminMissionsQuizzesTab: React.FC = () => {
  const [subSection, setSubSection] = useState<'missions' | 'quizzes' | 'laboratories'>('missions');
  const [missions, setMissions] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [laboratories, setLaboratories] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Modal de Missão
  const [editingMission, setEditingMission] = useState<any | null>(null);
  const [showMissionModal, setShowMissionModal] = useState(false);

  // Modal de Laboratório
  const [editingLaboratory, setEditingLaboratory] = useState<any | null>(null);
  const [showLaboratoryModal, setShowLaboratoryModal] = useState(false);

  // Modal de Quiz & Questão
  const [editingQuiz, setEditingQuiz] = useState<any | null>(null);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [questionTargetQuiz, setQuestionTargetQuiz] = useState<any | null>(null);
  const [qPrompt, setQPrompt] = useState('');
  const [qTrack, setQTrack] = useState('GERAL');
  const [qType, setQType] = useState('MULTIPLE_CHOICE');
  const [qOptA, setQOptA] = useState('');
  const [qOptB, setQOptB] = useState('');
  const [qOptC, setQOptC] = useState('');
  const [qOptD, setQOptD] = useState('');
  const [qCorrect, setQCorrect] = useState('a');
  const [qExplanation, setQExplanation] = useState('');

  const loadAll = useCallback(async () => {
    try {
      const [mRes, qRes, lRes, cRes] = await Promise.all([
        apiFetch<{ missions: any[] }>('/api/admin/missions'),
        apiFetch<{ quizzes: any[] }>('/api/admin/quizzes'),
        apiFetch<{ laboratories: any[] }>('/api/admin/laboratories'),
        apiFetch<{ classes: any[] }>('/api/admin/classes'),
      ]);
      setMissions(mRes.missions);
      setQuizzes(qRes.quizzes);
      setLaboratories(lRes.laboratories || []);
      setClasses(cRes.classes || []);
    } catch {
      // fallback
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // ==========================================
  // MANIPULAÇÃO DE MISSÕES
  // ==========================================
  const openNewMission = () => {
    setEditingMission({
      title: '',
      summary: '',
      description: '',
      instructions: '',
      evaluationCriteria: 'Clareza técnica, aderência às normas de segurança e aplicabilidade preventiva.',
      safetyNotice: 'Realize registros apenas em áreas autorizadas e sob orientação docente.',
      bannerUrl: '',
      category: 'Segurança na Prática',
      difficulty: 'INTERMEDIATE',
      participationMode: 'INDIVIDUAL',
      submissionType: 'PHOTO',
      eventDay: 1,
      eventDateLabel: '16/11/2026',
      status: 'PUBLISHED',
      opensAt: '',
      closesAt: '2026-11-19T22:00',
      points: 50,
      requiresPhoto: true,
      requiresVideo: false,
      requiresText: true,
      requiresApproval: true,
      laboratoryId: '',
      targetClassGroupIds: [],
    });
    setShowMissionModal(true);
  };

  const openEditMission = (m: any) => {
    const targetIds = Array.isArray(m.targetClassGroups)
      ? m.targetClassGroups.map((t: any) => t.classGroupId || t.classGroup?.id)
      : [];

    setEditingMission({
      ...m,
      laboratoryId: m.laboratoryId || '',
      targetClassGroupIds: targetIds,
      opensAt: toDatetimeLocal(m.opensAt),
      closesAt: toDatetimeLocal(m.closesAt),
    });
    setShowMissionModal(true);
  };

  const handleSaveMission = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...editingMission,
      laboratoryId: editingMission.laboratoryId || null,
      targetClassGroupIds: Array.isArray(editingMission.targetClassGroupIds)
        ? editingMission.targetClassGroupIds
        : [],
      eventDateLabel:
        SIPAT_EVENT_DAYS.find((d) => d.day === Number(editingMission.eventDay))?.date ||
        '16/11/2026',
      opensAt: editingMission.opensAt ? new Date(editingMission.opensAt).toISOString() : null,
      closesAt: editingMission.closesAt ? new Date(editingMission.closesAt).toISOString() : null,
    };

    if (editingMission.id) {
      await apiFetch(`/api/admin/missions/${editingMission.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setStatusMsg('Missão técnica atualizada com sucesso!');
    } else {
      await apiFetch('/api/admin/missions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setStatusMsg('Nova missão técnica cadastrada e direcionada com sucesso!');
    }
    setShowMissionModal(false);
    await loadAll();
  };

  const handleDuplicateMission = async (id: string) => {
    await apiFetch(`/api/admin/missions/${id}/duplicate`, { method: 'POST' });
    setStatusMsg('Missão duplicada como rascunho!');
    await loadAll();
  };

  const handleQuickMissionStatus = async (id: string, status: string) => {
    await apiFetch(`/api/admin/missions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    setStatusMsg(`Status da missão alterado para ${status}!`);
    await loadAll();
  };

  // ==========================================
  // MANIPULAÇÃO DE LABORATÓRIOS E OFICINAS
  // ==========================================
  const openNewLaboratory = () => {
    setEditingLaboratory({
      code: '',
      name: '',
      description: '',
      blockLocation: 'Bloco Principal',
      courseArea: 'Geral',
      nrsApplicable: '',
      requiredEpis: '',
      capacity: 32,
      classGroupIds: [],
    });
    setShowLaboratoryModal(true);
  };

  const openEditLaboratory = (lab: any) => {
    const classGroupIds = Array.isArray(lab.classGroups)
      ? lab.classGroups.map((cg: any) => cg.classGroupId || cg.classGroup?.id)
      : [];

    setEditingLaboratory({
      id: lab.id,
      code: lab.code,
      name: lab.name,
      description: lab.description || '',
      blockLocation: lab.blockLocation,
      courseArea: lab.courseArea,
      nrsApplicable: lab.nrsApplicable || '',
      requiredEpis: lab.requiredEpis || '',
      capacity: lab.capacity || 32,
      classGroupIds,
    });
    setShowLaboratoryModal(true);
  };

  const handleSaveLaboratory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingLaboratory.id) {
        await apiFetch(`/api/admin/laboratories/${editingLaboratory.id}`, {
          method: 'PATCH',
          body: JSON.stringify(editingLaboratory),
        });
        setStatusMsg('Laboratório/oficina atualizado com sucesso!');
      } else {
        await apiFetch('/api/admin/laboratories', {
          method: 'POST',
          body: JSON.stringify(editingLaboratory),
        });
        setStatusMsg('Novo laboratório/oficina cadastrado com sucesso!');
      }
      setShowLaboratoryModal(false);
      await loadAll();
    } catch (err: any) {
      alert(err?.message || 'Falha ao salvar laboratório.');
    }
  };

  const handleDeleteLaboratory = async (id: string, name: string) => {
    if (!window.confirm(`Deseja realmente excluir o laboratório "${name}"?`)) return;
    try {
      await apiFetch(`/api/admin/laboratories/${id}`, { method: 'DELETE' });
      setStatusMsg('Laboratório removido com sucesso!');
      await loadAll();
    } catch (err: any) {
      alert(err?.message || 'Falha ao remover laboratório.');
    }
  };

  // ==========================================
  // MANIPULAÇÃO DE QUIZZES
  // ==========================================
  const openNewQuiz = () => {
    setEditingQuiz({
      title: '',
      description: '',
      category: 'Prevenção Geral',
      eventDay: 1,
      eventDateLabel: '16/11/2026',
      status: 'PUBLISHED',
      opensAt: '',
      closesAt: '2026-11-19T22:00',
      durationSeconds: 600,
      maxAttempts: 1,
      maxPoints: 50,
    });
    setShowQuizModal(true);
  };

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...editingQuiz,
      eventDateLabel:
        SIPAT_EVENT_DAYS.find((d) => d.day === Number(editingQuiz.eventDay))?.date || '16/11/2026',
      opensAt: editingQuiz.opensAt ? new Date(editingQuiz.opensAt).toISOString() : null,
      closesAt: editingQuiz.closesAt ? new Date(editingQuiz.closesAt).toISOString() : null,
    };

    if (editingQuiz.id) {
      await apiFetch(`/api/admin/quizzes/${editingQuiz.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setStatusMsg('Quiz atualizado com sucesso!');
    } else {
      await apiFetch('/api/admin/quizzes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setStatusMsg('Novo quiz cadastrado com sucesso!');
    }
    setShowQuizModal(false);
    await loadAll();
  };

  const handleAddQuestionToQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionTargetQuiz) return;

    const options =
      qType === 'TRUE_FALSE'
        ? [
            { id: 'true', text: 'Verdadeiro' },
            { id: 'false', text: 'Falso' },
          ]
        : [
            { id: 'a', text: qOptA },
            { id: 'b', text: qOptB },
            { id: 'c', text: qOptC },
            { id: 'd', text: qOptD },
          ].filter((o) => o.text.trim().length > 0);

    await apiFetch(`/api/admin/quizzes/${questionTargetQuiz.id}/questions`, {
      method: 'POST',
      body: JSON.stringify({
        questionType: qType,
        courseTrack: qTrack,
        prompt: qPrompt,
        options,
        correctOptionId: qType === 'TRUE_FALSE' ? (qCorrect === 'false' ? 'false' : 'true') : qCorrect,
        explanation: qExplanation,
        pointsWeight: 10,
      }),
    });

    setQPrompt('');
    setQOptA('');
    setQOptB('');
    setQOptC('');
    setQOptD('');
    setQExplanation('');
    setStatusMsg('Questão adicionada ao banco do quiz!');
    await loadAll();
    const updatedQ = (await apiFetch<{ quizzes: any[] }>('/api/admin/quizzes')).quizzes.find(
      (x) => x.id === questionTargetQuiz.id
    );
    setQuestionTargetQuiz(updatedQ || null);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    await apiFetch(`/api/admin/questions/${questionId}`, { method: 'DELETE' });
    await loadAll();
    if (questionTargetQuiz) {
      const updatedQ = (await apiFetch<{ quizzes: any[] }>('/api/admin/quizzes')).quizzes.find(
        (x) => x.id === questionTargetQuiz.id
      );
      setQuestionTargetQuiz(updatedQ || null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Barra de Módulos e Ações Principais */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-md p-4 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSubSection('missions')}
            className={`px-3.5 py-2 rounded text-xs font-bold uppercase transition-colors cursor-pointer ${
              subSection === 'missions'
                ? 'bg-[#E30613] text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Missões & Agendador ({missions.length})
          </button>
          <button
            type="button"
            onClick={() => setSubSection('laboratories')}
            className={`px-3.5 py-2 rounded text-xs font-bold uppercase transition-colors cursor-pointer flex items-center gap-1.5 ${
              subSection === 'laboratories'
                ? 'bg-[#E30613] text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <FlaskConical size={14} />
            <span>Laboratórios & Oficinas ({laboratories.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubSection('quizzes')}
            className={`px-3.5 py-2 rounded text-xs font-bold uppercase transition-colors cursor-pointer ${
              subSection === 'quizzes'
                ? 'bg-[#E30613] text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Quizzes & Questões ({quizzes.length})
          </button>
        </div>

        <div>
          {subSection === 'missions' && (
            <button
              type="button"
              onClick={openNewMission}
              className="inline-flex items-center gap-1.5 bg-[#15803D] hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded transition-colors cursor-pointer"
            >
              <Plus size={15} />
              <span>Nova Missão Técnica</span>
            </button>
          )}

          {subSection === 'laboratories' && (
            <button
              type="button"
              onClick={openNewLaboratory}
              className="inline-flex items-center gap-1.5 bg-[#0047B6] hover:bg-blue-800 text-white text-xs font-bold px-4 py-2 rounded transition-colors cursor-pointer"
            >
              <Plus size={15} />
              <span>Novo Laboratório / Oficina</span>
            </button>
          )}

          {subSection === 'quizzes' && (
            <button
              type="button"
              onClick={openNewQuiz}
              className="inline-flex items-center gap-1.5 bg-[#15803D] hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded transition-colors cursor-pointer"
            >
              <Plus size={15} />
              <span>Novo Quiz Técnico</span>
            </button>
          )}
        </div>
      </div>

      {statusMsg && (
        <div className="bg-emerald-50 border border-emerald-200 border-l-4 border-l-emerald-600 p-3 rounded text-xs text-emerald-900 flex items-center justify-between">
          <span>{statusMsg}</span>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            className="font-bold cursor-pointer"
          >
            OK
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUB-ABA 1: MISSÕES & AGENDADOR                                */}
      {/* ------------------------------------------------------------- */}
      {subSection === 'missions' && (
        <div className="bg-white border border-slate-200 rounded-md overflow-x-auto shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1E293B] text-white uppercase font-mono-tech text-[11px]">
              <tr>
                <th className="py-3 px-4">Dia</th>
                <th className="py-3 px-4">Missão & Categoria</th>
                <th className="py-3 px-4">Laboratório & Bloco</th>
                <th className="py-3 px-4">Turmas Alvo</th>
                <th className="py-3 px-4">Pontos</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Envios</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {missions.map((m) => {
                const targets = m.targetClassGroups || [];
                const isGeneral = targets.length === 0;

                return (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono-tech font-bold text-[#E30613]">
                      Dia {m.eventDay}
                      <div className="text-[10px] text-slate-400 font-normal">{m.eventDateLabel}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{m.title}</div>
                      <div className="text-slate-500 text-[11px] flex items-center gap-1.5 mt-0.5">
                        <span>{m.category}</span>
                        <span>•</span>
                        <span className="font-mono-tech uppercase">{m.submissionType}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {m.laboratory ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono-tech font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <FlaskConical size={11} />
                            <span>{m.laboratory.code}</span>
                          </span>
                          <div className="text-slate-700 font-medium text-[11px] truncate max-w-[150px] mt-0.5">
                            {m.laboratory.name}
                          </div>
                          <div className="text-[10px] text-slate-400">{m.laboratory.blockLocation}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Espaço Comum / Geral</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {isGeneral ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <Users size={11} />
                          <span>Todas as Turmas</span>
                        </span>
                      ) : (
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap gap-1">
                            {targets.slice(0, 2).map((t: any) => (
                              <span
                                key={t.id}
                                className="px-1.5 py-0.5 rounded text-[10px] font-mono-tech font-bold bg-purple-50 text-purple-700 border border-purple-200"
                              >
                                {t.classGroup?.code || 'Turma'}
                              </span>
                            ))}
                            {targets.length > 2 && (
                              <span className="text-[10px] text-purple-600 font-bold self-center">
                                +{targets.length - 2}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {targets.length} turma(s) específica(s)
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono-tech font-bold text-slate-800">{m.points} pts</td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block font-mono-tech font-bold text-[10px] px-2 py-0.5 rounded ${
                          m.status === 'PUBLISHED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : m.status === 'SCHEDULED'
                            ? 'bg-amber-100 text-amber-900'
                            : m.status === 'CLOSED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {m.status}
                      </span>
                      {m.opensAt && (
                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <CalendarClock size={11} />
                          <span>Abre: {new Date(m.opensAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono-tech text-center">{m._count?.submissions ?? 0}</td>

                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEditMission(m)}
                        className="p-1.5 border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
                        title="Editar / Agendar / Direcionar"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDuplicateMission(m.id)}
                        className="p-1.5 border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
                        title="Duplicar Missão"
                      >
                        <Copy size={13} />
                      </button>
                      {m.status !== 'PUBLISHED' && (
                        <button
                          type="button"
                          onClick={() => void handleQuickMissionStatus(m.id, 'PUBLISHED')}
                          className="p-1.5 border border-emerald-300 text-emerald-700 rounded hover:bg-emerald-50 cursor-pointer"
                          title="Publicar Imediatamente"
                        >
                          <CheckCircle2 size={13} />
                        </button>
                      )}
                      {m.status === 'PUBLISHED' && (
                        <button
                          type="button"
                          onClick={() => void handleQuickMissionStatus(m.id, 'CLOSED')}
                          className="p-1.5 border border-red-300 text-red-700 rounded hover:bg-red-50 cursor-pointer"
                          title="Encerrar Atividade"
                        >
                          <StopCircle size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUB-ABA 2: LABORATÓRIOS & OFICINAS DIDÁTICAS                  */}
      {/* ------------------------------------------------------------- */}
      {subSection === 'laboratories' && (
        <div className="space-y-4">
          <div className="bg-blue-50/70 border border-blue-200 rounded-md p-4 text-xs text-blue-900 flex items-start gap-3">
            <Building2 size={20} className="text-[#0047B6] shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-[#0047B6]">
                Oficinas Didáticas e Laboratórios — Escola SENAI "Morvan Figueiredo"
              </h4>
              <p className="mt-1 text-slate-700 leading-relaxed">
                Cadastre as oficinas técnicas da unidade (ex: Climatização, Redes/TI, Eletroeletrônica, Logística, Mecânica Automotiva).
                Você pode vincular quais turmas utilizam cada laboratório e direcionar missões com requisitos de segurança específicos de cada ambiente (NRs e EPIs).
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {laboratories.map((lab) => {
              const labClasses = lab.classGroups || [];

              return (
                <div
                  key={lab.id}
                  className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono-tech font-bold text-xs bg-red-50 text-[#E30613] px-2 py-0.5 rounded border border-red-200">
                        {lab.code}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Capacidade: <strong>{lab.capacity}</strong> alunos
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900">{lab.name}</h4>
                    <div className="text-[11px] text-slate-600 mt-0.5 flex items-center gap-1">
                      <Building2 size={12} className="text-slate-400" />
                      <span>{lab.blockLocation} • {lab.courseArea}</span>
                    </div>

                    {lab.description && (
                      <p className="text-[11px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                        {lab.description}
                      </p>
                    )}

                    {/* NRs e EPIs */}
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-[11px]">
                      {lab.nrsApplicable && (
                        <div>
                          <strong className="text-slate-700">Normas (NRs):</strong>{' '}
                          <span className="text-slate-600">{lab.nrsApplicable}</span>
                        </div>
                      )}
                      {lab.requiredEpis && (
                        <div>
                          <strong className="text-slate-700">EPIs Obrigatórios:</strong>{' '}
                          <span className="text-slate-600">{lab.requiredEpis}</span>
                        </div>
                      )}
                    </div>

                    {/* Turmas Vinculadas */}
                    <div className="mt-3 pt-2 border-t border-slate-100">
                      <div className="text-[10px] font-mono-tech uppercase text-slate-400 mb-1">
                        Turmas que utilizam este espaço ({labClasses.length}):
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {labClasses.length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">Nenhuma turma vinculada</span>
                        ) : (
                          labClasses.map((cg: any) => (
                            <span
                              key={cg.id}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono-tech font-bold bg-slate-100 text-slate-700 border border-slate-200"
                              title={cg.classGroup?.name}
                            >
                              {cg.classGroup?.code}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Barra de Ações do Laboratório */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[11px]">
                      <strong>{lab._count?.missions ?? 0}</strong> missões vinculadas
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditLaboratory(lab)}
                        className="px-2.5 py-1 text-xs font-semibold border border-slate-300 rounded hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteLaboratory(lab.id, lab.name)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                        title="Excluir Laboratório"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUB-ABA 3: QUIZZES & BANCO DE QUESTÕES                        */}
      {/* ------------------------------------------------------------- */}
      {subSection === 'quizzes' && (
        <div className="grid lg:grid-cols-12 gap-5">
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-md divide-y divide-slate-200 shadow-2xs">
            {quizzes.map((q) => (
              <div key={q.id} className="p-4 flex items-start justify-between gap-3 text-xs">
                <div>
                  <span className="font-mono-tech text-[#E30613] font-bold">
                    DIA {q.eventDay} • {q.status} • {q.maxPoints} PTS
                  </span>
                  <h4 className="font-bold text-sm text-slate-900 mt-0.5">{q.title}</h4>
                  <p className="text-slate-500 mt-0.5">
                    {q.questions?.length ?? 0} questões • {q._count?.attempts ?? 0} participações
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingQuiz({
                        ...q,
                        opensAt: toDatetimeLocal(q.opensAt),
                        closesAt: toDatetimeLocal(q.closesAt),
                      });
                      setShowQuizModal(true);
                    }}
                    className="px-2.5 py-1.5 border border-slate-300 rounded font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Configurar
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionTargetQuiz(q)}
                    className="px-2.5 py-1.5 bg-[#E30613] text-white rounded font-semibold cursor-pointer"
                  >
                    Questões ({q.questions?.length ?? 0})
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Editor de Questões do Quiz selecionado */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-md p-5 text-xs space-y-4 shadow-2xs">
            {!questionTargetQuiz ? (
              <p className="text-slate-500 py-12 text-center">
                Clique em <strong>Questões</strong> em um quiz ao lado para consultar, incluir ou
                remover perguntas técnicas.
              </p>
            ) : (
              <>
                <div className="pb-2 border-b border-slate-200">
                  <span className="font-mono-tech text-[#E30613] font-bold uppercase">
                    BANCO DE QUESTÕES DO QUIZ
                  </span>
                  <h3 className="font-bold text-sm text-slate-900">{questionTargetQuiz.title}</h3>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-2">
                  {(questionTargetQuiz.questions || []).map((quest: any, idx: number) => (
                    <div
                      key={quest.id}
                      className="p-2.5 rounded border border-slate-200 bg-slate-50 flex items-start justify-between gap-2"
                    >
                      <div>
                        <div className="font-bold">
                          #{idx + 1} [{quest.courseTrack}] {quest.prompt}
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          Correta: <strong>{quest.correctOptionId}</strong> • {quest.explanation}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(quest.id)}
                        className="text-red-600 hover:text-red-800 p-1 cursor-pointer"
                        title="Remover Questão"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={handleAddQuestionToQuiz}
                  className="pt-2 border-t border-slate-200 space-y-3"
                >
                  <div className="font-bold text-slate-900">Adicionar Nova Questão</div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={qTrack}
                      onChange={(e) => setQTrack(e.target.value)}
                      className="border border-slate-300 rounded px-2.5 py-1.5"
                    >
                      <option value="GERAL">Trilha Geral SIPAT</option>
                      <option value="INFORMATICA">Informática / TI (NR-17)</option>
                      <option value="REFRIGERACAO">Refrigeração / Climatização (NR-10, NR-12)</option>
                      <option value="LOGISTICA">Logística / Armazenagem (NR-11)</option>
                      <option value="ELETRICA">Eletroeletrônica (NR-10)</option>
                      <option value="AUTOMOTIVA">Mecânica / Automotiva (NR-12)</option>
                    </select>

                    <select
                      value={qType}
                      onChange={(e) => setQType(e.target.value)}
                      className="border border-slate-300 rounded px-2.5 py-1.5"
                    >
                      <option value="MULTIPLE_CHOICE">Múltipla Escolha (4 Alternativas)</option>
                      <option value="TRUE_FALSE">Verdadeiro ou Falso</option>
                    </select>
                  </div>
                  <textarea
                    required
                    rows={2}
                    value={qPrompt}
                    onChange={(e) => setQPrompt(e.target.value)}
                    placeholder="Enunciado educativo da questão..."
                    className="w-full border border-slate-300 rounded px-3 py-2"
                  />

                  {qType === 'TRUE_FALSE' ? (
                    <div>
                      <label className="block font-semibold mb-1">Gabarito Correto:</label>
                      <select
                        value={qCorrect}
                        onChange={(e) => setQCorrect(e.target.value)}
                        className="border border-slate-300 rounded px-3 py-1.5"
                      >
                        <option value="true">Verdadeiro</option>
                        <option value="false">Falso</option>
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        required
                        value={qOptA}
                        onChange={(e) => setQOptA(e.target.value)}
                        placeholder="Alternativa A"
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                      />
                      <input
                        required
                        value={qOptB}
                        onChange={(e) => setQOptB(e.target.value)}
                        placeholder="Alternativa B"
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                      />
                      <input
                        value={qOptC}
                        onChange={(e) => setQOptC(e.target.value)}
                        placeholder="Alternativa C"
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                      />
                      <input
                        value={qOptD}
                        onChange={(e) => setQOptD(e.target.value)}
                        placeholder="Alternativa D"
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                      />
                      <div>
                        <label className="font-semibold mr-2">Alternativa Correta:</label>
                        <select
                          value={qCorrect}
                          onChange={(e) => setQCorrect(e.target.value)}
                          className="border border-slate-300 rounded px-2.5 py-1"
                        >
                          <option value="a">A</option>
                          <option value="b">B</option>
                          <option value="c">C</option>
                          <option value="d">D</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <textarea
                    required
                    rows={2}
                    value={qExplanation}
                    onChange={(e) => setQExplanation(e.target.value)}
                    placeholder="Explicação técnica educativa exibida após a resposta..."
                    className="w-full border border-slate-300 rounded px-3 py-2"
                  />

                  <button
                    type="submit"
                    className="bg-[#E30613] text-white font-bold px-4 py-2 rounded cursor-pointer"
                  >
                    Salvar Questão no Quiz
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: CRIAR / EDITAR MISSÃO COM LABORATÓRIO E TURMAS ALVO    */}
      {/* ============================================================= */}
      {showMissionModal && editingMission && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveMission}
            className="bg-white border border-slate-300 rounded-lg max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-4 text-xs shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <span>{editingMission.id ? 'Editar Missão & Agendamento' : 'Criar Nova Missão Técnica'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowMissionModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ×
              </button>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-bold mb-1">Título da Missão *</label>
                <input
                  required
                  value={editingMission.title}
                  onChange={(e) => setEditingMission({ ...editingMission, title: e.target.value })}
                  placeholder="Ex: Inspeção de EPIs e Travas na Oficina de Climatização"
                  className="w-full border border-slate-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Pontuação *</label>
                <input
                  type="number"
                  required
                  min={5}
                  max={500}
                  value={editingMission.points}
                  onChange={(e) =>
                    setEditingMission({ ...editingMission, points: Number(e.target.value) })
                  }
                  className="w-full border border-slate-300 rounded px-3 py-2 font-mono-tech font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1">Resumo Curto *</label>
              <input
                required
                value={editingMission.summary}
                onChange={(e) => setEditingMission({ ...editingMission, summary: e.target.value })}
                placeholder="Breve descrição em uma frase para os cards e feed da SIPAT"
                className="w-full border border-slate-300 rounded px-3 py-2"
              />
            </div>

            {/* SEÇÃO TÉCNICA: VINCULAÇÃO DE LABORATÓRIO E TURMAS ESPECÍFICAS */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs uppercase tracking-wide text-[#0047B6]">
                <FlaskConical size={15} />
                <span>Ambiente Didático & Direcionamento de Turmas</span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {/* Seletor de Laboratório */}
                <div>
                  <label className="block font-bold mb-1 text-slate-700">
                    Laboratório / Oficina Didática (SENAI Mooca):
                  </label>
                  <select
                    value={editingMission.laboratoryId || ''}
                    onChange={(e) => {
                      const labId = e.target.value;
                      const selectedLab = laboratories.find((l) => l.id === labId);
                      setEditingMission({
                        ...editingMission,
                        laboratoryId: labId,
                        // Sugere categoria ou critérios caso selecione um laboratório
                        ...(selectedLab && !editingMission.id
                          ? { category: selectedLab.courseArea }
                          : {}),
                      });
                    }}
                    className="w-full border border-slate-300 bg-white rounded px-3 py-2 text-xs"
                  >
                    <option value="">Nenhum / Espaço Comum da Escola (Geral)</option>
                    {laboratories.map((lab) => (
                      <option key={lab.id} value={lab.id}>
                        [{lab.code}] {lab.name} ({lab.blockLocation})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Ao selecionar um laboratório, o aluno visualiza as NRs e os EPIs necessários no card.
                  </p>
                </div>

                {/* Opções de Turmas Alvo */}
                <div>
                  <label className="block font-bold mb-1 text-slate-700">
                    Público-Alvo / Direcionamento:
                  </label>
                  <div className="space-y-1.5 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                      <input
                        type="radio"
                        name="targetMode"
                        checked={(editingMission.targetClassGroupIds || []).length === 0}
                        onChange={() =>
                          setEditingMission({ ...editingMission, targetClassGroupIds: [] })
                        }
                        className="text-[#E30613] focus:ring-[#E30613]"
                      />
                      <span>Aberta a Todas as Turmas (Geral da Escola)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                      <input
                        type="radio"
                        name="targetMode"
                        checked={(editingMission.targetClassGroupIds || []).length > 0}
                        onChange={() => {
                          // Se vazio, preenche com as turmas do laboratório selecionado ou primeira turma
                          if ((editingMission.targetClassGroupIds || []).length === 0) {
                            const lab = laboratories.find((l) => l.id === editingMission.laboratoryId);
                            const defaultIds = lab?.classGroups?.map((cg: any) => cg.classGroupId) || [];
                            setEditingMission({
                              ...editingMission,
                              targetClassGroupIds: defaultIds.length > 0 ? defaultIds : [classes[0]?.id].filter(Boolean),
                            });
                          }
                        }}
                        className="text-[#E30613] focus:ring-[#E30613]"
                      />
                      <span>Turmas Específicas / Por Área Tecnológica</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Checklist de Turmas Específicas */}
              {(editingMission.targetClassGroupIds || []).length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-700 text-[11px]">
                      Selecione as turmas que terão acesso a esta missão:
                    </span>
                    {editingMission.laboratoryId && (
                      <button
                        type="button"
                        onClick={() => {
                          const lab = laboratories.find((l) => l.id === editingMission.laboratoryId);
                          const labIds = lab?.classGroups?.map((cg: any) => cg.classGroupId) || [];
                          setEditingMission({
                            ...editingMission,
                            targetClassGroupIds: labIds,
                          });
                        }}
                        className="text-[11px] font-bold text-[#0047B6] hover:underline cursor-pointer"
                      >
                        + Vincular turmas deste laboratório
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-2 bg-white rounded border border-slate-200">
                    {classes.map((cls) => {
                      const isChecked = (editingMission.targetClassGroupIds || []).includes(cls.id);

                      return (
                        <label
                          key={cls.id}
                          className={`flex items-center gap-2 p-1.5 rounded border text-[11px] cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-red-50/50 border-[#E30613] text-slate-900 font-semibold'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const current = new Set(editingMission.targetClassGroupIds || []);
                              if (e.target.checked) {
                                current.add(cls.id);
                              } else {
                                current.delete(cls.id);
                              }
                              setEditingMission({
                                ...editingMission,
                                targetClassGroupIds: Array.from(current),
                              });
                            }}
                            className="w-3.5 h-3.5 rounded text-[#E30613] focus:ring-[#E30613]"
                          />
                          <span className="truncate">
                            <strong className="font-mono-tech">[{cls.code}]</strong> {cls.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="grid sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold mb-1">Dia do Evento</label>
                <select
                  value={editingMission.eventDay}
                  onChange={(e) =>
                    setEditingMission({ ...editingMission, eventDay: Number(e.target.value) })
                  }
                  className="w-full border border-slate-300 rounded px-2.5 py-2"
                >
                  <option value={1}>Dia 1 (16/11)</option>
                  <option value={2}>Dia 2 (17/11)</option>
                  <option value={3}>Dia 3 (18/11)</option>
                  <option value={4}>Dia 4 (19/11)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Categoria</label>
                <input
                  required
                  value={editingMission.category}
                  onChange={(e) =>
                    setEditingMission({ ...editingMission, category: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded px-2.5 py-2"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Participação</label>
                <select
                  value={editingMission.participationMode}
                  onChange={(e) =>
                    setEditingMission({ ...editingMission, participationMode: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded px-2.5 py-2"
                >
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="TEAM">Equipe / Turma</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Tipo de Resposta</label>
                <select
                  value={editingMission.submissionType}
                  onChange={(e) =>
                    setEditingMission({ ...editingMission, submissionType: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded px-2.5 py-2"
                >
                  <option value="PHOTO">Fotografia + Relato</option>
                  <option value="VIDEO">Vídeo Curto (60s)</option>
                  <option value="TEXT">Resposta Escrita</option>
                  <option value="RISK_HUNT">Caça aos Riscos</option>
                  <option value="SEVEN_ERRORS">7 Erros</option>
                  <option value="MULTIPLE_CHOICE">Múltipla Escolha</option>
                </select>
              </div>
            </div>

            {/* Agendamento Automático */}
            <div className="bg-amber-50 border border-amber-200 rounded p-3.5 grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-amber-950 mb-1">
                  Status / Agendador *
                </label>
                <select
                  value={editingMission.status}
                  onChange={(e) => setEditingMission({ ...editingMission, status: e.target.value })}
                  className="w-full border border-slate-300 bg-white rounded px-2.5 py-2 font-bold"
                >
                  <option value="DRAFT">Rascunho (Oculto)</option>
                  <option value="SCHEDULED">Agendado (Liberação Automática)</option>
                  <option value="PUBLISHED">Publicado (Aberto Agora)</option>
                  <option value="CLOSED">Encerrado</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-amber-950 mb-1">
                  Abertura Automática
                </label>
                <input
                  type="datetime-local"
                  value={editingMission.opensAt || ''}
                  onChange={(e) =>
                    setEditingMission({ ...editingMission, opensAt: e.target.value })
                  }
                  className="w-full border border-slate-300 bg-white rounded px-2.5 py-2"
                />
              </div>
              <div>
                <label className="block font-bold text-amber-950 mb-1">
                  Encerramento Automático
                </label>
                <input
                  type="datetime-local"
                  value={editingMission.closesAt || ''}
                  onChange={(e) =>
                    setEditingMission({ ...editingMission, closesAt: e.target.value })
                  }
                  className="w-full border border-slate-300 bg-white rounded px-2.5 py-2"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingMission.requiresPhoto}
                  onChange={(e) =>
                    setEditingMission({ ...editingMission, requiresPhoto: e.target.checked })
                  }
                />
                <span>Exigir Foto de Evidência</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingMission.requiresVideo}
                  onChange={(e) =>
                    setEditingMission({ ...editingMission, requiresVideo: e.target.checked })
                  }
                />
                <span>Exigir Vídeo</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingMission.requiresApproval}
                  onChange={(e) =>
                    setEditingMission({ ...editingMission, requiresApproval: e.target.checked })
                  }
                />
                <span>Exigir Aprovação da Comissão Avaliadora</span>
              </label>
            </div>

            <div>
              <label className="block font-bold mb-1">Descrição Completa *</label>
              <textarea
                required
                rows={2}
                value={editingMission.description}
                onChange={(e) =>
                  setEditingMission({ ...editingMission, description: e.target.value })
                }
                className="w-full border border-slate-300 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block font-bold mb-1">Instruções para o Aluno *</label>
              <textarea
                required
                rows={3}
                value={editingMission.instructions}
                onChange={(e) =>
                  setEditingMission({ ...editingMission, instructions: e.target.value })
                }
                className="w-full border border-slate-300 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block font-bold mb-1">Critérios de Avaliação *</label>
              <input
                required
                value={editingMission.evaluationCriteria}
                onChange={(e) =>
                  setEditingMission({ ...editingMission, evaluationCriteria: e.target.value })
                }
                className="w-full border border-slate-300 rounded px-3 py-2"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowMissionModal(false)}
                className="px-4 py-2 border border-slate-300 rounded font-semibold cursor-pointer hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#E30613] hover:bg-[#C2040F] text-white font-bold rounded cursor-pointer transition-colors shadow-xs"
              >
                Salvar Missão
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: CRIAR / EDITAR LABORATÓRIO / OFICINA DIDÁTICA          */}
      {/* ============================================================= */}
      {showLaboratoryModal && editingLaboratory && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveLaboratory}
            className="bg-white border border-slate-300 rounded-lg max-w-xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-4 text-xs shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <FlaskConical size={18} className="text-[#0047B6]" />
                <span>
                  {editingLaboratory.id
                    ? 'Editar Laboratório / Oficina Didática'
                    : 'Novo Laboratório / Oficina Didática'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowLaboratoryModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ×
              </button>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold mb-1">Código do Lab *</label>
                <input
                  required
                  value={editingLaboratory.code}
                  onChange={(e) =>
                    setEditingLaboratory({ ...editingLaboratory, code: e.target.value.toUpperCase() })
                  }
                  placeholder="Ex: LAB-CLI-01"
                  className="w-full border border-slate-300 rounded px-3 py-2 font-mono-tech font-bold"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold mb-1">Nome do Laboratório / Oficina *</label>
                <input
                  required
                  value={editingLaboratory.name}
                  onChange={(e) =>
                    setEditingLaboratory({ ...editingLaboratory, name: e.target.value })
                  }
                  placeholder="Ex: Oficina de Climatização e Refrigeração (HVAC)"
                  className="w-full border border-slate-300 rounded px-3 py-2"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold mb-1">Bloco / Local *</label>
                <input
                  required
                  value={editingLaboratory.blockLocation}
                  onChange={(e) =>
                    setEditingLaboratory({ ...editingLaboratory, blockLocation: e.target.value })
                  }
                  placeholder="Ex: Bloco C, Térreo"
                  className="w-full border border-slate-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Área Tecnológica *</label>
                <input
                  required
                  value={editingLaboratory.courseArea}
                  onChange={(e) =>
                    setEditingLaboratory({ ...editingLaboratory, courseArea: e.target.value })
                  }
                  placeholder="Ex: Refrigeração e Climatização"
                  className="w-full border border-slate-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Capacidade de Alunos</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={editingLaboratory.capacity}
                  onChange={(e) =>
                    setEditingLaboratory({ ...editingLaboratory, capacity: Number(e.target.value) })
                  }
                  className="w-full border border-slate-300 rounded px-3 py-2 font-mono-tech"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1">Descrição do Ambiente</label>
              <textarea
                rows={2}
                value={editingLaboratory.description}
                onChange={(e) =>
                  setEditingLaboratory({ ...editingLaboratory, description: e.target.value })
                }
                placeholder="Finalidade pedagógica, maquinários instalados e características do local..."
                className="w-full border border-slate-300 rounded px-3 py-2"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Normas Regulamentadoras (NRs):</label>
                <input
                  value={editingLaboratory.nrsApplicable}
                  onChange={(e) =>
                    setEditingLaboratory({ ...editingLaboratory, nrsApplicable: e.target.value })
                  }
                  placeholder="Ex: NR-10, NR-12, NR-13, NR-35"
                  className="w-full border border-slate-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">EPIs Obrigatórios do Ambiente:</label>
                <input
                  value={editingLaboratory.requiredEpis}
                  onChange={(e) =>
                    setEditingLaboratory({ ...editingLaboratory, requiredEpis: e.target.value })
                  }
                  placeholder="Ex: Óculos de proteção, calçado de segurança, luvas"
                  className="w-full border border-slate-300 rounded px-3 py-2"
                />
              </div>
            </div>

            {/* Vínculo de Turmas que Utilizam este Laboratório */}
            <div>
              <label className="block font-bold mb-1 text-slate-700">
                Turmas que utilizam este espaço de práticas:
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded border border-slate-200">
                {classes.map((cls) => {
                  const isChecked = (editingLaboratory.classGroupIds || []).includes(cls.id);

                  return (
                    <label
                      key={cls.id}
                      className={`flex items-center gap-2 p-1.5 rounded border text-[11px] cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-blue-50/60 border-blue-400 font-semibold text-blue-900'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const current = new Set(editingLaboratory.classGroupIds || []);
                          if (e.target.checked) {
                            current.add(cls.id);
                          } else {
                            current.delete(cls.id);
                          }
                          setEditingLaboratory({
                            ...editingLaboratory,
                            classGroupIds: Array.from(current),
                          });
                        }}
                        className="w-3.5 h-3.5 rounded text-[#0047B6] focus:ring-[#0047B6]"
                      />
                      <span className="truncate">
                        <strong className="font-mono-tech">[{cls.code}]</strong> {cls.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowLaboratoryModal(false)}
                className="px-4 py-2 border border-slate-300 rounded font-semibold cursor-pointer hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#0047B6] hover:bg-blue-800 text-white font-bold rounded cursor-pointer transition-colors shadow-xs"
              >
                Salvar Laboratório
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: CRIAR / EDITAR QUIZ                                    */}
      {/* ============================================================= */}
      {showQuizModal && editingQuiz && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveQuiz}
            className="bg-white border border-slate-300 rounded-md max-w-lg w-full p-6 space-y-4 text-xs shadow-xl"
          >
            <h3 className="text-base font-bold text-[#0F172A] border-b border-slate-200 pb-2">
              {editingQuiz.id ? 'Configurar Quiz' : 'Criar Novo Quiz Técnico'}
            </h3>
            <div>
              <label className="block font-bold mb-1">Título *</label>
              <input
                required
                value={editingQuiz.title}
                onChange={(e) => setEditingQuiz({ ...editingQuiz, title: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">Descrição *</label>
              <textarea
                required
                rows={2}
                value={editingQuiz.description}
                onChange={(e) => setEditingQuiz({ ...editingQuiz, description: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-bold mb-1">Dia SIPAT</label>
                <select
                  value={editingQuiz.eventDay}
                  onChange={(e) =>
                    setEditingQuiz({ ...editingQuiz, eventDay: Number(e.target.value) })
                  }
                  className="w-full border border-slate-300 rounded px-2 py-2"
                >
                  <option value={1}>Dia 1 (16/11)</option>
                  <option value={2}>Dia 2 (17/11)</option>
                  <option value={3}>Dia 3 (18/11)</option>
                  <option value={4}>Dia 4 (19/11)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Pontos Máx.</label>
                <input
                  type="number"
                  value={editingQuiz.maxPoints}
                  onChange={(e) =>
                    setEditingQuiz({ ...editingQuiz, maxPoints: Number(e.target.value) })
                  }
                  className="w-full border border-slate-300 rounded px-2 py-2"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Tentativas</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={editingQuiz.maxAttempts}
                  onChange={(e) =>
                    setEditingQuiz({ ...editingQuiz, maxAttempts: Number(e.target.value) })
                  }
                  className="w-full border border-slate-300 rounded px-2 py-2"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Status</label>
                <select
                  value={editingQuiz.status}
                  onChange={(e) => setEditingQuiz({ ...editingQuiz, status: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2 py-2 font-bold"
                >
                  <option value="DRAFT">Rascunho</option>
                  <option value="SCHEDULED">Agendado</option>
                  <option value="PUBLISHED">Publicado</option>
                  <option value="CLOSED">Encerrado</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">Abertura Automática</label>
                <input
                  type="datetime-local"
                  value={editingQuiz.opensAt || ''}
                  onChange={(e) => setEditingQuiz({ ...editingQuiz, opensAt: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2 py-2"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowQuizModal(false)}
                className="px-4 py-2 border border-slate-300 rounded font-semibold cursor-pointer hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#E30613] hover:bg-[#C2040F] text-white font-bold rounded cursor-pointer transition-colors shadow-xs"
              >
                Salvar Quiz
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
