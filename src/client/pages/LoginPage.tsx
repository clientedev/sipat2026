import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, LogIn } from 'lucide-react';
import { InstitutionalBrand } from '../components/InstitutionalBrand';
import { AuthUserProfile, useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { publicConfig, setSession, user } = useAuth();

  const [mode, setMode] = useState<'login' | 'recover'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const [recEmail, setRecEmail] = useState('');
  const [recCode, setRecCode] = useState('');
  const [recNewPassword, setRecNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      navigate(user.role === 'PARTICIPANT' ? '/app' : '/admin', { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ token: string; user: AuthUserProfile }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      setSession(res.token, res.user);
      navigate(res.user.role === 'PARTICIPANT' ? '/app' : '/admin', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Falha na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/recover-access', {
        method: 'POST',
        body: JSON.stringify({
          email: recEmail.trim(),
          registrationCode: recCode.trim(),
          newPassword: recNewPassword,
        }),
      });
      setSuccessMsg(res.message);
      setIdentifier(recEmail.trim());
      setMode('login');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível redefinir a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col">
      <header className="bg-[#0047B6] text-white border-b-4 border-[#FFB800]">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <InstitutionalBrand
            officialLogoUrl={publicConfig?.officialLogoUrl}
            schoolName={publicConfig?.schoolName}
            variant="light"
            compact
          />
          <Link
            to="/"
            className="text-xs font-semibold text-blue-100 hover:text-white flex items-center gap-1"
          >
            <ArrowLeft size={14} />
            <span>Início</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-md overflow-hidden shadow-xs">
          <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-3.5 text-center cursor-pointer transition-colors ${
                mode === 'login'
                  ? 'bg-white text-[#0047B6] border-b-2 border-[#0047B6]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Acesso à Plataforma
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('recover');
                setError(null);
              }}
              className={`py-3.5 text-center cursor-pointer transition-colors ${
                mode === 'recover'
                  ? 'bg-white text-[#0047B6] border-b-2 border-[#0047B6]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Recuperar Acesso
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 border-l-4 border-l-red-600 p-3 rounded text-xs text-red-800 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 border-l-4 border-l-emerald-600 p-3 rounded text-xs text-emerald-800 flex items-start gap-2">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <h1 className="text-lg font-bold text-[#0F172A]">Entrar na SIPAT 2026</h1>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Alunos, colaboradores, avaliadores e coordenação.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mail ou Matrícula / RA
                  </label>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="seu.email@senai.br ou matrícula"
                    className="w-full border border-slate-300 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0047B6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Senha</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    className="w-full border border-slate-300 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0047B6]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0047B6] hover:bg-[#003894] disabled:opacity-60 text-white font-bold py-3 rounded-md text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn size={17} />
                  <span>{loading ? 'Autenticando...' : 'Entrar no Painel'}</span>
                </button>

                <p className="text-center text-xs text-slate-600 pt-2">
                  Ainda não está inscrito?{' '}
                  <Link
                    to={
                      publicConfig?.activeQrCode
                        ? `/inscricao?code=${encodeURIComponent(publicConfig.activeQrCode)}`
                        : '/inscricao'
                    }
                    className="text-[#0047B6] font-semibold hover:underline"
                  >
                    Realizar inscrição de participante
                  </Link>
                </p>
              </form>
            ) : (
              <form onSubmit={handleRecover} className="space-y-4">
                <div>
                  <h1 className="text-lg font-bold text-[#0F172A]">Redefinir Senha de Participante</h1>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Confirme seu e-mail e número de matrícula/RA cadastrado para criar uma nova senha.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mail Cadastrado
                  </label>
                  <input
                    type="email"
                    required
                    value={recEmail}
                    onChange={(e) => setRecEmail(e.target.value)}
                    placeholder="seu.nome@aluno.senai.br"
                    className="w-full border border-slate-300 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0047B6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Matrícula / RA de Confirmação
                  </label>
                  <input
                    type="text"
                    required
                    value={recCode}
                    onChange={(e) => setRecCode(e.target.value)}
                    placeholder="Ex: RA20260451"
                    className="w-full border border-slate-300 rounded-md px-3.5 py-2.5 text-sm font-mono-tech uppercase focus:outline-none focus:border-[#0047B6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nova Senha (mínimo 6 caracteres)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={recNewPassword}
                    onChange={(e) => setRecNewPassword(e.target.value)}
                    placeholder="Nova senha segura"
                    className="w-full border border-slate-300 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0047B6]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0047B6] hover:bg-[#003894] disabled:opacity-60 text-white font-bold py-3 rounded-md text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <KeyRound size={17} />
                  <span>{loading ? 'Validando dados...' : 'Confirmar Nova Senha'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
