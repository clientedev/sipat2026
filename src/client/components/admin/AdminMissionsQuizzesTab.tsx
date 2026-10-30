import React, { useCallback, useEffect, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Copy,
  Edit3,
  Plus,
  StopCircle,
  Trash2,
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
  const [subSection, setSubSection] = useState<'missions' | 'quizzes'>('missions');
  const [missions, setMissions] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Modal de Missão
  const [editingMission, setEditingMission] = useState<any | null>(null);
  const [showMissionModal, setShowMissionModal] = useState(false);

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
    const [mRes, qRes] = await Promise.all([
      apiFetch<{ missions: any[] }>('/api/admin/missions'),
      apiFetch<{ quizzes: any[] }>('/api/admin/quizzes'),
    ]);
    setMissions(mRes.missions);
    setQuizzes(qRes.quizzes);
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

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
    });
    setShowMissionModal(true);
  };

  const openEditMission = (m: any) => {
    setEditingMission({
      ...m,
      opensAt: toDatetimeLocal(m.opensAt),
      closesAt: toDatetimeLocal(m.closesAt),
    });
    setShowMissionModal(true);
  };

  const handleSaveMission = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...editingMission,
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
      setStatusMsg('Missão atualizada com sucesso!');
    } else {
      await apiFetch('/api/admin/missions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setStatusMsg('Nova missão cadastrada com sucesso!');
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
      maxPoints: 50,
      maxAttempts: 2,
    });
    setShowQuizModal(true);
  };

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...editingQuiz,
      eventDateLabel:
        SIPAT_EVENT_DAYS.find((d) => d.day === Number(editingQuiz.eventDay))?.date ||
        '16/11/2026',
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
      setStatusMsg('Quiz criado! Adicione questões abaixo.');
    }
    setShowQuizModal(false);
    await loadAll();
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
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
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-md p-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubSection('missions')}
            className={`px-4 py-2 rounded text-xs font-bold uppercase cursor-pointer ${
              subSection === 'missions'
                ? 'bg-[#0047B6] text-white'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            Gerenciar Missões & Agendador ({missions.length})
          </button>
          <button
            type="button"
            onClick={() => setSubSection('quizzes')}
            className={`px-4 py-2 rounded text-xs font-bold uppercase cursor-pointer ${
              subSection === 'quizzes'
                ? 'bg-[#0047B6] text-white'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            Quizzes & Banco de Questões ({quizzes.length})
          </button>
        </div>

        {subSection === 'missions' ? (
          <button
            type="button"
            onClick={openNewMission}
            className="inline-flex items-center gap-1.5 bg-[#15803D] hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded cursor-pointer"
          >
            <Plus size={15} />
            <span>Nova Missão / Programar Desafio</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={openNewQuiz}
            className="inline-flex items-center gap-1.5 bg-[#15803D] hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded cursor-pointer"
          >
            <Plus size={15} />
            <span>Novo Quiz Técnico</span>
          </button>
        )}
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

      {subSection === 'missions' ? (
        <div className="bg-white border border-slate-200 rounded-md overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 uppercase font-mono-tech text-slate-500">
              <tr>
                <th className="py-3 px-4">Dia</th>
                <th className="py-3 px-4">Missão</th>
                <th className="py-3 px-4">Tipo / Modo</th>
                <th className="py-3 px-4">Pontos</th>
                <th className="py-3 px-4">Status / Agendamento</th>
                <th className="py-3 px-4">Envios</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {missions.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono-tech font-bold text-[#0047B6]">
                    Dia {m.eventDay}
                    <div className="text-[10px] text-slate-400">{m.eventDateLabel}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{m.title}</div>
                    <div className="text-slate-500">{m.category}</div>
                  </td>
                  <td className="py-3 px-4 font-mono-tech text-slate-600">
                    {m.submissionType} • {m.participationMode}
                  </td>
                  <td className="py-3 px-4 font-mono-tech font-bold">{m.points} pts</td>
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
                        Abre: {new Date(m.opensAt).toLocaleString('pt-BR')}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono-tech">{m._count?.submissions ?? 0}</td>
                  <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openEditMission(m)}
                      className="p-1.5 border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
                      title="Editar / Agendar"
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
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-5">
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-md divide-y divide-slate-200">
            {quizzes.map((q) => (
              <div key={q.id} className="p-4 flex items-start justify-between gap-3 text-xs">
                <div>
                  <span className="font-mono-tech text-[#0047B6] font-bold">
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
                    className="px-2.5 py-1.5 bg-[#0047B6] text-white rounded font-semibold cursor-pointer"
                  >
                    Questões ({q.questions?.length ?? 0})
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Editor de Questões do Quiz selecionado */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-md p-5 text-xs space-y-4">
            {!questionTargetQuiz ? (
              <p className="text-slate-500 py-12 text-center">
                Clique em <strong>Questões</strong> em um quiz ao lado para consultar, incluir ou
                remover perguntas técnicas.
              </p>
            ) : (
              <>
                <div className="pb-2 border-b border-slate-200">
                  <span className="font-mono-tech text-[#0047B6] font-bold uppercase">
                    BANCO DE QUESTÕES DO QUIZ
                  </span>
                  <h3 className="font-bold text-sm text-slate-900">{questionTargetQuiz.title}</h3>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-2">
                  {(questionTargetQuiz.questions || []).map((q: any, idx: number) => (
                    <div
                      key={q.id}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded flex items-start justify-between gap-2"
                    >
                      <div>
                        <span className="font-mono-tech font-bold text-[#0047B6]">
                          #{idx + 1} [{q.courseTrack}]
                        </span>{' '}
                        <span className="font-medium text-slate-800">{q.prompt}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDeleteQuestion(q.id)}
                        className="text-red-600 hover:text-red-800 p-1 cursor-pointer"
                        title="Remover questão"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddQuestion} className="space-y-3 pt-3 border-t border-slate-200">
                  <div className="font-bold text-slate-800 uppercase">Adicionar Nova Questão</div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={qType}
                      onChange={(e) => setQType(e.target.value)}
                      className="border border-slate-300 rounded px-2.5 py-1.5"
                    >
                      <option value="MULTIPLE_CHOICE">Múltipla Escolha</option>
                      <option value="TRUE_FALSE">Verdadeiro ou Falso</option>
                      <option value="PROBLEM_SITUATION">Situação-Problema</option>
                    </select>
                    <select
                      value={qTrack}
                      onChange={(e) => setQTrack(e.target.value)}
                      className="border border-slate-300 rounded px-2.5 py-1.5"
                    >
                      <option value="GERAL">Eixo Geral</option>
                      <option value="INFORMATICA">Informática Segura</option>
                      <option value="LOGISTICA">Logística e Cargas</option>
                      <option value="CLIMATIZACAO">Climatização e Refrigeração</option>
                      <option value="ELETRICA">Segurança Elétrica & EPIs</option>
                      <option value="ERGONOMIA">Ergonomia NR-17</option>
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
                    className="bg-[#0047B6] text-white font-bold px-4 py-2 rounded cursor-pointer"
                  >
                    Salvar Questão no Quiz
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal Criar/Editar Missão e Agendador */}
      {showMissionModal && editingMission && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveMission}
            className="bg-white border border-slate-300 rounded-md max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 text-xs"
          >
            <h3 className="text-base font-bold text-[#0F172A] border-b border-slate-200 pb-2">
              {editingMission.id ? 'Editar / Agendar Missão' : 'Criar Nova Missão'}
            </h3>

            <div className="grid sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-bold mb-1">Título da Missão *</label>
                <input
                  required
                  value={editingMission.title}
                  onChange={(e) => setEditingMission({ ...editingMission, title: e.target.value })}
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
                className="w-full border border-slate-300 rounded px-3 py-2"
              />
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
                <label className="block font-bold mb-1">Tipo de Missão</label>
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
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={editingMission.requiresPhoto}
                  onChange={(e) =>
                    setEditingMission({ ...editingMission, requiresPhoto: e.target.checked })
                  }
                />
                <span>Exigir Foto</span>
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={editingMission.requiresVideo}
                  onChange={(e) =>
                    setEditingMission({ ...editingMission, requiresVideo: e.target.checked })
                  }
                />
                <span>Exigir Vídeo</span>
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={editingMission.requiresApproval}
                  onChange={(e) =>
                    setEditingMission({ ...editingMission, requiresApproval: e.target.checked })
                  }
                />
                <span>Exigir Aprovação do Avaliador</span>
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

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowMissionModal(false)}
                className="px-4 py-2 border border-slate-300 rounded font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#0047B6] text-white font-bold rounded cursor-pointer"
              >
                Salvar Missão
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Criar/Editar Quiz */}
      {showQuizModal && editingQuiz && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveQuiz}
            className="bg-white border border-slate-300 rounded-md max-w-lg w-full p-6 space-y-4 text-xs"
          >
            <h3 className="text-base font-bold text-[#0F172A] border-b border-slate-200 pb-2">
              {editingQuiz.id ? 'Configurar Quiz' : 'Criar Novo Quiz'}
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
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowQuizModal(false)}
                className="px-4 py-2 border border-slate-300 rounded font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#0047B6] text-white font-bold rounded cursor-pointer"
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
