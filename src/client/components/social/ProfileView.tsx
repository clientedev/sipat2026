import React, { useEffect, useState } from 'react';
import { ArrowLeft, Camera, Heart, Pencil, Trophy } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { BadgeIcon } from '../BadgeIcon';
import { Avatar } from './Avatar';
import { PostCard } from './PostCard';
import { SocialAuthor, SocialPost } from './types';

interface ProfileData {
  profile: SocialAuthor & {
    bio: string | null;
    totalPoints: number;
    rankPosition: number;
    levelProgressPercent: number;
    nextLevelPoints: number | null;
    approvedActivities: number;
    completedQuizzes: number;
    likesReceived: number;
    memberSince: string;
    isSelf: boolean;
    badges: Array<{ slug: string; name: string; description: string; iconName: string; accentColor: string; awardedAt: string }>;
  };
  posts: SocialPost[];
}

interface ProfileViewProps {
  userId: string;
  onOpenProfile: (id: string) => void;
  onBack?: () => void;
  /** Conteúdo extra mostrado apenas no próprio perfil (extrato, privacidade, certificado) */
  ownExtras?: React.ReactNode;
  onAvatarChange?: (file: File) => Promise<void>;
  refreshKey?: number;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  userId,
  onOpenProfile,
  onBack,
  ownExtras,
  onAvatarChange,
  refreshKey = 0,
}) => {
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState('');

  useEffect(() => {
    setData(null);
    setError(null);
    apiFetch<ProfileData>(`/api/social/profiles/${userId}`)
      .then((d) => {
        setData(d);
        setBioDraft(d.profile.bio || '');
      })
      .catch((e) => setError(e?.message || 'Perfil indisponível.'));
  }, [userId, refreshKey]);

  if (error) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-sm text-slate-600">
        {error}
        {onBack && (
          <button type="button" onClick={onBack} className="block mx-auto mt-3 text-[#E30613] font-bold cursor-pointer">
            Voltar
          </button>
        )}
      </div>
    );
  }
  if (!data) return <div className="bg-white border border-slate-200 rounded-xl h-72 animate-pulse" />;

  const p = data.profile;

  const saveBio = async () => {
    await apiFetch('/api/auth/profile', { method: 'PATCH', body: JSON.stringify({ bio: bioDraft }) });
    setData({ ...data, profile: { ...p, bio: bioDraft.trim() || null } });
    setEditingBio(false);
  };

  const patchPost = (patch: Partial<SocialPost> & { id: string }) =>
    setData((d) => (d ? { ...d, posts: d.posts.map((x) => (x.id === patch.id ? { ...x, ...patch } : x)) } : d));

  return (
    <div className="space-y-4">
      {onBack && (
        <button type="button" onClick={onBack} className="text-sm font-semibold text-slate-600 flex items-center gap-1 cursor-pointer">
          <ArrowLeft size={16} /> Voltar
        </button>
      )}

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="h-20 bg-[#1E293B] safety-hazard-bar opacity-90" />
        <div className="px-5 pb-5 -mt-10">
          <div className="flex items-end justify-between gap-3">
            <div className="relative">
              <Avatar size="xl" name={p.fullName} initials={p.initials} url={p.avatarUrl} />
              {p.isSelf && onAvatarChange && (
                <label className="absolute bottom-0 right-0 bg-[#E30613] text-white p-1.5 rounded-full cursor-pointer shadow" title="Trocar foto">
                  <Camera size={14} />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void onAvatarChange(f);
                    }}
                  />
                </label>
              )}
            </div>
            <div className="text-right pb-1">
              <div className="text-2xl font-extrabold text-[#E30613] tabular-nums">{p.totalPoints}</div>
              <div className="text-[11px] uppercase font-bold text-slate-500">pontos</div>
            </div>
          </div>

          <h1 className="text-xl font-bold text-[#1E293B] mt-2">{p.fullName}</h1>
          <p className="text-sm text-slate-600">
            {p.classGroup ? `${p.classGroup.name} (${p.classGroup.code})` : 'Participante da SIPAT'}
          </p>
          <span className="inline-block mt-1.5 text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-red-50 text-[#E30613] border border-red-200">
            Nível {p.level} • {p.levelTitle}
          </span>

          {editingBio ? (
            <div className="mt-3 space-y-2">
              <textarea
                value={bioDraft}
                onChange={(e) => setBioDraft(e.target.value)}
                maxLength={160}
                rows={2}
                placeholder="Conte em uma frase quem você é (curso, interesses...)"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#E30613]"
              />
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">{bioDraft.length}/160</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditingBio(false)} className="px-3 py-1.5 border border-slate-300 rounded cursor-pointer">
                    Cancelar
                  </button>
                  <button type="button" onClick={saveBio} className="px-3 py-1.5 bg-[#E30613] text-white font-bold rounded cursor-pointer">
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-700 mt-3">
              {p.bio || (p.isSelf ? <span className="text-slate-400">Adicione uma frase sobre você.</span> : null)}
              {p.isSelf && (
                <button
                  type="button"
                  onClick={() => setEditingBio(true)}
                  className="ml-2 text-xs text-[#E30613] font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Pencil size={11} /> Editar
                </button>
              )}
            </p>
          )}

          {/* Progresso de nível */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span>Próximo nível</span>
              <span className="font-semibold text-[#E30613]">
                {p.nextLevelPoints ? `${p.totalPoints} / ${p.nextLevelPoints} pts` : 'Nível máximo!'}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#E30613]" style={{ width: `${p.levelProgressPercent}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mt-4 text-center">
            {[
              { v: `${p.rankPosition}º`, l: 'ranking', icon: <Trophy size={12} /> },
              { v: p.approvedActivities, l: 'atividades' },
              { v: p.completedQuizzes, l: 'quizzes' },
              { v: p.likesReceived, l: 'curtidas', icon: <Heart size={12} /> },
            ].map((s) => (
              <div key={s.l} className="bg-slate-50 border border-slate-200 rounded-lg py-2">
                <div className="font-extrabold text-[#1E293B] tabular-nums">{s.v}</div>
                <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center justify-center gap-0.5">
                  {s.icon}
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-4">
        <h2 className="font-bold text-sm text-[#1E293B] mb-3">Medalhas ({p.badges.length})</h2>
        {p.badges.length === 0 ? (
          <p className="text-xs text-slate-500">Nenhuma medalha ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {p.badges.map((b) => (
              <div key={b.slug} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg pr-3" title={b.description}>
                <BadgeIcon iconName={b.iconName} accentColor={b.accentColor} size="sm" />
                <span className="text-xs font-bold text-[#1E293B]">{b.name}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {p.isSelf && ownExtras}

      <section className="space-y-3">
        <h2 className="font-bold text-sm text-[#1E293B]">
          {p.isSelf ? 'Minhas publicações' : 'Publicações'} ({data.posts.length})
        </h2>
        {data.posts.length === 0 ? (
          <p className="text-xs text-slate-500 bg-white border border-slate-200 rounded-xl p-5 text-center">
            {p.isSelf
              ? 'Suas atividades aprovadas aparecem aqui e no mural da escola.'
              : 'Nenhuma publicação no mural ainda.'}
          </p>
        ) : (
          data.posts.map((post) => (
            <PostCard key={post.id} post={post} onOpenProfile={onOpenProfile} onChange={patchPost} showVisibilityToggle={p.isSelf} />
          ))
        )}
      </section>
    </div>
  );
};
