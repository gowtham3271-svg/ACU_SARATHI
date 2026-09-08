import { supabase } from "../lib/supabase";
import { generateEmbedding } from "../lib/embeddings";
import { processUserQuery } from "../lib/query-rewriter";

async function testRetrieval() {
  console.log("==================================================");
  console.log("TESTING HYBRID RETRIEVAL (Dense Vector + BM25 FTS)");
  console.log("==================================================");

  const testQueries = [
    "What engineering courses are offered at BGSIT?",
    "ಹಾಸ್ಟೆಲ್ ಸೌಲಭ್ಯ ಹೇಗಿದೆ?", // Kannada: How are the hostel facilities?
    "AIMS MBBS eligibility enu?", // Code-mixed: What is AIMS MBBS eligibility?
  ];

  for (const q of testQueries) {
    const processed = processUserQuery(q);
    console.log(`\n--- Original: "${q}" ---`);
    console.log(`    Lang: ${processed.detectedLanguage} | Search: "${processed.searchQuery}"`);
    
    const t0 = Date.now();
    const embedding = await generateEmbedding(processed.searchQuery);
    const embedTime = Date.now() - t0;

    const t1 = Date.now();
    const { data, error } = await supabase.rpc(
      "match_institutional_knowledge_hybrid",
      {
        query_text: processed.searchQuery,
        query_embedding: embedding,
        match_count: 3,
      }
    );
    const rpcTime = Date.now() - t1;

    if (error) {
      console.error("RPC Error:", error.message);
      continue;
    }

    console.log(`Embedding: ${embedTime}ms | Hybrid RPC: ${rpcTime}ms | Matches: ${data?.length || 0}`);
    data?.forEach((m: any, idx: number) => {
      console.log(`  [${idx + 1}] Score: ${m.combined_score.toFixed(4)} (Sim: ${m.vector_similarity.toFixed(3)}, FTS: ${m.fts_rank.toFixed(3)}) - Title: "${m.title}"`);
      console.log(`      Content snippet: "${m.content.slice(0, 100)}..."`);
    });
  }
}

testRetrieval().catch(console.error);
