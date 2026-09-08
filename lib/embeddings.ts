import { pipeline, env } from "@xenova/transformers";
import path from "path";
import os from "os";

// Configuration for serverless (Vercel / AWS Lambda) and Node.js environments
// Serverless filesystems are read-only except os.tmpdir() (/tmp)
if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === "production") {
  env.cacheDir = path.join(os.tmpdir(), ".transformers-cache");
}

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
    }).catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

/**
 * Generates a normalized 384-dimensional dense vector for any English, Kannada, or code-mixed string.
 * Resilient to serverless cold starts or network timeouts with zero-vector fallback.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const cleanText = text.trim().slice(0, 1500); // Guard against giant tokens
  if (!cleanText) {
    return new Array(384).fill(0);
  }

  try {
    const extractor = await getExtractor();
    const output = await extractor(cleanText, {
      pooling: "mean",
      normalize: true,
    });

    return Array.from(output.data as Float32Array);
  } catch (error) {
    console.warn("Embedding generation fallback (using zero vector for FTS):", error);
    return new Array(384).fill(0);
  }
}
