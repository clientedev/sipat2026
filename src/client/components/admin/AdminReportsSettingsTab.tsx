import React, { useCallback, useEffect, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch, downloadAuthenticatedFile } from '../../lib/api';

export const AdminReportsSettingsTab: React.FC = () => {
  const { user, refreshPublicConfig } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [config, setConfig] = useState<any | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  // Novo membro staff
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState<'EVALUATOR' | 'ADMIN' | 'SUPER_ADMIN'>('EVALUATOR');

  const loadData = useCallback(async () => {
    const [cfgRes, logsRes] = await Promise.all([
      apiFetch<{ config: any }>('/api/admin/config'),
      apiFetch<{ logs: any[] }>('/api/admin/audit-logs'),
    ]);
    setConfig(cfgRes.config);
    setAuditLogs(logsRes.logs);

    if (isSuperAdmin) {
      const stRes = await apiFetch<{ staff: any[] }>('/api/admin/staff');
      setStaff(stRes.staff);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    await apiFetch('/api/admin/config', {
      method: 'PATCH',
      body: JSON.stringify({
        schoolName: config.schoolName,
        eventTheme: config.eventTheme,
        eventSlogan: config.eventSlogan,
        namePrivacyMode: config.namePrivacyMode,
        showAvatarsInPublic: Boolean(config.showAvatarsInPublic),
        pointsSimpleMission: Number(config.pointsSimpleMission),
        pointsMediumMission: Number(config.pointsMediumMission),
        pointsAdvancedMission: Number(config.pointsAdvancedMission),
        pointsMaxQuiz: Number(config.pointsMaxQuiz),
        pointsSurpriseMax: Number(config.pointsSurpriseMax),
        tvRotationSeconds: Number(config.tvRotationSeconds),
        lgpdRetentionDays: Number(config.lgpdRetentionDays),
      }),
    });
    await refreshPublicConfig();
    setMsg('Configurações institucionais e de privacidade salvas com sucesso!');
    await loadData();
  };

  const handleBrandLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('logo', file);
    await apiFetch('/api/admin/config/brand-logo', {
      method: 'POST',
      body: fd,
    });
    await refreshPublicConfig();
    await loadData();
    setMsg('Arquivo original da Marca Oficial SENAI aplicado com sucesso!');
  };

  const handleRemoveBrandLogo = async () => {
    await apiFetch('/api/admin/config/brand-logo', { method: 'DELETE' });
    await refreshPublicConfig();
    await loadData();
    setMsg('Marca personalizada removida (retornado à assinatura tipográfica institucional).');
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/admin/staff', {
      method: 'POST',
      body: JSON.stringify({
        fullName: staffName,
        email: staffEmail,
        password: staffPassword,
        role: staffRole,
      }),
    });
    setStaffName('');
    setStaffEmail('');
    setStaffPassword('');
    setMsg('Membro da comissão cadastrado com sucesso!');
    await loadData();
  };

  const handlePurgeExpiredMedia = async () => {
    const res = await apiFetch<{ purgedCount: number; retentionDays: number }>(
      '/api/admin/lgpd/purge-expired-media',
      { method: 'POST' }
    );
    setMsg(
      `Rotina LGPD executada: ${res.purgedCount} arquivo(s) anteriores a ${res.retentionDays} dias expurgados.`
    );
    await loadData();
  };

  return (
    <div className="space-y-6 text-xs">
      {msg && (
        <div className="bg-emerald-50 border border-emerald-200 border-l-4 border-l-emerald-600 p-3 rounded text-emerald-950 flex items-center justify-between">
          <span>{msg}</span>
          <button
            type="button"
            onClick={() => setMsg(null)}
            className="font-bold cursor-pointer"
          >
            OK
          </button>
        </div>
      )}

      {/* 1. Central de Relatórios Exportáveis em Excel e PDF */}
      <div className="bg-white border border-slate-200 rounded-md p-6">
        <h3 className="text-base font-bold text-[#0F172A] mb-1">
          Relatórios Oficiais Exportáveis (Excel .xlsx & PDF)
        </h3>
        <p className="text-slate-600 mb-4">
          Gere documentos consolidados com total de participantes, distribuição por turma,
          participação diária, missões, quizzes, ranking e o dossiê técnico específico da atividade
          Caça aos Riscos.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() =>
              void downloadAuthenticatedFile(
                '/api/admin/reports/general.xlsx',
                'relatorio-geral-sipat2026.xlsx'
              )
            }
            className="p-4 border border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100 rounded-md text-left flex flex-col justify-between gap-2 cursor-pointer"
          >
            <FileSpreadsheet size={20} className="text-emerald-700" />
            <div>
              <div className="font-bold text-slate-900">Relatório Geral (Excel)</div>
              <div className="text-[11px] text-slate-600">
                Planilha multi-abas completa (.xlsx)
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              void downloadAuthenticatedFile(
                '/api/admin/reports/general.pdf',
                'relatorio-geral-sipat2026.pdf'
              )
            }
            className="p-4 border border-blue-300 bg-blue-50/60 hover:bg-blue-100 rounded-md text-left flex flex-col justify-between gap-2 cursor-pointer"
          >
            <FileText size={20} className="text-[#E30613]" />
            <div>
              <div className="font-bold text-slate-900">Relatório Executivo (PDF)</div>
              <div className="text-[11px] text-slate-600">
                Síntese institucional para direção/CIPA
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              void downloadAuthenticatedFile(
                '/api/admin/reports/risk-hunt.xlsx',
                'relatorio-caca-aos-riscos-sipat2026.xlsx'
              )
            }
            className="p-4 border border-amber-300 bg-amber-50/60 hover:bg-amber-100 rounded-md text-left flex flex-col justify-between gap-2 cursor-pointer"
          >
            <Download size={20} className="text-amber-700" />
            <div>
              <div className="font-bold text-slate-900">Caça aos Riscos (Excel)</div>
              <div className="text-[11px] text-slate-600">
                Ambientes, perigos, consequências e prevenção
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              void downloadAuthenticatedFile(
                '/api/admin/reports/risk-hunt.pdf',
                'relatorio-caca-aos-riscos-sipat2026.pdf'
              )
            }
            className="p-4 border border-amber-400 bg-amber-50/80 hover:bg-amber-100 rounded-md text-left flex flex-col justify-between gap-2 cursor-pointer"
          >
            <ShieldAlert size={20} className="text-amber-800" />
            <div>
              <div className="font-bold text-slate-900">Caça aos Riscos (PDF)</div>
              <div className="text-[11px] text-slate-600">
                Dossiê técnico para plano de ação da escola
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* 2. Identidade Institucional, Marca Oficial SENAI & Privacidade LGPD */}
      {config && (
        <div className="grid lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveConfig}
            className="lg:col-span-7 bg-white border border-slate-200 rounded-md p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-[#0F172A]">
              Parâmetros Institucionais, Pontuação e Privacidade do Ranking
            </h3>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1">Nome da Unidade Escolar</label>
                <input
                  value={config.schoolName}
                  onChange={(e) => setConfig({ ...config, schoolName: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">
                  Exibição de Nomes no Ranking Público (LGPD)
                </label>
                <select
                  value={config.namePrivacyMode}
                  onChange={(e) => setConfig({ ...config, namePrivacyMode: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2 font-semibold"
                >
                  <option value="FIRST_LAST_INITIAL">
                    Primeiro Nome + Iniciais (Ex: Gabriel E. A.) — Recomendado
                  </option>
                  <option value="FULL_NAME">Nome Completo</option>
                  <option value="INITIALS_ONLY">Somente Iniciais (Ex: G. E. A.)</option>
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-5 gap-2">
              <div>
                <label className="block font-semibold mb-1">Missão Simples</label>
                <input
                  type="number"
                  value={config.pointsSimpleMission}
                  onChange={(e) =>
                    setConfig({ ...config, pointsSimpleMission: Number(e.target.value) })
                  }
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono-tech"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Intermediária</label>
                <input
                  type="number"
                  value={config.pointsMediumMission}
                  onChange={(e) =>
                    setConfig({ ...config, pointsMediumMission: Number(e.target.value) })
                  }
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono-tech"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Avançada</label>
                <input
                  type="number"
                  value={config.pointsAdvancedMission}
                  onChange={(e) =>
                    setConfig({ ...config, pointsAdvancedMission: Number(e.target.value) })
                  }
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono-tech"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Quiz Máx.</label>
                <input
                  type="number"
                  value={config.pointsMaxQuiz}
                  onChange={(e) => setConfig({ ...config, pointsMaxQuiz: Number(e.target.value) })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono-tech"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Rotação TV (s)</label>
                <input
                  type="number"
                  value={config.tvRotationSeconds}
                  onChange={(e) =>
                    setConfig({ ...config, tvRotationSeconds: Number(e.target.value) })
                  }
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono-tech"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(config.showAvatarsInPublic)}
                onChange={(e) => setConfig({ ...config, showAvatarsInPublic: e.target.checked })}
                className="accent-[#E30613]"
              />
              <span>
                Permitir exibição de foto de perfil no Ranking Público (apenas para alunos que
                marcaram consentimento expresso de imagem).
              </span>
            </label>

            <button
              type="submit"
              className="bg-[#E30613] text-white font-bold px-5 py-2.5 rounded cursor-pointer"
            >
              Salvar Configurações
            </button>
          </form>

          {/* Marca Oficial Original SENAI */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-6 space-y-4">
            <h3 className="text-base font-bold text-[#0F172A]">
              Marca Institucional Oficial SENAI
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Envie exclusivamente o arquivo original homologado da marca SENAI (SVG ou PNG). A
              plataforma aplica o arquivo em sua proporção original, sem distorções ou recriações.
            </p>

            {config.officialLogoPreviewUrl ? (
              <div className="p-4 bg-slate-100 border border-slate-300 rounded flex items-center justify-between">
                <img
                  src={`${config.officialLogoPreviewUrl}?t=${Date.now()}`}
                  alt="Marca Oficial Enviada"
                  className="h-10 object-contain"
                />
                <button
                  type="button"
                  onClick={handleRemoveBrandLogo}
                  className="text-red-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Remover</span>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded text-slate-500">
                Nenhum arquivo vetorial/imagem enviado ainda. Exibindo assinatura tipográfica limpa.
              </div>
            )}

            <label className="inline-flex items-center gap-2 bg-[#E30613] hover:bg-[#C2040F] text-white font-bold px-4 py-2.5 rounded cursor-pointer">
              <Upload size={15} />
              <span>Enviar Arquivo Oficial da Marca (.svg / .png)</span>
              <input
                type="file"
                accept="image/svg+xml,image/png,image/webp,image/jpeg"
                className="hidden"
                onChange={handleBrandLogoUpload}
              />
            </label>

            {isSuperAdmin && (
              <div className="pt-4 border-t border-slate-200 space-y-2">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-[#E30613]" />
                  <span>Retenção de Arquivos Multimídia (LGPD)</span>
                </div>
                <button
                  type="button"
                  onClick={handlePurgeExpiredMedia}
                  className="border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-3 py-2 rounded cursor-pointer"
                >
                  Executar Verificação de Expurgo Pós-Prazo ({config.lgpdRetentionDays} dias)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Gestão de Usuários Staff (Exclusivo Superadministrador) */}
      {isSuperAdmin && (
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md p-5">
            <h3 className="text-sm font-bold text-[#0F172A] mb-3">
              Níveis de Acesso Administrativo e Comissão Avaliadora
            </h3>
            <div className="divide-y divide-slate-200">
              {staff.map((s) => (
                <div key={s.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">{s.fullName}</div>
                    <div className="text-slate-500 font-mono-tech">{s.email}</div>
                  </div>
                  <span className="font-mono-tech font-bold px-2.5 py-0.5 rounded bg-blue-50 text-[#E30613]">
                    {s.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleCreateStaff}
            className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-5 space-y-3"
          >
            <div className="font-bold text-sm text-[#0F172A] flex items-center gap-1.5">
              <UserPlus size={16} className="text-[#E30613]" />
              <span>Cadastrar Avaliador ou Administrador</span>
            </div>
            <input
              required
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              placeholder="Nome completo"
              className="w-full border border-slate-300 rounded px-3 py-2"
            />
            <input
              required
              type="email"
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
              placeholder="E-mail institucional"
              className="w-full border border-slate-300 rounded px-3 py-2"
            />
            <input
              required
              type="password"
              minLength={8}
              value={staffPassword}
              onChange={(e) => setStaffPassword(e.target.value)}
              placeholder="Senha segura (mín. 8 caracteres)"
              className="w-full border border-slate-300 rounded px-3 py-2"
            />
            <select
              value={staffRole}
              onChange={(e) => setStaffRole(e.target.value as any)}
              className="w-full border border-slate-300 rounded px-3 py-2 font-bold"
            >
              <option value="EVALUATOR">EVALUATOR (Apenas Central de Evidências)</option>
              <option value="ADMIN">ADMIN (Gestão Operacional Completa)</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN (Controle Total)</option>
            </select>
            <button
              type="submit"
              className="w-full bg-[#E30613] text-white font-bold py-2 rounded cursor-pointer"
            >
              Criar Credencial Administrativa
            </button>
          </form>
        </div>
      )}

      {/* 4. Trilha de Auditoria Imutável */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 uppercase font-mono-tech">
          Registro de Auditoria do Sistema (Pontuações Manuais, Avaliações, QR e LGPD)
        </div>
        <div className="max-h-72 overflow-y-auto divide-y divide-slate-200">
          {auditLogs.map((log) => (
            <div key={log.id} className="px-5 py-2.5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-mono-tech font-bold text-[#E30613] mr-2">{log.action}</span>
                <span className="text-slate-700">
                  Responsável: <strong>{log.actor?.fullName || 'Sistema'}</strong>
                  {log.targetUser ? ` → Participante: ${log.targetUser.fullName}` : ''}
                </span>
                {log.reason && (
                  <div className="text-slate-500 mt-0.5">Justificativa: {log.reason}</div>
                )}
              </div>
              <span className="font-mono-tech text-[11px] text-slate-400">
                {new Date(log.createdAt).toLocaleString('pt-BR')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

