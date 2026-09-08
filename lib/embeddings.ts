import path from "path";
import os from "os";

// Configuration for serverless (Vercel / AWS Lambda) and Node.js environments
// Singleton extractor promise
let extractorInstance: any = null;
let initPromise: Promise<any> | null = null;

async function getExtractor() {
  if (extractorInstance) return extractorInstance;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const { pipeline, env } = await import("@xenova/transformers");
        
        // Serverless filesystems are read-only except os.tmpdir() (/tmp)
        if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === "production") {
          env.cacheDir = path.join(os.tmpdir(), ".transformers-cache");
        }

        env.allowLocalModels = false;
        env.useBrowserCache = false;

        const extractor = await pipeline(
          "feature-extraction",
          "Xenova/all-MiniLM-L6-v2",
          { quantized: true }
        );
        extractorInstance = extractor;
        return extractor;
      } catch (err) {
        console.warn("Could not initialize @xenova/transformers in this runtime:", err);
        return null;
      }
    })();
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
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Embedding extraction timed out (6s limit)")), 6000)
    );

    const embedPromise = (async () => {
      const extractor = await getExtractor();
      if (!extractor) {
        throw new Error("Extractor unavailable");
      }
      const output = await extractor(cleanText, {
        pooling: "mean",
        normalize: true,
      });
      return Array.from(output.data as Float32Array);
    })();

    return await Promise.race([embedPromise, timeoutPromise]);
  } catch (error) {
    console.warn("Embedding generation fallback (using zero vector for FTS):", error);
    return new Array(384).fill(0);
  }
}
