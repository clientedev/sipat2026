export interface SocialAuthor {
  id: string;
  fullName: string;
  initials: string;
  avatarUrl: string | null;
  level: number;
  levelTitle: string;
  classGroup: { code: string; name: string } | null;
}

export interface SocialPost {
  id: string;
  kind: 'POST';
  author: SocialAuthor;
  activity: { id: string; title: string; category: string; eventDay: number; eventDateLabel: string };
  text: string;
  details: Array<{ label: string; value: string }>;
  teamName: string | null;
  media: { url: string; isVideo: boolean } | null;
  awardedPoints: number;
  evaluatorFeedback: string | null;
  likesCount: number;
  commentsCount: number;
  likedByMe: boolean;
  isMine: boolean;
  canModerate: boolean;
  isPublicHighlight: boolean;
  createdAt: string;
  shareToFeed?: boolean;
  hiddenFromFeed?: boolean;
}

export interface SocialAchievement {
  id: string;
  kind: 'ACHIEVEMENT';
  author: SocialAuthor;
  badge: { name: string; description: string; iconName: string; accentColor: string };
  createdAt: string;
}

export type FeedItem = SocialPost | SocialAchievement;

export interface SocialComment {
  id: string;
  body: string;
  createdAt: string;
  author: SocialAuthor;
  canDelete: boolean;
}

export function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
