import React, { useCallback, useEffect, useState } from 'react';
import {
  Copy,
  Download,
  FileSpreadsheet,
  Plus,
  Power,
  QrCode,
  RefreshCw,
  Search,
  Sliders,
  Upload,
} from 'lucide-react';
import { apiFetch, downloadAuthenticatedFile } from '../../lib/api';

export const AdminParticipantsQrTab: React.FC = () => {
  const [view, setView] = useState<'qr' | 'participants' | 'classes'>('qr');
  const [qrData, setQrData] = useState<any | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  // Período de inscrições
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');

  // Cadastro Manual de Participante
  const [showManualModal, setShowManualModal] = useState(false);
  const [manName, setManName] = useState('');
  const [manEmail, setManEmail] = useState('');
  const [manCode, setManCode] = useState('');
  const [manClassId, setManClassId] = useState('');
  const [manPassword, setManPassword] = useState('Senai@2026');

  // Ajuste Manual de Pontos (Auditado)
  const [adjustTarget, setAdjustTarget] = useState<any | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<number>(20);
  const [adjustReason, setAdjustReason] = useState<string>('');

  // Nova Turma
  const [clsCode, setClsCode] = useState('');
  const [clsName, setClsName] = useState('');
  const [clsArea, setClsArea] = useState('Informática e TI');
  const [clsShift, setClsShift] = useState('Manhã');

  const loadQr = useCallback(async () => {
    const res = await apiFetch('/api/admin/qr');
    setQrData(res);
    setValidFrom(res.currentQr?.validFrom ? res.currentQr.validFrom.slice(0, 16) : '');
    setValidUntil(res.currentQr?.validUntil ? res.currentQr.validUntil.slice(0, 16) : '');
  }, []);

  const loadClasses = useCallback(async () => {
    const res = await apiFetch<{ classes: any[] }>('/api/admin/classes');
    setClasses(res.classes);
    if (!manClassId && res.classes.length > 0) {
      setManClassId(res.classes[0].id);
    }
  }, [manClassId]);

  const loadParticipants = useCallback(async () => {
    const qs = new URLSearchParams();
    if (search.trim()) qs.set('search', search.trim());
    if (classFilter) qs.set('classGroupId', classFilter);
    const res = await apiFetch<{ participants: any[] }>(
      `/api/admin/participants?${qs.toString()}`
    );
    setParticipants(res.participants);
  }, [search, classFilter]);

  useEffect(() => {
    void loadQr();
    void loadClasses();
  }, [loadQr, loadClasses]);

  useEffect(() => {
    void loadParticipants();
  }, [loadParticipants]);

  const handleToggleQrActive = async () => {
    if (!qrData?.currentQr) return;
    const nextState = !qrData.currentQr.isActive;
    await apiFetch('/api/admin/qr', {
      method: 'PATCH',
      body: JSON.stringify({
        isActive: nextState,
        registrationEnabled: nextState,
      }),
    });
    setMsg(nextState ? 'QR Code ativado para inscrições!' : 'QR Code desativado!');
    await loadQr();
  };

  const handleSaveQrDates = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/admin/qr', {
      method: 'PATCH',
      body: JSON.stringify({
        registrationEnabled: true,
        validFrom: validFrom ? new Date(validFrom).toISOString() : null,
        validUntil: validUntil ? new Date(validUntil).toISOString() : null,
      }),
    });
    setMsg('Período de inscrições atualizado com sucesso!');
    await loadQr();
  };

  const handleRegenerateQr = async () => {
    const confirmed = window.confirm(
      'Regenerar o QR Code invalidará imediatamente o código anterior impresso. Deseja continuar?'
    );
    if (!confirmed) return;
    await apiFetch('/api/admin/qr/regenerate', {
      method: 'POST',
      body: JSON.stringify({
        label: 'QR Code Oficial Regenerado – SIPAT 2026 SENAI Morvan Figueiredo',
      }),
    });
    setMsg('Novo QR Code exclusivo gerado! Os códigos anteriores foram desativados.');
    await loadQr();
  };

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/admin/participants', {
      method: 'POST',
      body: JSON.stringify({
        fullName: manName,
        email: manEmail,
        registrationCode: manCode,
        classGroupId: manClassId,
        password: manPassword,
      }),
    });
    setShowManualModal(false);
    setManName('');
    setManEmail('');
    setManCode('');
    setMsg('Participante cadastrado manualmente com sucesso!');
    await loadParticipants();
  };

  const handleSpreadsheetImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await apiFetch<{
      imported: number;
      skippedDuplicates: number;
      errors: string[];
    }>('/api/admin/participants/import', {
      method: 'POST',
      body: fd,
    });
    setMsg(
      `Importação concluída: ${res.imported} novo(s) participante(s) importado(s), ${res.skippedDuplicates} duplicado(s) ignorado(s).`
    );
    e.target.value = '';
    await loadParticipants();
  };

  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;
    await apiFetch(`/api/admin/participants/${adjustTarget.id}/points`, {
      method: 'POST',
      body: JSON.stringify({
        delta: adjustDelta,
        reason: adjustReason,
      }),
    });
    setAdjustTarget(null);
    setAdjustReason('');
    setMsg('Pontuação ajustada e registrada no Log de Auditoria!');
    await loadParticipants();
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/admin/classes', {
      method: 'POST',
      body: JSON.stringify({
        code: clsCode,
        name: clsName,
        courseArea: clsArea,
        shift: clsShift,
      }),
    });
    setClsCode('');
    setClsName('');
    setMsg('Turma institucional adicionada com sucesso!');
    await loadClasses();
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-md p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'qr', label: 'QR Code & Período de Inscrições' },
            { id: 'participants', label: `Participantes (${participants.length})` },
            { id: 'classes', label: `Turmas (${classes.length})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setView(t.id as any)}
              className={`px-4 py-2 rounded text-xs font-bold uppercase cursor-pointer ${
                view === t.id ? 'bg-[#E30613] text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <div className="bg-blue-50 border border-blue-200 border-l-4 border-l-[#E30613] p-3 rounded text-xs text-slate-900 flex items-center justify-between">
          <span>{msg}</span>
          <button
            type="button"
            onClick={() => setMsg(null)}
            className="font-bold text-[#E30613] cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {view === 'qr' && qrData && (
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-6 flex flex-col items-center text-center">
            <div className="flex items-center gap-2 text-xs font-mono-tech uppercase text-[#E30613] font-bold mb-3">
              <QrCode size={16} />
              <span>CÓDIGO ATUAL: {qrData.currentQr?.code}</span>
            </div>

            <div className="p-4 border-2 border-[#E30613] rounded-md bg-white">
              <img
                src={qrData.qrDataUrl}
                alt="QR Code Oficial SIPAT 2026"
                className="w-56 h-56 object-contain"
              />
            </div>

            <div className="mt-3 text-xs text-slate-600">
              Leituras: <strong>{qrData.currentQr?.scansCount ?? 0}</strong> • Cadastros concluídos:{' '}
              <strong>{qrData.currentQr?.registrationsCount ?? 0}</strong>
            </div>

            <div className="w-full grid grid-cols-2 gap-2 mt-5">
              <button
                type="button"
                onClick={() =>
                  void downloadAuthenticatedFile(
                    '/api/admin/qr/download/png',
                    `qrcode-sipat2026-${qrData.currentQr?.code}.png`
                  )
                }
                className="inline-flex items-center justify-center gap-1.5 bg-[#E30613] hover:bg-[#C2040F] text-white text-xs font-bold py-2.5 px-3 rounded cursor-pointer"
              >
                <Download size={14} />
                <span>Baixar PNG</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  void downloadAuthenticatedFile(
                    '/api/admin/qr/download/pdf',
                    `cartaz-a4-sipat2026-${qrData.currentQr?.code}.pdf`
                  )
                }
                className="inline-flex items-center justify-center gap-1.5 bg-[#0F172A] hover:bg-slate-800 text-[#FFB800] text-xs font-bold py-2.5 px-3 rounded cursor-pointer"
              >
                <Download size={14} />
                <span>Baixar Cartaz PDF</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(qrData.registrationUrl);
                setMsg('Link de inscrição copiado para a área de transferência!');
              }}
              className="mt-2 w-full inline-flex items-center justify-center gap-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold py-2 px-3 rounded cursor-pointer"
            >
              <Copy size={14} />
              <span>Copiar Link Direto de Inscrição</span>
            </button>
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md p-6 space-y-5 text-xs">
            <h3 className="text-base font-bold text-[#0F172A]">
              Controle Operacional do QR Code e Período de Inscrições
            </h3>

            <div className="p-4 rounded border border-slate-200 bg-[#F8FAFC] flex items-center justify-between gap-4">
              <div>
                <div className="font-bold text-sm text-[#0F172A]">
                  Status do Código:{' '}
                  <span
                    className={
                      qrData.currentQr?.isActive ? 'text-emerald-700' : 'text-red-600'
                    }
                  >
                    {qrData.currentQr?.isActive ? 'ATIVO PARA INSCRIÇÕES' : 'DESATIVADO'}
                  </span>
                </div>
                <p className="text-slate-600 mt-0.5">
                  Você pode pausar novas inscrições a qualquer momento sem perder cadastros.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleToggleQrActive()}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded font-bold cursor-pointer ${
                  qrData.currentQr?.isActive
                    ? 'bg-red-600 text-white'
                    : 'bg-emerald-700 text-white'
                }`}
              >
                <Power size={14} />
                <span>{qrData.currentQr?.isActive ? 'Desativar Código' : 'Reativar Código'}</span>
              </button>
            </div>

            <form onSubmit={handleSaveQrDates} className="space-y-3 pt-2 border-t border-slate-200">
              <div className="font-bold text-slate-800 uppercase">
                Janela Programada de Inscrições
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Abertura das Inscrições</label>
                  <input
                    type="datetime-local"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Encerramento das Inscrições</label>
                  <input
                    type="datetime-local"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-2"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="bg-[#E30613] text-white font-bold px-4 py-2 rounded cursor-pointer"
              >
                Salvar Período de Inscrição
              </button>
            </form>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-4">
              <div>
                <div className="font-bold text-slate-800">Regenerar Código Exclusivo</div>
                <p className="text-slate-500">
                  Cria um novo token criptográfico e invalida imediatamente códigos anteriores.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleRegenerateQr()}
                className="inline-flex items-center gap-1.5 border border-amber-500 bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold px-3.5 py-2 rounded cursor-pointer shrink-0"
              >
                <RefreshCw size={14} />
                <span>Regenerar QR Code</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'participants' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-md p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nome, e-mail ou matrícula..."
                  className="border border-slate-300 rounded pl-8 pr-3 py-1.5 w-56"
                />
              </div>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="border border-slate-300 rounded px-3 py-1.5"
              >
                <option value="">Todas as Turmas</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.code}] {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  void downloadAuthenticatedFile(
                    '/api/admin/participants/template.xlsx',
                    'modelo-importacao-sipat2026.xlsx'
                  )
                }
                className="inline-flex items-center gap-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-3 py-2 rounded cursor-pointer"
              >
                <FileSpreadsheet size={14} />
                <span>Modelo Planilha</span>
              </button>

              <label className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold px-3.5 py-2 rounded cursor-pointer">
                <Upload size={14} />
                <span>Importar Planilha (.xlsx / .csv)</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleSpreadsheetImport}
                />
              </label>

              <button
                type="button"
                onClick={() => setShowManualModal(true)}
                className="inline-flex items-center gap-1.5 bg-[#E30613] hover:bg-[#C2040F] text-white font-bold px-3.5 py-2 rounded cursor-pointer"
              >
                <Plus size={14} />
                <span>Cadastro Manual</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-md overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase font-mono-tech text-slate-500">
                <tr>
                  <th className="py-3 px-4">Participante</th>
                  <th className="py-3 px-4">Matrícula / E-mail</th>
                  <th className="py-3 px-4">Turma</th>
                  <th className="py-3 px-4">Atividades</th>
                  <th className="py-3 px-4">Pontos</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {participants.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {p.fullName}
                      {p.isMinor && (
                        <span className="ml-2 text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-mono-tech">
                          MENOR
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono-tech text-slate-600">
                      <div>{p.registrationCode || '-'}</div>
                      <div className="text-[11px] text-slate-400">{p.email}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {p.classGroup ? `[${p.classGroup.code}] ${p.classGroup.name}` : '-'}
                    </td>
                    <td className="py-3 px-4 font-mono-tech">
                      {p.submissionsCount} missões • {p.quizAttemptsCount} quizzes
                    </td>
                    <td className="py-3 px-4 font-mono-tech font-bold text-[#E30613]">
                      {p.totalPoints} pts
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setAdjustTarget(p);
                          setAdjustDelta(20);
                          setAdjustReason('');
                        }}
                        className="inline-flex items-center gap-1 border border-slate-300 hover:bg-slate-100 px-2.5 py-1 rounded font-semibold cursor-pointer"
                      >
                        <Sliders size={12} />
                        <span>Ajustar Pontos</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'classes' && (
        <div className="grid lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase font-mono-tech text-slate-500">
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Turma / Curso</th>
                  <th className="py-3 px-4">Turno</th>
                  <th className="py-3 px-4">Inscritos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {classes.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 px-4 font-mono-tech font-bold text-[#E30613]">{c.code}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{c.name}</div>
                      <div className="text-slate-500">{c.courseArea}</div>
                    </td>
                    <td className="py-3 px-4">{c.shift}</td>
                    <td className="py-3 px-4 font-mono-tech font-bold">{c._count?.users ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form
            onSubmit={handleCreateClass}
            className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-5 space-y-3 text-xs h-fit"
          >
            <h3 className="font-bold text-sm text-[#0F172A]">Cadastrar Nova Turma / Setor</h3>
            <div>
              <label className="block font-semibold mb-1">Código da Turma *</label>
              <input
                required
                value={clsCode}
                onChange={(e) => setClsCode(e.target.value)}
                placeholder="Ex: TEC-MEC-2N"
                className="w-full border border-slate-300 rounded px-3 py-2 font-mono-tech uppercase"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Nome Completo da Turma *</label>
              <input
                required
                value={clsName}
                onChange={(e) => setClsName(e.target.value)}
                placeholder="Ex: Técnico em Mecânica - 2º Termo (Noite)"
                className="w-full border border-slate-300 rounded px-3 py-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Área Tecnológica</label>
                <input
                  required
                  value={clsArea}
                  onChange={(e) => setClsArea(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Turno</label>
                <select
                  value={clsShift}
                  onChange={(e) => setClsShift(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2"
                >
                  <option>Manhã</option>
                  <option>Tarde</option>
                  <option>Noite</option>
                  <option>Integral</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-[#E30613] text-white font-bold py-2.5 rounded cursor-pointer"
            >
              Salvar Turma
            </button>
          </form>
        </div>
      )}

      {/* Modal Cadastro Manual */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateManual}
            className="bg-white border border-slate-300 rounded-md max-w-md w-full p-6 space-y-3 text-xs"
          >
            <h3 className="text-base font-bold text-[#0F172A]">Cadastro Manual de Participante</h3>
            <input
              required
              value={manName}
              onChange={(e) => setManName(e.target.value)}
              placeholder="Nome completo *"
              className="w-full border border-slate-300 rounded px-3 py-2"
            />
            <input
              required
              type="email"
              value={manEmail}
              onChange={(e) => setManEmail(e.target.value)}
              placeholder="E-mail *"
              className="w-full border border-slate-300 rounded px-3 py-2"
            />
            <input
              required
              value={manCode}
              onChange={(e) => setManCode(e.target.value)}
              placeholder="Matrícula / RA *"
              className="w-full border border-slate-300 rounded px-3 py-2 font-mono-tech uppercase"
            />
            <select
              value={manClassId}
              onChange={(e) => setManClassId(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.code}] {c.name}
                </option>
              ))}
            </select>
            <input
              required
              minLength={6}
              value={manPassword}
              onChange={(e) => setManPassword(e.target.value)}
              placeholder="Senha inicial *"
              className="w-full border border-slate-300 rounded px-3 py-2"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="px-4 py-2 border border-slate-300 rounded cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#E30613] text-white font-bold rounded cursor-pointer"
              >
                Cadastrar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Ajuste Manual de Pontos com Auditoria Obrigatória */}
      {adjustTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 flex items-center justify-center p-4">
          <form
            onSubmit={handleAdjustPoints}
            className="bg-white border border-slate-300 rounded-md max-w-md w-full p-6 space-y-3 text-xs"
          >
            <h3 className="text-base font-bold text-[#0F172A]">
              Ajuste Manual de Pontuação (Auditado)
            </h3>
            <p className="text-slate-600">
              Participante: <strong>{adjustTarget.fullName}</strong> (Saldo atual:{' '}
              {adjustTarget.totalPoints} pts)
            </p>
            <div>
              <label className="block font-bold mb-1">
                Quantidade de Pontos (positivo p/ somar ou negativo p/ deduzir) *
              </label>
              <input
                type="number"
                required
                value={adjustDelta}
                onChange={(e) => setAdjustDelta(Number(e.target.value))}
                className="w-full border border-slate-300 rounded px-3 py-2 font-mono-tech font-bold"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">
                Justificativa Obrigatória para Registro de Auditoria *
              </label>
              <textarea
                required
                minLength={5}
                rows={3}
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Ex: Bonificação de destaque presencial na palestra de abertura CIPA..."
                className="w-full border border-slate-300 rounded px-3 py-2"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdjustTarget(null)}
                className="px-4 py-2 border border-slate-300 rounded cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#E30613] text-white font-bold rounded cursor-pointer"
              >
                Registrar e Auditar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

