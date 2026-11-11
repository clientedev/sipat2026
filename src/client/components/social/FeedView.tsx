import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, School, Users } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { getRealtimeSocket } from '../../lib/socket';
import { AchievementCard, PostCard } from './PostCard';
import { FeedItem, SocialPost } from './types';

interface FeedViewProps {
  onOpenProfile: (userId: string) => void;
  /** Bloco exibido no topo (ex.: atalho para participar de atividades) */
  header?: React.ReactNode;
  /** Abre os comentários desta publicação (vindo de uma notificação) */
  focusPostId?: string | null;
  hasClass?: boolean;
}

export const FeedView: React.FC<FeedViewProps> = ({ onOpenProfile, header, focusPostId, hasClass = true }) => {
  const [scope, setScope] = useState<'all' | 'class'>('all');
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNews, setHasNews] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const focusRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(
    async (opts?: { more?: boolean }) => {
      const more = Boolean(opts?.more);
      more ? setLoadingMore(true) : setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({ scope });
        if (more && cursor) qs.set('before', cursor);
        const res = await apiFetch<{ items: FeedItem[]; nextCursor: string | null }>(`/api/social/feed?${qs}`);
        setItems((prev) => {
          if (!more) return res.items;
          const seen = new Set(prev.map((i) => i.id));
          return [...prev, ...res.items.filter((i) => !seen.has(i.id))];
        });
        setCursor(res.nextCursor);
        if (!more) setHasNews(false);
      } catch (e: any) {
        setError(e?.message || 'Não foi possível carregar o mural.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [scope, cursor]
  );

  // Recarrega ao trocar o escopo (escola x minha turma)
  useEffect(() => {
    setCursor(null);
    void (async () => {
      setLoading(true);
      try {
        const res = await apiFetch<{ items: FeedItem[]; nextCursor: string | null }>(`/api/social/feed?scope=${scope}`);
        setItems(res.items);
        setCursor(res.nextCursor);
        setHasNews(false);
      } catch (e: any) {
        setError(e?.message || 'Não foi possível carregar o mural.');
      } finally {
        setLoading(false);
      }
    })();
  }, [scope]);

  // Tempo real: contadores atualizam sozinhos; publicações novas mostram um aviso
  useEffect(() => {
    const socket = getRealtimeSocket();
    const onUpdated = (p: { postId: string; likesCount?: number; commentsCount?: number }) => {
      setItems((prev) =>
        prev.map((it) =>
          it.kind === 'POST' && it.id === p.postId
            ? {
                ...it,
                ...(p.likesCount !== undefined ? { likesCount: p.likesCount } : {}),
                ...(p.commentsCount !== undefined ? { commentsCount: p.commentsCount } : {}),
              }
            : it
        )
      );
    };
    const onChanged = () => setHasNews(true);
    socket.on('social:post-updated', onUpdated);
    socket.on('social:feed-changed', onChanged);
    socket.on('badge:unlocked', onChanged);
    return () => {
      socket.off('social:post-updated', onUpdated);
      socket.off('social:feed-changed', onChanged);
      socket.off('badge:unlocked', onChanged);
    };
  }, []);

  useEffect(() => {
    if (focusPostId && focusRef.current) focusRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusPostId, items.length]);

  const patchPost = (patch: Partial<SocialPost> & { id: string }) =>
    setItems((prev) => prev.map((it) => (it.kind === 'POST' && it.id === patch.id ? { ...it, ...patch } : it)));

  const removePost = (id: string) => setItems((prev) => prev.filter((it) => it.id !== id));

  return (
    <div className="space-y-4">
      {header}

      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex bg-white border border-slate-200 rounded-full p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setScope('all')}
            className={`px-3.5 py-1.5 rounded-full flex items-center gap-1.5 cursor-pointer ${
              scope === 'all' ? 'bg-[#1E293B] text-white' : 'text-slate-600'
            }`}
          >
            <School size={14} /> Escola toda
          </button>
          {hasClass && (
            <button
              type="button"
              onClick={() => setScope('class')}
              className={`px-3.5 py-1.5 rounded-full flex items-center gap-1.5 cursor-pointer ${
                scope === 'class' ? 'bg-[#1E293B] text-white' : 'text-slate-600'
              }`}
            >
              <Users size={14} /> Minha turma
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="text-xs font-semibold text-slate-600 hover:text-[#1E293B] flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw size={13} /> Atualizar
        </button>
      </div>

      {hasNews && (
        <button
          type="button"
          onClick={() => void load()}
          className="w-full bg-[#E30613] text-white text-xs font-bold py-2 rounded-full shadow-sm cursor-pointer"
        >
          Há novidades no mural — toque para ver
        </button>
      )}

      {error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-3">{error}</p>}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl h-40 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center">
          <p className="font-bold text-[#1E293B]">O mural ainda está vazio</p>
          <p className="text-sm text-slate-600 mt-1">
            Quando uma participação em atividade for aprovada pela equipe, ela aparece aqui para todos curtirem e
            comentarem.
          </p>
        </div>
      ) : (
        <>
          {items.map((it) =>
            it.kind === 'POST' ? (
              <div key={it.id} ref={it.id === focusPostId ? focusRef : undefined}>
                <PostCard
                  post={it}
                  onOpenProfile={onOpenProfile}
                  onChange={patchPost}
                  onRemoved={removePost}
                  autoOpenComments={it.id === focusPostId}
                />
              </div>
            ) : (
              <AchievementCard key={it.id} item={it} onOpenProfile={onOpenProfile} />
            )
          )}
          {cursor && (
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => void load({ more: true })}
              className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-sm font-semibold py-2.5 rounded-xl cursor-pointer"
            >
              {loadingMore ? 'Carregando...' : 'Ver publicações anteriores'}
            </button>
          )}
        </>
      )}
    </div>
  );
};
