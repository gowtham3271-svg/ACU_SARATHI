import { pipeline, env } from "@xenova/transformers";

// Configuration for local Node.js environment
env.allowLocalModels = false;
env.useBrowserCache = false;

// Singleton extractor promise
let extractorInstance: any = null;
let initPromise: Promise<any> | null = null;

async function getExtractor() {
  if (extractorInstance) return extractorInstance;
  if (!initPromise) {
    initPromise = pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2",
      { quantized: true }
    ).then((extractor) => {
      extractorInstance = extractor;
      return extractor;
    });
  }
  return initPromise;
}

/**
 * Generates a normalized 384-dimensional dense vector for any English, Kannada, or code-mixed string.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const cleanText = text.trim().slice(0, 1500); // Guard against giant tokens
  if (!cleanText) {
    return new Array(384).fill(0);
  }

  const extractor = await getExtractor();
  const output = await extractor(cleanText, {
    pooling: "mean",
    normalize: true,
  });

  return Array.from(output.data as Float32Array);
}
