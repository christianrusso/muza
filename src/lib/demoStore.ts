import "server-only";
import type { Analysis, AnalysisType, OccasionId } from "@/types/domain";

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
  qualitativeBadge: string | null;
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

interface DemoStore {
  analyses: Map<string, DemoCreatedAnalysis>;
  posts: Map<string, DemoCreatedPost>;
  // Voto del usuario demo por post (postId -> franja). Un solo usuario en demo.
  votes: Map<string, "mejorar" | "bien" | "muy_bueno" | "impecable">;
  // Ids de autores que el usuario demo sigue.
  follows: Set<string>;
}

const globalForDemo = globalThis as unknown as { __muzaDemoStore?: DemoStore };

export function getDemoStore(): DemoStore {
  if (!globalForDemo.__muzaDemoStore) {
    globalForDemo.__muzaDemoStore = {
      analyses: new Map(),
      posts: new Map(),
      votes: new Map(),
      follows: new Set(),
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
    qualitativeBadge: null,
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
    qualitativeBadge: string;
    styleDescriptors: string[];
    categories: Analysis["categories"];
    feedback: Analysis["feedback"];
  },
) {
  const analysis = getDemoStore().analyses.get(id);
  if (!analysis) return;
  analysis.validityStatus = "valid";
  analysis.overallScore = update.overallScore;
  analysis.qualitativeBadge = update.qualitativeBadge;
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

export type { DemoCreatedAnalysis, DemoCreatedPost };
