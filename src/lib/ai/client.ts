import "server-only";
import OpenAI from "openai";

let cachedClient: OpenAI | null = null;

// Constructed lazily (not at module load) so importing this module never
// throws when OPENAI_API_KEY is unset — e.g. during `next build`'s page-data
// collection, which imports every route module regardless of runtime env.
export function getOpenAIClient(): OpenAI {
  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return cachedClient;
}

// Swapping models (e.g. gpt-4o -> gpt-4.1) is a config change, not a code change.
export const VISION_MODEL = process.env.OPENAI_VISION_MODEL ?? "gpt-4o";

// Modelo de generación de imágenes (looks de colorimetría). gpt-image-1 por
// defecto; overridable por env.
export const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";
