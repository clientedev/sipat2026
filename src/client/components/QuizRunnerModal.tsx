import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Clock,
  HelpCircle,
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

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = quiz?.questions.length || 0;

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
      setError(err?.message || 'Erro ao processar as respostas do quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  const optionLetters = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-slate-300 rounded-xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Cabeçalho Institucional no Padrão SENAI-SP */}
        <div className="bg-[#1E293B] text-white px-5 py-4 border-b-4 border-[#E30613] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="/brand/senai-oficial.png"
              alt="SENAI"
              className="h-7 w-auto object-contain hidden sm:inline-block"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#E30613] text-white px-2 py-0.5 rounded">
                  QUIZ TÉCNICO • ATÉ {quiz?.maxPoints ?? 50} PONTOS
                </span>
                {quiz && (
                  <span className="text-xs text-slate-300 hidden sm:inline">
                    Respondidas: {answeredCount}/{totalQuestions}
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-0.5 truncate">
                {quiz?.title || 'Carregando Quiz...'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {quiz?.canAttempt && !result && (
              <div
                className={`px-3 py-1.5 rounded font-mono-tech text-xs font-bold flex items-center gap-1.5 ${
                  secondsLeft <= 60
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-slate-800 border border-slate-700 text-[#F59E0B]'
                }`}
              >
                <Clock size={14} />
                <span>{formatTimer(secondsLeft)}</span>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Conteúdo Principal do Quiz */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-sm">
          {loading && (
            <div className="text-center py-12 space-y-3">
              <div className="w-8 h-8 border-3 border-[#E30613] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-600 text-xs font-semibold">
                Carregando questões técnicas oficiais da SIPAT...
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 border-l-4 border-l-[#E30613] p-4 rounded-md text-xs text-red-900 flex items-start gap-2.5">
              <AlertCircle size={17} className="shrink-0 mt-0.5 text-[#E30613]" />
              <span>{error}</span>
            </div>
          )}

          {result ? (
            /* Tela de Resultado com Feedback Técnico */
            <div className="space-y-6">
              <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-[#E30613] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Award size={36} />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#E30613]">
                      TENTATIVA #{result.attempt.attemptNumber} FINALIZADA
                    </span>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-[#1E293B]">
                      {result.attempt.correctCount} de {result.attempt.totalQuestions} acertos (
                      {result.attempt.scorePercent}%)
                    </h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Pontos no quiz: <strong>{result.attempt.quizScorePoints} pts</strong> •
                      Pontos creditados ao seu saldo geral:{' '}
                      <strong className="text-emerald-700">
                        +{result.attempt.pointsAddedToTotal} pts
                      </strong>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-[#E30613] hover:bg-[#C2040F] text-white font-bold text-xs px-6 py-3 rounded-md cursor-pointer transition-colors shadow-xs"
                >
                  Concluir e Fechar
                </button>
              </div>

              <div className="space-y-4">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-700">
                  Gabarito Educativo e Orientações de Prevenção
                </h4>
                {result.review.map((item, idx) => (
                  <div
                    key={item.questionId}
                    className={`p-4 rounded-xl border-l-4 border ${
                      item.isCorrect
                        ? 'bg-emerald-50/70 border-emerald-200 border-l-emerald-600'
                        : 'bg-amber-50/70 border-amber-200 border-l-amber-600'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 font-bold text-sm text-[#1E293B]">
                      {item.isCorrect ? (
                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                      )}
                      <span>
                        Questão {idx + 1}: {item.prompt}
                      </span>
                    </div>
                    <div className="mt-2.5 pl-7 text-xs text-slate-700 leading-relaxed bg-white/60 p-3 rounded-lg border border-slate-200">
                      <strong className="text-slate-900">Orientação Técnica: </strong>
                      {item.explanation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            quiz && (
              <>
                {!quiz.canAttempt ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center space-y-3">
                    <AlertCircle size={32} className="mx-auto text-[#F59E0B]" />
                    <h3 className="font-bold text-base text-slate-800">
                      Limite de Tentativas Concluído ({quiz.attemptsUsed}/{quiz.maxAttempts})
                    </h3>
                    <p className="text-xs text-slate-600 max-w-sm mx-auto">
                      Sua melhor pontuação já foi computada e pontuada para você e sua turma no
                      ranking oficial da SIPAT!
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-600 flex items-center justify-between gap-3">
                      <div>
                        <strong>{quiz.category}</strong>: {quiz.description}
                      </div>
                      <span className="font-bold text-[#E30613] shrink-0">
                        Tentativa {quiz.attemptsUsed + 1} de {quiz.maxAttempts}
                      </span>
                    </div>

                    {quiz.questions.map((q, index) => (
                      <div
                        key={q.id}
                        className="border border-slate-200 rounded-xl p-5 bg-[#F8FAFC] space-y-4 hover:border-slate-300 transition-colors shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-[#E30613] uppercase tracking-wide">
                            QUESTÃO {index + 1} DE {quiz.questions.length}
                          </span>
                          <span className="bg-white border border-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full font-semibold text-[11px]">
                            {q.courseTrack}
                          </span>
                        </div>

                        {q.scenarioContext && (
                          <div className="text-xs bg-red-50/60 border-l-3 border-[#E30613] px-3.5 py-2.5 text-slate-800 rounded-r">
                            <span className="font-bold text-[#E30613] block mb-0.5">Situação-Problema:</span>
                            {q.scenarioContext}
                          </div>
                        )}

                        {q.imageUrl && (
                          <div className="bg-white border border-slate-200 rounded-lg p-3 flex justify-center">
                            <img
                              src={q.imageUrl}
                              alt="Ilustração técnica da questão"
                              className="max-h-48 object-contain"
                            />
                          </div>
                        )}

                        <p className="font-bold text-base text-[#1E293B] leading-snug">
                          {q.prompt}
                        </p>

                        {/* Alternativas Grandes e Intuitivas */}
                        <div className="space-y-2.5">
                          {q.options.map((opt, optIndex) => {
                            const selected = answers[q.id] === opt.id;
                            const letter = optionLetters[optIndex] || `${optIndex + 1}`;
                            return (
                              <label
                                key={opt.id}
                                className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs sm:text-sm cursor-pointer transition-all ${
                                  selected
                                    ? 'bg-red-50/70 border-[#E30613] font-semibold text-[#1E293B] shadow-2xs'
                                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                                    selected
                                      ? 'bg-[#E30613] text-white'
                                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                                  }`}
                                >
                                  {letter}
                                </div>
                                <input
                                  type="radio"
                                  name={`q_${q.id}`}
                                  required
                                  checked={selected}
                                  onChange={() =>
                                    setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))
                                  }
                                  className="sr-only"
                                />
                                <span className="leading-relaxed">{opt.text}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200">
                      <div className="text-xs text-slate-500 font-medium">
                        {answeredCount} de {totalQuestions} respondidas
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={onClose}
                          className="px-4 py-2.5 border border-slate-300 rounded-md text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={submitting || answeredCount < totalQuestions}
                          className="inline-flex items-center gap-2 bg-[#E30613] hover:bg-[#C2040F] disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-md text-xs cursor-pointer transition-colors shadow-xs"
                        >
                          <Send size={15} />
                          <span>{submitting ? 'Corrigindo...' : 'Enviar Respostas do Quiz'}</span>
                        </button>
                      </div>
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
