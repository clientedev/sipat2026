import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Clock,
  Send,
  X,
  XCircle,
} from 'lucide-react';
import { apiFetch } from '../lib/api';

interface LoadedQuiz {
  id: string;
  title: string;
  description: string;
  category: string;
  eventDay: number;
  durationSeconds: number;
  maxPoints: number;
  maxAttempts: number;
  attemptsUsed: number;
  canAttempt: boolean;
  questions: Array<{
    id: string;
    questionType: string;
    courseTrack: string;
    prompt: string;
    scenarioContext: string | null;
    imageUrl: string | null;
    options: Array<{ id: string; text: string }>;
    pointsWeight: number;
  }>;
}

interface QuizSubmitResponse {
  attempt: {
    id: string;
    attemptNumber: number;
    correctCount: number;
    totalQuestions: number;
    scorePercent: number;
    quizScorePoints: number;
    pointsAddedToTotal: number;
  };
  review: Array<{
    questionId: string;
    prompt: string;
    chosenOptionId: string;
    correctOptionId: string;
    isCorrect: boolean;
    explanation: string;
  }>;
}

interface QuizRunnerModalProps {
  quizId: string;
  onClose: () => void;
  onCompleted: () => void;
}

export const QuizRunnerModal: React.FC<QuizRunnerModalProps> = ({
  quizId,
  onClose,
  onCompleted,
}) => {
  const [quiz, setQuiz] = useState<LoadedQuiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [startedAt] = useState<string>(() => new Date().toISOString());
  const [secondsLeft, setSecondsLeft] = useState<number>(600);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizSubmitResponse | null>(null);

  useEffect(() => {
    apiFetch<{ quiz: LoadedQuiz }>(`/api/participant/quizzes/${quizId}`)
      .then((res) => {
        setQuiz(res.quiz);
        setSecondsLeft(res.quiz.durationSeconds || 600);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [quizId]);

  useEffect(() => {
    if (!quiz || !quiz.canAttempt || result) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [quiz, result]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch<QuizSubmitResponse>(`/api/participant/quizzes/${quiz.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers, startedAt }),
      });
      setResult(res);
      onCompleted();
    } catch (err: any) {
      setError(err?.message || 'Erro ao enviar respostas do quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-slate-300 rounded-md max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-xl">
        {/* Cabeçalho */}
        <div className="bg-[#0047B6] text-white px-5 py-4 border-b-4 border-[#FFB800] flex items-center justify-between gap-4 shrink-0">
          <div>
            <span className="text-[11px] font-mono-tech uppercase text-blue-200">
              QUIZ EDUCATIVO • ATÉ {quiz?.maxPoints ?? 50} PONTOS
            </span>
            <h2 className="text-lg font-bold">{quiz?.title || 'Carregando Quiz...'}</h2>
          </div>

          <div className="flex items-center gap-3">
            {quiz?.canAttempt && !result && (
              <div className="bg-[#0F172A] border border-[#FFB800] text-[#FFB800] px-3 py-1.5 rounded font-mono-tech text-xs font-bold flex items-center gap-1.5">
                <Clock size={14} />
                <span>{formatTimer(secondsLeft)}</span>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 cursor-pointer"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          {loading && <p className="text-center py-8 text-slate-600">Carregando questões técnicas...</p>}

          {error && (
            <div className="bg-red-50 border border-red-200 border-l-4 border-l-red-600 p-3.5 rounded text-xs text-red-800 flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {result ? (
            <div className="space-y-5">
              <div className="bg-[#F8FAFC] border-2 border-[#0047B6] rounded-md p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-md bg-[#0047B6] text-[#FFB800] flex items-center justify-center shrink-0">
                    <Award size={30} />
                  </div>
                  <div>
                    <span className="text-xs font-mono-tech uppercase text-[#0047B6] font-bold">
                      RESULTADO DA TENTATIVA #{result.attempt.attemptNumber}
                    </span>
                    <h3 className="text-xl font-bold text-[#0F172A]">
                      {result.attempt.correctCount} de {result.attempt.totalQuestions} acertos (
                      {result.attempt.scorePercent}%)
                    </h3>
                    <p className="text-xs text-slate-600">
                      Pontuação no quiz: <strong>{result.attempt.quizScorePoints} pts</strong> •
                      Adicionado ao saldo geral:{' '}
                      <strong className="text-emerald-700">
                        +{result.attempt.pointsAddedToTotal} pts
                      </strong>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-[#0047B6] text-white font-bold text-xs px-5 py-2.5 rounded cursor-pointer"
                >
                  Concluir Revisão
                </button>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600">
                  Feedback Educativo e Explicações Técnicas
                </h4>
                {result.review.map((item, idx) => (
                  <div
                    key={item.questionId}
                    className={`p-4 rounded border-l-4 border ${
                      item.isCorrect
                        ? 'bg-emerald-50/60 border-emerald-200 border-l-emerald-600'
                        : 'bg-amber-50/60 border-amber-200 border-l-amber-600'
                    }`}
                  >
                    <div className="flex items-start gap-2 font-semibold text-xs text-[#0F172A]">
                      {item.isCorrect ? (
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                      )}
                      <span>
                        {idx + 1}. {item.prompt}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mt-2 pl-6 leading-relaxed">
                      <strong>Orientação Técnica:</strong> {item.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            quiz && (
              <>
                {!quiz.canAttempt ? (
                  <div className="bg-slate-100 border border-slate-300 rounded p-5 text-center space-y-2">
                    <p className="font-bold text-slate-800">
                      Limite de tentativas utilizado ({quiz.attemptsUsed}/{quiz.maxAttempts})
                    </p>
                    <p className="text-xs text-slate-600">
                      Sua melhor pontuação já está registrada no ranking da SIPAT 2026!
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded p-3">
                      {quiz.description} • Tentativa {quiz.attemptsUsed + 1} de {quiz.maxAttempts}.
                    </p>

                    {quiz.questions.map((q, index) => (
                      <div
                        key={q.id}
                        className="border border-slate-200 rounded-md p-4 bg-[#F8FAFC] space-y-3"
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono-tech text-slate-500">
                          <span className="font-bold text-[#0047B6]">
                            QUESTÃO {index + 1} DE {quiz.questions.length}
                          </span>
                          <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                            EIXO: {q.courseTrack}
                          </span>
                        </div>

                        {q.scenarioContext && (
                          <div className="text-xs bg-blue-50 border-l-3 border-[#0047B6] px-3 py-2 text-slate-700">
                            {q.scenarioContext}
                          </div>
                        )}

                        {q.imageUrl && (
                          <div className="bg-white border border-slate-200 rounded p-2 flex justify-center">
                            <img
                              src={q.imageUrl}
                              alt="Ilustração técnica da questão"
                              className="max-h-44 object-contain"
                            />
                          </div>
                        )}

                        <p className="font-bold text-sm text-[#0F172A] leading-snug">{q.prompt}</p>

                        <div className="space-y-2">
                          {q.options.map((opt) => {
                            const selected = answers[q.id] === opt.id;
                            return (
                              <label
                                key={opt.id}
                                className={`flex items-start gap-2.5 p-3 rounded border text-xs cursor-pointer transition-colors ${
                                  selected
                                    ? 'bg-blue-50 border-[#0047B6] font-semibold text-[#0F172A]'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`q_${q.id}`}
                                  required
                                  checked={selected}
                                  onChange={() =>
                                    setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))
                                  }
                                  className="mt-0.5 accent-[#0047B6]"
                                />
                                <span>{opt.text}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center gap-2 bg-[#0047B6] hover:bg-[#003894] disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded text-xs cursor-pointer"
                      >
                        <Send size={15} />
                        <span>{submitting ? 'Corrigindo...' : 'Finalizar e Corrigir Quiz'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
};
