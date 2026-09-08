import fs from "fs";
import path from "path";
import { supabase } from "../lib/supabase";
import { generateEmbedding } from "../lib/embeddings";

type RawKnowledgeItem = {
  id: string;
  title: string;
  category?: string;
  department?: string;
  content: string;
  source?: string;
  keywords?: string[];
};

async function ingestKnowledge() {
  console.log("==================================================");
  console.log("SARATHI KNOWLEDGE BASE INGESTION PIPELINE");
  console.log("Target: Supabase PostgreSQL + pgvector (384-dim)");
  console.log("==================================================");

  const filePath = path.join(process.cwd(), "data", "acu-knowledge.json");
  if (!fs.existsSync(filePath)) {
    throw new Error(`Knowledge file not found at ${filePath}`);
  }

  const rawData = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(rawData);

  // Flatten and validate items
  const items: RawKnowledgeItem[] = [];
  const seenIds = new Set<string>();

  function traverse(node: any) {
    if (Array.isArray(node)) {
      for (const item of node) traverse(item);
    } else if (node && typeof node === "object") {
      if (node.id && node.title && node.content) {
        if (!seenIds.has(node.id)) {
          seenIds.add(node.id);
          items.push({
            id: String(node.id),
            title: String(node.title).trim(),
            category: node.category ? String(node.category).trim() : "General",
            department: node.department ? String(node.department).trim() : undefined,
            content: String(node.content).trim(),
            source: node.source ? String(node.source).trim() : "https://acu.edu.in",
            keywords: Array.isArray(node.keywords) ? node.keywords : undefined,
          });
        }
      }
    }
  }

  traverse(parsed);
  console.log(`Found ${items.length} unique authoritative institutional knowledge chunks to ingest.`);

  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;

  // Process in batches
  const BATCH_SIZE = 5;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    
    await Promise.all(
      batch.map(async (item) => {
        try {
          // Combine title + keywords + content for rich semantic embedding
          const textToEmbed = `${item.title}. ${item.category}. ${item.content}`;
          const embedding = await generateEmbedding(textToEmbed);

          const { data, error } = await supabase.rpc(
            "upsert_institutional_knowledge_chunk",
            {
              p_doc_id: item.id,
              p_title: item.title,
              p_category: item.category || "General",
              p_department: item.department || null,
              p_content: item.content,
              p_source_url: item.source || "https://acu.edu.in",
              p_authority_level: 1,
              p_version: "1.0",
              p_embedding: embedding,
            }
          );

          if (error) {
            console.error(`Failed to ingest doc [${item.id}]:`, error.message);
            failCount++;
          } else {
            successCount++;
          }
        } catch (err: any) {
          console.error(`Error processing doc [${item.id}]:`, err?.message || err);
          failCount++;
        }
      })
    );

    const progress = Math.min(i + BATCH_SIZE, items.length);
    const percent = ((progress / items.length) * 100).toFixed(1);
    console.log(`Ingested ${progress}/${items.length} (${percent}%) chunks...`);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("==================================================");
  console.log(`INGESTION COMPLETE: ${successCount} succeeded, ${failCount} failed.`);
  console.log(`Total duration: ${durationSec} seconds.`);
  console.log("==================================================");
}

ingestKnowledge().catch((err) => {
  console.error("Fatal ingestion error:", err);
  process.exit(1);
});
