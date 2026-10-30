import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ImagePlus,
  QrCode,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { InstitutionalBrand } from '../components/InstitutionalBrand';
import { AuthUserProfile, useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

/**
 * Redimensiona/comprime a foto capturada pela câmera do celular para upload rápido e leve em redes móveis
 */
async function compressImageFile(file: File, maxDim = 720): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          resolve(new File([blob], 'perfil-sipat.jpg', { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
}

export const RegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const qrCodeParam = searchParams.get('code') || '';
  const navigate = useNavigate();
  const { publicConfig, setSession, user } = useAuth();

  const [qrCheck, setQrCheck] = useState<{
    checked: boolean;
    valid: boolean;
    message?: string;
    label?: string;
  }>({ checked: !qrCodeParam, valid: true });

  const [fullName, setFullName] = useState('');
  const [registrationCode, setRegistrationCode] = useState('');
  const [email, setEmail] = useState('');
  const [classGroupId, setClassGroupId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isMinor, setIsMinor] = useState(false);
  const [guardianName, setGuardianName] = useState('');
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const [imageConsent, setImageConsent] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      navigate(user.role === 'PARTICIPANT' ? '/app' : '/admin', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!qrCodeParam) return;
    apiFetch<{ valid: boolean; label: string }>(`/api/public/qr/${encodeURIComponent(qrCodeParam)}`)
      .then((res) => {
        setQrCheck({ checked: true, valid: true, label: res.label });
      })
      .catch((err: Error) => {
        setQrCheck({
          checked: true,
          valid: false,
          message: err.message || 'Código de inscrição inválido ou desativado pela coordenação.',
        });
      });
  }, [qrCodeParam]);

  const handleFilePicked = async (file?: File) => {
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setAvatarFile(compressed);
      setAvatarPreview(URL.createObjectURL(compressed));
    } catch {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (!lgpdAccepted) {
      setError('É obrigatório aceitar os termos de privacidade da SIPAT / LGPD para prosseguir.');
      return;
    }
    if (isMinor && !guardianName.trim()) {
      setError('Para menores de 18 anos, é obrigatório informar o nome do responsável legal.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('fullName', fullName.trim());
      formData.append('registrationCode', registrationCode.trim());
      formData.append('email', email.trim());
      formData.append('password', password);
      if (classGroupId) formData.append('classGroupId', classGroupId);
      if (qrCodeParam) formData.append('qrTokenCode', qrCodeParam);
      formData.append('isMinor', isMinor ? 'true' : 'false');
      if (guardianName.trim()) formData.append('guardianName', guardianName.trim());
      formData.append('lgpdConsent', 'true');
      formData.append('imageConsent', imageConsent ? 'true' : 'false');
      if (avatarFile) formData.append('avatar', avatarFile);

      const res = await apiFetch<{ token: string; user: AuthUserProfile }>('/api/public/register', {
        method: 'POST',
        body: formData,
      });

      setSession(res.token, res.user);
      navigate('/app', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Falha ao realizar cadastro.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-[#1E293B]">
      {/* Barra superior SENAI Mooca */}
      <div className="bg-[#1E293B] text-white border-b-2 border-[#E30613]">
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between text-xs">
          <span className="font-bold uppercase tracking-wider text-[11px] text-white">
            CADASTRO OFICIAL DO PARTICIPANTE • SIPAT 2026
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

      {/* Header Institucional */}
      <header className="bg-white border-b border-slate-200/90 py-4 shadow-2xs">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-between">
          <InstitutionalBrand
            officialLogoUrl={publicConfig?.officialLogoUrl}
            schoolName={publicConfig?.schoolName}
            variant="dark"
            compact
          />
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {/* Banner de Boas-Vindas */}
          <div className="bg-slate-50 border-b border-slate-200 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#E30613] mb-1">
              <QrCode size={16} />
              <span>Inscrição Rápida de Participante</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#1E293B]">
              Participe da SIPAT 2026
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              {publicConfig?.schoolName || 'Escola SENAI "Morvan Figueiredo"'} • Preencha seus dados
              para acessar missões, quizzes e ranking.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            {qrCheck.checked && !qrCheck.valid ? (
              <div className="bg-amber-50 border border-amber-200 border-l-4 border-l-[#F59E0B] p-4 rounded-md text-xs text-amber-900 space-y-2">
                <div className="font-bold text-sm">QR Code Inativo ou Não Autorizado</div>
                <p>{qrCheck.message}</p>
                <div className="pt-2">
                  <Link to="/" className="text-[#E30613] font-bold hover:underline">
                    Retornar à página principal da campanha
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 border-l-4 border-l-[#E30613] p-3.5 rounded-md text-xs text-red-900 flex items-start gap-2.5">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-[#E30613]" />
                    <span>{error}</span>
                  </div>
                )}

                {/* 1. Foto de Perfil */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">
                    Foto de Perfil (Opcional - Pode tirar agora pelo celular)
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-20 h-20 rounded-full border-2 border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Pré-visualização do perfil"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserCheck size={28} className="text-slate-400" />
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                      <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="user"
                        className="hidden"
                        onChange={(e) => handleFilePicked(e.target.files?.[0])}
                      />
                      <input
                        ref={galleryInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFilePicked(e.target.files?.[0])}
                      />

                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-[#E30613] hover:bg-[#C2040F] text-white text-xs font-bold px-3.5 py-2.5 rounded-md cursor-pointer transition-colors"
                      >
                        <Camera size={15} />
                        <span>Tirar Foto com Câmera</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold px-3.5 py-2.5 rounded-md cursor-pointer transition-colors"
                      >
                        <ImagePlus size={15} />
                        <span>Escolher da Galeria</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Dados Pessoais */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ex: Gabriel Eduardo Silva"
                      className="w-full border border-slate-300 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
                      Matrícula / RA do SENAI *
                    </label>
                    <input
                      type="text"
                      required
                      value={registrationCode}
                      onChange={(e) => setRegistrationCode(e.target.value)}
                      placeholder="Ex: RA20261234"
                      className="w-full border border-slate-300 rounded-md px-3.5 py-2.5 text-sm font-mono-tech uppercase focus:outline-none focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
                      E-mail Institucional ou Pessoal *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu.email@senai.br"
                      className="w-full border border-slate-300 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613] transition-colors"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
                      Turma / Curso no SENAI Mooca *
                    </label>
                    <select
                      required
                      value={classGroupId}
                      onChange={(e) => setClassGroupId(e.target.value)}
                      className="w-full border border-slate-300 rounded-md px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613] transition-colors"
                    >
                      <option value="">Selecione sua turma para pontuar na competição...</option>
                      {(publicConfig?.classes || []).map((c) => (
                        <option key={c.id} value={c.id}>
                          [{c.code}] {c.name} ({c.shift})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
                      Senha de Acesso (Mínimo 6) *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Crie sua senha segura"
                      className="w-full border border-slate-300 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
                      Confirmar Senha *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita sua senha"
                      className="w-full border border-slate-300 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#E30613] focus:ring-1 focus:ring-[#E30613] transition-colors"
                    />
                  </div>
                </div>

                {/* 3. Menor de Idade & LGPD */}
                <div className="border-t border-slate-200 pt-5 space-y-4">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isMinor}
                      onChange={(e) => setIsMinor(e.target.checked)}
                      className="mt-0.5 accent-[#E30613] w-4 h-4"
                    />
                    <div className="text-xs text-slate-700">
                      <span className="font-bold">Sou menor de 18 anos</span> (aluno aprendiz /
                      ensino técnico integrado).
                    </div>
                  </label>

                  {isMinor && (
                    <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-md">
                      <label className="block text-xs font-bold text-amber-900 mb-1 uppercase">
                        Nome Completo do Responsável Legal *
                      </label>
                      <input
                        type="text"
                        required={isMinor}
                        value={guardianName}
                        onChange={(e) => setGuardianName(e.target.value)}
                        placeholder="Nome do pai, mãe ou responsável legal"
                        className="w-full border border-amber-300 rounded-md px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#E30613]"
                      />
                    </div>
                  )}

                  <label className="flex items-start gap-2.5 cursor-pointer bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      required
                      checked={lgpdAccepted}
                      onChange={(e) => setLgpdAccepted(e.target.checked)}
                      className="mt-0.5 accent-[#E30613] w-4 h-4"
                    />
                    <div className="text-xs text-slate-700 leading-relaxed">
                      <span className="font-bold text-slate-900">Termo de Privacidade LGPD: </span>
                      Concordo com o tratamento dos dados informados para fins exclusivos de
                      participação na SIPAT 2026 da Escola SENAI &quot;Morvan Figueiredo&quot;,
                      assegurada a confidencialidade e guarda segura das informações.
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer px-1">
                    <input
                      type="checkbox"
                      checked={imageConsent}
                      onChange={(e) => setImageConsent(e.target.checked)}
                      className="mt-0.5 accent-[#E30613] w-4 h-4"
                    />
                    <div className="text-xs text-slate-600 leading-relaxed">
                      Autorizo a exibição da minha foto e nome completo no ranking público exibido
                      nos telões da escola (caso desmarcado, seu nome será anonimizado no ranking).
                    </div>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#E30613] hover:bg-[#C2040F] disabled:opacity-60 text-white font-bold py-3.5 px-6 rounded-md text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                >
                  <CheckCircle2 size={18} />
                  <span>{submitting ? 'Criando Conta...' : 'Finalizar Inscrição e Entrar'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
