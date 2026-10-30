import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, LogIn, ShieldCheck } from 'lucide-react';
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
      setError(err?.message || 'Falha na autenticação. Verifique seu e-mail/matrícula e senha.');
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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-[#1E293B]">
      {/* Barra superior SENAI Mooca */}
      <div className="bg-[#1E293B] text-white border-b-2 border-[#E30613]">
        <div className="max-w-xl mx-auto px-4 py-2 flex items-center justify-between text-xs">
          <span className="font-bold uppercase tracking-wider text-[11px] text-white">
            SENAI-SP • ESCOLA MORVAN FIGUEIREDO (MOOCA)
          </span>
          <Link
            to="/"
            className="text-slate-300 hover:text-white flex items-center gap-1 font-medium transition-colors"
          >
            <ArrowLeft size={13} />
            <span>Voltar ao Início</span>
          </Link>
        </div>
      </div>

      {/* Header Institucional Branco */}
      <header className="bg-white border-b border-slate-200/90 py-4 shadow-2xs">
        <div className="max-w-xl mx-auto px-4 flex items-center justify-between">
          <InstitutionalBrand
            officialLogoUrl={publicConfig?.officialLogoUrl}
            schoolName={publicConfig?.schoolName}
            variant="dark"
            compact
          />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {/* Alternador de Abas */}
          <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-3.5 text-center cursor-pointer transition-colors ${
                mode === 'login'
                  ? 'bg-white text-[#E30613] border-b-2 border-[#E30613]'
                  : 'text-slate-600 hover:text-[#1E293B]'
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
                  ? 'bg-white text-[#E30613] border-b-2 border-[#E30613]'
                  : 'text-slate-600 hover:text-[#1E293B]'
              }`}
            >
              Recuperar Acesso
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {error && (
              <div className="mb-5 bg-red-50 border border-red-200 border-l-4 border-l-[#E30613] p-3.5 rounded-md text-xs text-red-900 flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-[#E30613]" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-5 bg-emerald-50 border border-emerald-200 border-l-4 border-l-emerald-600 p-3.5 rounded-md text-xs text-emerald-900 flex items-start gap-2.5">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <h1 className="text-xl font-extrabold text-[#1E293B]">Entrar na SIPAT 2026</h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Alunos, colaboradores, avaliadores e coordenação.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    E-mail ou Matrícula / RA
                  </label>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="seu.email@senai.br ou matrícula"
                    className="w-full border border-slate-300 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Senha de Acesso
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha cadastrada"
                    className="w-full border border-slate-300 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613] transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#E30613] hover:bg-[#C2040F] disabled:opacity-60 text-white font-bold py-3 px-4 rounded-md text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                >
                  <LogIn size={18} />
                  <span>{loading ? 'Validando acesso...' : 'Entrar na Plataforma'}</span>
                </button>

                <div className="pt-3 border-t border-slate-200 text-center">
                  <p className="text-xs text-slate-600">
                    Ainda não tem cadastro?{' '}
                    <Link
                      to={
                        publicConfig?.activeQrCode
                          ? `/inscricao?code=${encodeURIComponent(publicConfig.activeQrCode)}`
                          : '/inscricao'
                      }
                      className="text-[#E30613] font-bold hover:underline"
                    >
                      Cadastrar-se com QR Code
                    </Link>
                  </p>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRecover} className="space-y-4">
                <div>
                  <h1 className="text-xl font-extrabold text-[#1E293B]">Recuperar Senha</h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Informe seu e-mail e matrícula institucional cadastrados.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    E-mail Cadastrado
                  </label>
                  <input
                    type="email"
                    required
                    value={recEmail}
                    onChange={(e) => setRecEmail(e.target.value)}
                    placeholder="seu.email@aluno.senai.br"
                    className="w-full border border-slate-300 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Matrícula / RA de Confirmação
                  </label>
                  <input
                    type="text"
                    required
                    value={recCode}
                    onChange={(e) => setRecCode(e.target.value)}
                    placeholder="Ex: RA20260451"
                    className="w-full border border-slate-300 rounded-md px-3.5 py-2.5 text-sm font-mono-tech uppercase focus:outline-none focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Nova Senha (mínimo 6 caracteres)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={recNewPassword}
                    onChange={(e) => setRecNewPassword(e.target.value)}
                    placeholder="Nova senha segura"
                    className="w-full border border-slate-300 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613] transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#E30613] hover:bg-[#C2040F] disabled:opacity-60 text-white font-bold py-3 px-4 rounded-md text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                >
                  <KeyRound size={18} />
                  <span>{loading ? 'Atualizando senha...' : 'Confirmar Nova Senha'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
