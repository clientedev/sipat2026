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
        setQrCheck({ checked: true, valid: false, message: err.message });
      });
  }, [qrCodeParam]);

  useEffect(() => {
    if (!classGroupId && publicConfig?.classes?.length) {
      setClassGroupId(publicConfig.classes[0].id);
    }
  }, [publicConfig, classGroupId]);

  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.files?.[0];
    if (!raw) return;
    const processed = await compressImageFile(raw);
    setAvatarFile(processed);
    const previewUrl = URL.createObjectURL(processed);
    setAvatarPreview(previewUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('A confirmação de senha não confere com a senha digitada.');
      return;
    }

    if (!lgpdAccepted) {
      setError('Confirme a ciência das normas institucionais e proteção de dados (LGPD).');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('fullName', fullName.trim());
      formData.append('registrationCode', registrationCode.trim());
      formData.append('email', email.trim());
      formData.append('classGroupId', classGroupId);
      formData.append('password', password);
      if (qrCodeParam) formData.append('qrCode', qrCodeParam);
      formData.append('isMinor', String(isMinor));
      if (guardianName.trim()) formData.append('guardianName', guardianName.trim());
      formData.append('lgpdAccepted', String(lgpdAccepted));
      formData.append('imageConsent', String(imageConsent));
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const res = await apiFetch<{ token: string; user: AuthUserProfile }>('/api/auth/register', {
        method: 'POST',
        body: formData,
      });

      setSession(res.token, res.user);
      navigate('/app', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Não foi possível concluir o cadastro.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col">
      <header className="bg-[#0047B6] text-white border-b-4 border-[#FFB800]">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between">
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

      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-6 sm:py-8">
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-xs">
          <div className="p-5 sm:p-6 bg-[#F8FAFC] border-b border-slate-200">
            <div className="flex items-center gap-2 text-xs font-mono-tech uppercase text-[#0047B6] font-semibold">
              <QrCode size={15} />
              <span>
                {qrCodeParam ? `INSCRIÇÃO VIA QR CODE (${qrCodeParam})` : 'CADASTRO DE PARTICIPANTE'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] mt-1">
              Inscrição Oficial – SIPAT 2026
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Preencha seus dados para acessar imediatamente seu painel individual de missões,
              quizzes e medalhas.
            </p>
          </div>

          {!qrCheck.valid ? (
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 border-l-4 border-l-red-600 p-4 rounded text-sm text-red-800 flex items-start gap-3">
                <AlertCircle className="shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="font-bold">QR Code indisponível para novas inscrições</p>
                  <p className="mt-1 text-xs">{qrCheck.message}</p>
                </div>
              </div>
              <Link
                to="/login"
                className="w-full inline-flex justify-center items-center bg-[#0047B6] text-white font-semibold py-3 rounded-md text-sm"
              >
                Já tenho conta — Fazer Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 border-l-4 border-l-red-600 p-3.5 rounded text-xs sm:text-sm text-red-800 flex items-start gap-2.5">
                  <AlertCircle className="shrink-0 mt-0.5" size={18} />
                  <span>{error}</span>
                </div>
              )}

              {/* Foto de Perfil Mobile (Câmera ou Galeria) */}
              <div className="bg-[#F8FAFC] border border-slate-200 rounded-md p-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  Foto de Identificação do Crachá Digital (Opcional)
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-md bg-slate-200 border-2 border-[#0047B6] overflow-hidden flex items-center justify-center shrink-0">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Prévia da foto"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserCheck size={28} className="text-slate-400" />
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full">
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="user"
                      className="hidden"
                      onChange={handlePhotoSelected}
                    />
                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handlePhotoSelected}
                    />
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#0047B6] hover:bg-[#003894] text-white text-xs font-semibold py-2.5 px-3 rounded-md cursor-pointer"
                    >
                      <Camera size={15} />
                      <span>Usar Câmera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold py-2.5 px-3 rounded-md cursor-pointer"
                    >
                      <ImagePlus size={15} />
                      <span>Escolher na Galeria</span>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Gabriel Eduardo Almeida"
                  className="w-full border border-slate-300 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0047B6]"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Matrícula Escolar / RA ou NIF *
                  </label>
                  <input
                    type="text"
                    required
                    value={registrationCode}
                    onChange={(e) => setRegistrationCode(e.target.value)}
                    placeholder="Ex: RA20260451"
                    className="w-full border border-slate-300 rounded-md px-3.5 py-2.5 text-sm font-mono-tech uppercase focus:outline-none focus:border-[#0047B6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mail Institucional ou Pessoal *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.nome@aluno.senai.br"
                    className="w-full border border-slate-300 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0047B6]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Turma ou Setor ({publicConfig?.schoolName || 'SENAI Morvan Figueiredo'}) *
                </label>
                <select
                  required
                  value={classGroupId}
                  onChange={(e) => setClassGroupId(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:border-[#0047B6]"
                >
                  {(publicConfig?.classes || []).map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      [{cls.code}] {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Crie sua Senha de Acesso *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full border border-slate-300 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0047B6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirme sua Senha *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    className="w-full border border-slate-300 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0047B6]"
                  />
                </div>
              </div>

              {/* Proteção LGPD e Menores de Idade */}
              <div className="bg-slate-50 border border-slate-200 rounded-md p-4 space-y-3 text-xs text-slate-700">
                <div className="flex items-center gap-2 font-bold text-[#0F172A]">
                  <ShieldCheck size={16} className="text-[#0047B6]" />
                  <span>Proteção de Dados e Autorização Institucional (LGPD)</span>
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isMinor}
                    onChange={(e) => setIsMinor(e.target.checked)}
                    className="mt-0.5 accent-[#0047B6]"
                  />
                  <span>Sou estudante menor de 18 anos de idade.</span>
                </label>

                {isMinor && (
                  <div className="pl-6">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nome do Responsável Legal (conforme matrícula escolar SENAI)
                    </label>
                    <input
                      type="text"
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      placeholder="Nome completo do responsável"
                      className="w-full border border-slate-300 bg-white rounded px-3 py-2 text-xs"
                    />
                  </div>
                )}

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={lgpdAccepted}
                    onChange={(e) => setLgpdAccepted(e.target.checked)}
                    className="mt-0.5 accent-[#0047B6]"
                  />
                  <span>
                    Declaro ciência de que meus dados serão utilizados exclusivamente para a gestão
                    pedagógica e pontuação da SIPAT 2026 na{' '}
                    <strong>{publicConfig?.schoolName || 'Escola SENAI "Morvan Figueiredo"'}</strong>,
                    mantendo minhas evidências privadas por padrão conforme a LGPD. *
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={imageConsent}
                    onChange={(e) => setImageConsent(e.target.checked)}
                    className="mt-0.5 accent-[#0047B6]"
                  />
                  <span>
                    (Opcional) Autorizo o uso institucional e educativo de imagem/foto de perfil nas
                    ações internas da campanha SIPAT 2026, observada a autorização escolar vigente.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#0047B6] hover:bg-[#003894] disabled:opacity-60 text-white font-bold py-3.5 px-4 rounded-md text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <CheckCircle2 size={18} />
                <span>{submitting ? 'Validando e criando acesso...' : 'Concluir Inscrição e Entrar'}</span>
              </button>

              <p className="text-center text-xs text-slate-600">
                Já realizou seu cadastro?{' '}
                <Link to="/login" className="text-[#0047B6] font-semibold hover:underline">
                  Acesse sua conta aqui
                </Link>
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};
