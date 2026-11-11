import React, { useEffect, useState } from 'react';
import { Medal, Trophy, Users } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { getRealtimeSocket } from '../../lib/socket';
import { Avatar } from './Avatar';

interface RankRow {
  position: number;
  userId: string;
  displayName: string;
  initials: string;
  avatarUrl: string | null;
  totalPoints: number;
  level: number;
  levelTitle: string;
  completedActivities: number;
  badgesCount: number;
  classGroup: { id: string; code: string; name: string } | null;
}
interface ClassRow {
  position: number;
  id: string;
  code: string;
  name: string;
  participantsCount: number;
  totalPoints: number;
  averagePoints: number;
}

export const RankingView: React.FC<{ onOpenProfile: (id: string) => void }> = ({ onOpenProfile }) => {
  const [mode, setMode] = useState<'individual' | 'myclass' | 'classes'>('individual');
  const [data, setData] = useState<{ individual: RankRow[]; classes: ClassRow[]; me: RankRow | null; myClassId: string | null } | null>(null);

  const load = () =>
    apiFetch('/api/social/ranking')
      .then(setData)
      .catch(() => {});

  useEffect(() => {
    void load();
    const socket = getRealtimeSocket();
    const on = () => void load();
    socket.on('ranking:updated', on);
    socket.on('points:updated', on);
    return () => {
      socket.off('ranking:updated', on);
      socket.off('points:updated', on);
    };
  }, []);

  if (!data) return <div className="bg-white border border-slate-200 rounded-xl h-64 animate-pulse" />;

  const rows =
    mode === 'myclass' ? data.individual.filter((r) => r.classGroup?.id === data.myClassId) : data.individual;

  const medalColor = (p: number) => (p === 1 ? '#D4A017' : p === 2 ? '#94A3B8' : p === 3 ? '#B45309' : null);

  return (
    <div className="space-y-4">
      {data.me && (
        <div className="bg-[#1E293B] text-white rounded-xl p-4 flex items-center gap-4">
          <div className="text-3xl font-extrabold tabular-nums text-[#FFB800]">{data.me.position}º</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wide text-slate-300">Sua posição na escola</div>
            <div className="font-bold">{data.me.totalPoints} pontos • Nível {data.me.level} ({data.me.levelTitle})</div>
          </div>
          <Trophy className="text-[#FFB800] shrink-0" />
        </div>
      )}

      <div className="inline-flex bg-white border border-slate-200 rounded-full p-1 text-xs font-bold">
        {[
          { id: 'individual', label: 'Escola' },
          ...(data.myClassId ? [{ id: 'myclass', label: 'Minha turma' }] : []),
          { id: 'classes', label: 'Turmas' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setMode(t.id as any)}
            className={`px-3.5 py-1.5 rounded-full cursor-pointer ${mode === t.id ? 'bg-[#1E293B] text-white' : 'text-slate-600'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {mode === 'classes' ? (
        <ol className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {data.classes.map((c) => (
            <li
              key={c.id}
              className={`flex items-center gap-3 px-4 py-3 ${c.id === data.myClassId ? 'bg-red-50/60' : ''}`}
            >
              <span className="w-8 text-center font-extrabold tabular-nums text-slate-700">{c.position}º</span>
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <Users size={16} className="text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-[#1E293B] truncate">{c.name}</div>
                <div className="text-[11px] text-slate-500 font-mono-tech">
                  {c.code} • {c.participantsCount} aluno(s) • média {c.averagePoints} pts
                </div>
              </div>
              <span className="font-extrabold text-[#E30613] tabular-nums">{c.totalPoints}</span>
            </li>
          ))}
        </ol>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-xl p-6 text-center">
          Ninguém pontuou ainda. As primeiras atividades aprovadas aparecem aqui.
        </p>
      ) : (
        <ol className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {rows.map((r, idx) => {
            const pos = mode === 'myclass' ? idx + 1 : r.position;
            const mc = medalColor(pos);
            const isMe = r.userId === data.me?.userId;
            return (
              <li key={r.userId}>
                <button
                  type="button"
                  onClick={() => onOpenProfile(r.userId)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 cursor-pointer ${isMe ? 'bg-red-50/60' : ''}`}
                >
                  <span className="w-8 text-center font-extrabold tabular-nums text-slate-700">
                    {mc ? <Medal size={20} style={{ color: mc }} className="mx-auto" /> : `${pos}º`}
                  </span>
                  <Avatar size="sm" name={r.displayName} initials={r.initials} url={r.avatarUrl} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-[#1E293B] truncate">
                      {r.displayName} {isMe && <span className="text-[#E30613]">(você)</span>}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {r.classGroup?.code || 'Sem turma'} • Nível {r.level} • {r.completedActivities} atividade(s) • {r.badgesCount} medalha(s)
                    </div>
                  </div>
                  <span className="font-extrabold text-[#E30613] tabular-nums">{r.totalPoints}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};
