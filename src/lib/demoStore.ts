import "server-only";
import type { Analysis, AnalysisType, OccasionId } from "@/types/domain";
import { isBlockedBetween, setBlockHistory } from "@/lib/community/blockState";

// In-memory store for analyses/posts created during a demo-mode session
// (no real database). Kept on `globalThis` so it survives Next.js dev hot
// reloads within the same server process; resets on server restart.

interface DemoCreatedAnalysis {
  id: string;
  occasionId: OccasionId;
  photoDataUrl: string | null;
  analysisType: AnalysisType | null;
  validityStatus: "pending" | "valid" | "partial" | "invalid";
  overallScore: number | null;
  styleDescriptors: string[];
  categories: Analysis["categories"];
  feedback: Analysis["feedback"];
  createdAt: string;
}

interface DemoCreatedPost {
  id: string;
  analysisId: string;
  caption: string | null;
  createdAt: string;
  reactions: Map<string, "like" | "dislike">;
  comments: { id: string; body: string; createdAt: string }[];
}

export interface DemoCommentReport {
  id: string;
  commentId: string;
  categoryId: string;
  category: { slug: string; label: string };
  observations: string | null;
  status: "pending" | "confirmed" | "dismissed";
  reporter: { id: string; name: string };
  comment: { body: string; authorId: string; authorName: string; createdAt: string };
  post: { id: string; caption: string | null };
  createdAt: string;
  resolvedAt: string | null;
  adminNotes: string | null;
}

interface DemoStore {
  analyses: Map<string, DemoCreatedAnalysis>;
  posts: Map<string, DemoCreatedPost>;
  // Voto del usuario demo por post (postId -> franja). Un solo usuario en demo.
  votes: Map<string, "mejorar" | "bien" | "muy_bueno" | "impecable">;
  // Ids de autores que el usuario demo sigue.
  follows: Set<string>;
  commentReports: Map<string, DemoCommentReport>;
  hiddenCommentIds: Set<string>;
  blockHistory: DemoBlockHistory[];
}

export interface DemoBlockHistory {
  blockerId: string;
  blockedId: string;
  blockedAt: string;
  unblockedAt: string | null;
}

const globalForDemo = globalThis as unknown as { __muzaDemoStore?: DemoStore };

export function getDemoStore(): DemoStore {
  if (!globalForDemo.__muzaDemoStore) {
    globalForDemo.__muzaDemoStore = {
      analyses: new Map(),
      posts: new Map(),
      votes: new Map(),
      follows: new Set(),
      commentReports: new Map(),
      hiddenCommentIds: new Set(),
      blockHistory: [],
    };
  }
  return globalForDemo.__muzaDemoStore;
}

export function createDemoAnalysis(occasionId: OccasionId, photoDataUrl: string | null): DemoCreatedAnalysis {
  const store = getDemoStore();
  const analysis: DemoCreatedAnalysis = {
    id: `demo-created-${crypto.randomUUID()}`,
    occasionId,
    photoDataUrl,
    analysisType: null,
    validityStatus: "pending",
    overallScore: null,
    styleDescriptors: [],
    categories: [],
    feedback: [],
    createdAt: new Date().toISOString(),
  };
  store.analyses.set(analysis.id, analysis);
  return analysis;
}

export function getDemoCreatedAnalysis(id: string): DemoCreatedAnalysis | undefined {
  return getDemoStore().analyses.get(id);
}

export function updateDemoAnalysisValidation(
  id: string,
  update: { validityStatus: DemoCreatedAnalysis["validityStatus"]; analysisType: AnalysisType | null },
) {
  const analysis = getDemoStore().analyses.get(id);
  if (!analysis) return;
  analysis.validityStatus = update.validityStatus;
  analysis.analysisType = update.analysisType;
}

export function updateDemoAnalysisScore(
  id: string,
  update: {
    overallScore: number;
    styleDescriptors: string[];
    categories: Analysis["categories"];
    feedback: Analysis["feedback"];
  },
) {
  const analysis = getDemoStore().analyses.get(id);
  if (!analysis) return;
  // Igual que en el endpoint real: un parcial sigue siendo parcial después de
  // puntuarlo, no se promueve a "valid".
  if (analysis.validityStatus !== "partial") analysis.validityStatus = "valid";
  analysis.overallScore = update.overallScore;
  analysis.styleDescriptors = update.styleDescriptors;
  analysis.categories = update.categories;
  analysis.feedback = update.feedback;
}

