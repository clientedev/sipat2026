import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  EyeOff,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
  Star,
  Trash2,
  Users,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { BadgeIcon } from '../BadgeIcon';
import { Avatar } from './Avatar';
import { SocialAchievement, SocialComment, SocialPost, timeAgo } from './types';

interface PostCardProps {
  post: SocialPost;
  onOpenProfile: (userId: string) => void;
  onChange: (patch: Partial<SocialPost> & { id: string }) => void;
  onRemoved?: (postId: string) => void;
  autoOpenComments?: boolean;
  /** No próprio perfil o autor pode tirar/colocar a publicação no mural */
  showVisibilityToggle?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onOpenProfile,
  onChange,
  onRemoved,
  autoOpenComments = false,
  showVisibilityToggle = false,
}) => {
  const [commentsOpen, setCommentsOpen] = useState(autoOpenComments);
  const [comments, setComments] = useState<SocialComment[] | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadComments = async () => {
    try {
      const res = await apiFetch<{ comments: SocialComment[] }>(`/api/social/posts/${post.id}/comments`);
      setComments(res.comments);
    } catch (e: any) {
      setError(e?.message || 'Não foi possível carregar os comentários.');
    }
  };

  React.useEffect(() => {
    if (autoOpenComments) void loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenComments]);

  const toggleComments = () => {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next && comments === null) void loadComments();
  };

  const toggleLike = async () => {
    // Atualização otimista: a curtida aparece na hora
    const optimistic = !post.likedByMe;
    onChange({ id: post.id, likedByMe: optimistic, likesCount: post.likesCount + (optimistic ? 1 : -1) });
    try {
      const res = await apiFetch<{ liked: boolean; likesCount: number }>(`/api/social/posts/${post.id}/like`, {
        method: 'POST',
      });
      onChange({ id: post.id, likedByMe: res.liked, likesCount: res.likesCount });
    } catch (e: any) {
      onChange({ id: post.id, likedByMe: post.likedByMe, likesCount: post.likesCount });
      setError(e?.message || 'Não foi possível curtir agora.');
    }
  };

  const sendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ comment: SocialComment; commentsCount: number }>(
        `/api/social/posts/${post.id}/comments`,
        { method: 'POST', body: JSON.stringify({ body: draft.trim() }) }
      );
      setComments((prev) => [...(prev || []), res.comment]);
      onChange({ id: post.id, commentsCount: res.commentsCount });
      setDraft('');
    } catch (e: any) {
      setError(e?.message || 'Não foi possível comentar.');
    } finally {
      setBusy(false);
    }
  };

  const removeComment = async (id: string) => {
    if (!window.confirm('Remover este comentário?')) return;
    try {
      const res = await apiFetch<{ commentsCount: number }>(`/api/social/comments/${id}`, { method: 'DELETE' });
      setComments((prev) => (prev || []).filter((c) => c.id !== id));
      onChange({ id: post.id, commentsCount: res.commentsCount });
    } catch (e: any) {
      setError(e?.message || 'Não foi possível remover.');
    }
  };

  const moderate = async () => {
    setMenuOpen(false);
    const reason = window.prompt('Ocultar esta publicação do mural? Informe o motivo (fica registrado na auditoria):');
    if (reason === null) return;
    try {
      await apiFetch(`/api/social/posts/${post.id}/moderate`, {
        method: 'POST',
        body: JSON.stringify({ hidden: true, reason }),
      });
      onRemoved?.(post.id);
    } catch (e: any) {
      setError(e?.message || 'Falha ao moderar.');
    }
  };

  const toggleVisibility = async () => {
    const next = !(post.shareToFeed ?? true);
    try {
      await apiFetch(`/api/social/posts/${post.id}/visibility`, {
        method: 'PATCH',
        body: JSON.stringify({ shareToFeed: next }),
      });
      onChange({ id: post.id, shareToFeed: next });
    } catch (e: any) {
      setError(e?.message || 'Falha ao alterar visibilidade.');
    }
  };

  const author = post.author;

  return (
    <article className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
      {/* Cabeçalho: autor e atividade */}
      <header className="flex items-start gap-3 p-4 pb-3">
        <Avatar name={author.fullName} initials={author.initials} url={author.avatarUrl} onClick={() => onOpenProfile(author.id)} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 text-sm leading-tight">
            <button
              type="button"
              onClick={() => onOpenProfile(author.id)}
              className="font-bold text-[#1E293B] hover:underline cursor-pointer"
            >
              {author.fullName}
            </button>
            <span className="text-slate-500">concluiu</span>
            <span className="font-semibold text-[#1E293B]">{post.activity.title}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-1.5">
            {author.classGroup && <span className="font-mono-tech">{author.classGroup.code}</span>}
            {author.classGroup && <span>•</span>}
            <span>Nível {author.level}</span>
            <span>•</span>
            <span>{timeAgo(post.createdAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold px-2 py-0.5 rounded-full font-mono-tech">
            +{post.awardedPoints} pts
          </span>
          {post.canModerate && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="p-1 rounded hover:bg-slate-100 text-slate-500 cursor-pointer"
                aria-label="Opções de moderação"
              >
                <MoreHorizontal size={18} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-1 w-52 bg-white border border-slate-200 rounded-md shadow-lg z-20 text-xs">
                  <button
                    type="button"
                    onClick={moderate}
                    className="w-full text-left px-3 py-2.5 hover:bg-red-50 text-red-700 flex items-center gap-2 cursor-pointer"
                  >
                    <EyeOff size={14} /> Ocultar do mural
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Conteúdo */}
      <div className="px-4 pb-3 space-y-2.5">
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wide bg-red-50 text-[#E30613] border border-red-100 px-2 py-0.5 rounded">
            {post.activity.category}
          </span>
          <span className="text-[10px] font-mono-tech bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
            Dia {post.activity.eventDay} • {post.activity.eventDateLabel}
          </span>
          {post.teamName && (
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded inline-flex items-center gap-1">
              <Users size={11} /> {post.teamName}
            </span>
          )}
          {post.isPublicHighlight && (
            <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded inline-flex items-center gap-1">
              <Star size={11} /> Destaque da SIPAT
            </span>
          )}
        </div>

        {post.text && <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">{post.text}</p>}

        {post.details.length > 0 && (
          <dl className="grid gap-1 text-xs bg-slate-50 border border-slate-200 rounded-md p-2.5">
            {post.details.map((d) => (
              <div key={d.label} className="flex gap-1.5">
                <dt className="font-bold text-slate-600 shrink-0">{d.label}:</dt>
                <dd className="text-slate-700">{d.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {post.media && (
        <div className="bg-slate-900">
          {post.media.isVideo ? (
            <video src={post.media.url} controls preload="metadata" className="w-full max-h-[480px] bg-black" />
          ) : (
            <img src={post.media.url} alt={`Registro de ${author.fullName}`} loading="lazy" className="w-full max-h-[520px] object-contain" />
          )}
        </div>
      )}

      {post.evaluatorFeedback && (
        <div className="mx-4 mt-3 text-xs bg-emerald-50/70 border border-emerald-200 rounded-md p-2.5 text-emerald-900 flex gap-2">
          <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-emerald-700" />
          <span>
            <strong>Avaliação da equipe:</strong> {post.evaluatorFeedback}
          </span>
        </div>
      )}

      {/* Ações sociais */}
      <div className="px-4 pt-3 pb-1 flex items-center justify-between text-xs text-slate-500">
        <span>{post.likesCount > 0 ? `${post.likesCount} curtida${post.likesCount > 1 ? 's' : ''}` : 'Seja o primeiro a curtir'}</span>
        <button type="button" onClick={toggleComments} className="hover:underline cursor-pointer">
          {post.commentsCount} comentário{post.commentsCount === 1 ? '' : 's'}
        </button>
      </div>
      <div className="mx-4 border-t border-slate-100 grid grid-cols-2 py-1">
        <button
          type="button"
          onClick={toggleLike}
          className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-semibold cursor-pointer transition-colors ${
            post.likedByMe ? 'text-[#E30613]' : 'text-slate-600 hover:bg-slate-50'
          }`}
          aria-pressed={post.likedByMe}
        >
          <Heart size={18} fill={post.likedByMe ? '#E30613' : 'none'} />
          Curtir
        </button>
        <button
          type="button"
          onClick={toggleComments}
          className="flex items-center justify-center gap-2 py-2 rounded-md text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
        >
          <MessageCircle size={18} />
          Comentar
        </button>
      </div>

      {showVisibilityToggle && post.isMine && (
        <div className="mx-4 mb-3 text-xs flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
          <span className="text-slate-600">
            {post.hiddenFromFeed
              ? 'Ocultada do mural pela equipe da SIPAT.'
              : post.shareToFeed === false
              ? 'Só você vê esta publicação.'
              : 'Visível no mural da escola.'}
          </span>
          {!post.hiddenFromFeed && (
            <button type="button" onClick={toggleVisibility} className="font-bold text-[#E30613] hover:underline cursor-pointer">
              {post.shareToFeed === false ? 'Publicar no mural' : 'Retirar do mural'}
            </button>
          )}
        </div>
      )}

      {error && <p className="mx-4 mb-2 text-xs text-red-700">{error}</p>}

      {/* Comentários */}
      {commentsOpen && (
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 space-y-3">
          {comments === null ? (
            <p className="text-xs text-slate-500">Carregando comentários...</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-slate-500">Nenhum comentário ainda. Diga algo para incentivar!</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-2">
                <Avatar size="xs" name={c.author.fullName} initials={c.author.initials} url={c.author.avatarUrl} onClick={() => onOpenProfile(c.author.id)} />
                <div className="min-w-0 flex-1">
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-3 py-2">
                    <button
                      type="button"
                      onClick={() => onOpenProfile(c.author.id)}
                      className="text-xs font-bold text-[#1E293B] hover:underline cursor-pointer"
                    >
                      {c.author.fullName}
                    </button>
                    <p className="text-sm text-slate-800 whitespace-pre-line break-words">{c.body}</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5 pl-2">
                    <span>{timeAgo(c.createdAt)}</span>
                    {c.canDelete && (
                      <button
                        type="button"
                        onClick={() => removeComment(c.id)}
                        className="inline-flex items-center gap-1 hover:text-red-700 cursor-pointer"
                      >
                        <Trash2 size={11} /> Remover
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          <form onSubmit={sendComment} className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={400}
              placeholder="Escreva um comentário respeitoso..."
              className="flex-1 bg-white border border-slate-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-[#E30613]"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="p-2.5 rounded-full bg-[#E30613] disabled:bg-slate-300 text-white cursor-pointer"
              aria-label="Enviar comentário"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </article>
  );
};

export const AchievementCard: React.FC<{ item: SocialAchievement; onOpenProfile: (id: string) => void }> = ({
  item,
  onOpenProfile,
}) => (
  <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 shadow-2xs">
    <BadgeIcon iconName={item.badge.iconName} accentColor={item.badge.accentColor} size="md" />
    <div className="min-w-0 flex-1 text-sm">
      <button
        type="button"
        onClick={() => onOpenProfile(item.author.id)}
        className="font-bold text-[#1E293B] hover:underline cursor-pointer"
      >
        {item.author.fullName}
      </button>{' '}
      <span className="text-slate-600">conquistou a medalha</span>{' '}
      <strong className="text-[#1E293B]">{item.badge.name}</strong>
      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
        <Award size={11} /> {item.badge.description} • {timeAgo(item.createdAt)}
      </div>
    </div>
  </div>
);