export function createDemoPost(analysisId: string, caption: string | null): DemoCreatedPost {
  const store = getDemoStore();
  const post: DemoCreatedPost = {
    id: `demo-created-post-${crypto.randomUUID()}`,
    analysisId,
    caption,
    createdAt: new Date().toISOString(),
    reactions: new Map(),
    comments: [],
  };
  store.posts.set(post.id, post);
  return post;
}

const DEMO_CATEGORIES: Record<string, { slug: string; label: string }> = {
  "00000000-0000-4000-8000-000000000001": { slug: "harassment_bullying", label: "Acoso o bullying" },
  "00000000-0000-4000-8000-000000000002": { slug: "hate_discrimination", label: "Discurso de odio o discriminación" },
  "00000000-0000-4000-8000-000000000003": { slug: "threats_violence", label: "Amenazas o violencia" },
  "00000000-0000-4000-8000-000000000004": { slug: "sexual_inappropriate", label: "Contenido sexual o inapropiado" },
  "00000000-0000-4000-8000-000000000005": { slug: "spam_advertising", label: "Spam o publicidad" },
  "00000000-0000-4000-8000-000000000006": { slug: "personal_information", label: "Información personal" },
  "00000000-0000-4000-8000-000000000007": { slug: "other", label: "Otro" },
};

export function createDemoCommentReport(commentId: string, categoryId: string, observations?: string) {
  const category = DEMO_CATEGORIES[categoryId];
  if (!category) throw new Error("INVALID_CATEGORY");
  if (category.slug === "other" && !observations?.trim()) throw new Error("OBSERVATIONS_REQUIRED");
  if (getDemoStore().commentReports.has(commentId)) throw new Error("DUPLICATE_REPORT");
  if (commentId === "demo-comment-own") throw new Error("OWN_COMMENT");
  if (commentId !== "demo-comment-1") throw new Error("COMMENT_NOT_FOUND");
  const report: DemoCommentReport = {
    id: `demo-report-${crypto.randomUUID()}`, commentId, categoryId, category,
    observations: observations?.trim() || null, status: "pending",
    reporter: { id: "demo-user", name: "Paula Giménez" },
    comment: { body: "Este look está buenísimo para una salida.", authorId: "demo-martina", authorName: "Martina R.", createdAt: new Date().toISOString() },
    post: { id: "demo-post-1", caption: null }, createdAt: new Date().toISOString(), resolvedAt: null, adminNotes: null,
  };
  getDemoStore().commentReports.set(report.id, report);
  return { id: report.id, status: report.status, createdAt: report.createdAt };
}

export function resolveDemoCommentReport(id: string, status: "confirmed" | "dismissed", adminNotes: string | null) {
  const store = getDemoStore();
  const report = store.commentReports.get(id);
  if (!report) throw new Error("REPORT_NOT_FOUND");
  if (report.status !== "pending") throw new Error("REPORT_ALREADY_RESOLVED");
  const resolvedAt = new Date().toISOString();
  report.status = status; report.resolvedAt = resolvedAt; report.adminNotes = adminNotes;
  if (status === "confirmed") {
    store.hiddenCommentIds.add(report.commentId);
    for (const other of store.commentReports.values()) {
      if (other.commentId === report.commentId && other.status === "pending") { other.status = "confirmed"; other.resolvedAt = resolvedAt; }
    }
  }
  return { id, status, resolvedAt };
}

export type { DemoCreatedAnalysis, DemoCreatedPost };

export function isDemoBlockedBetween(userA: string, userB: string): boolean {
  return isBlockedBetween(getDemoStore().blockHistory, userA, userB);
}

export function setDemoUserBlocked(blockedId: string, blocked: boolean, actorId: string): boolean {
  const store = getDemoStore();
  const result = setBlockHistory(store.blockHistory, actorId, blockedId, blocked);
  if (blocked) {
    store.follows.delete(blockedId);
  }
  return result;
}

export function listDemoBlockedUsers(actorId: string): DemoBlockHistory[] {
  return getDemoStore().blockHistory.filter((h) => h.blockerId === actorId && h.unblockedAt === null);
}
