import { NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

export const maxDuration = 60; // Extend Vercel function timeout limit up to 60s

function detectIsKannada(text: string, lang?: string): boolean {
  if (lang === "kn") return true;
  if (lang === "en") return false;
  // If auto or unspecified, count Kannada characters vs Latin characters
  const knChars = (text.match(/[\u0C80-\u0CFF]/g) || []).length;
  const enChars = (text.match(/[a-zA-Z]/g) || []).length;
  return knChars > enChars;
}

// Clean text for natural speech synthesis and strict SSML XML compliance
function prepareTextForSpeech(raw: string, isKannada: boolean): string {
  let cleaned = raw
    // Escape XML special characters
    .replace(/&/g, isKannada ? " ಮತ್ತು " : " and ")
    .replace(/[<>]/g, " ")
    .replace(/["']/g, " ") // Clean quotes to prevent any SSML attribute collision
    // Strip emojis
    .replace(/[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]/gu, "")
    // Strip markdown link targets and URLs
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/\(https?:\/\/[^\)]+\)/g, "")
    .replace(/https?:\/\/\S+/g, "")
    // Strip markdown formatting symbols
    .replace(/[*#_`•\-\[\]|~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!isKannada) {
    // For English speech, strip isolated Kannada characters/parentheses so English voice doesn't choke
    cleaned = cleaned.replace(/\s*\([\u0C80-\u0CFF\s]+\)\s*/g, " ");
    cleaned = cleaned.replace(/[\u0C80-\u0CFF]+/g, "");
  }

  return cleaned.trim();
}

// Ensure speech ends cleanly on a sentence boundary instead of cutting off mid-word
function getOptimalSpeechChunk(text: string, maxLen = 950): string {
  if (text.length <= maxLen) return text;
  const slice = text.slice(0, maxLen);
  const lastSentenceBreak = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf(".\n"),
    slice.lastIndexOf("? "),
    slice.lastIndexOf("!\n"),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("। ") // Kannada/Indic full stop if present
  );
  if (lastSentenceBreak > 350) {
    return slice.slice(0, lastSentenceBreak + 1).trim();
  }
  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace > 350) {
    return slice.slice(0, lastSpace).trim() + ".";
  }
  return slice.trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawText = (body.text || "").trim();
    const requestedLang = body.language || "auto";
    const requestedVoice = body.voice;

    if (!rawText) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const isKannada = detectIsKannada(rawText, requestedLang);
    const cleanText = prepareTextForSpeech(rawText, isKannada);
    
    if (!cleanText) {
      return NextResponse.json({ error: "No speakable content" }, { status: 400 });
    }

    // Default to Female Indian English (Neerja) or Native Kannada (Sapna)
    let voice = isKannada ? "kn-IN-SapnaNeural" : "en-IN-NeerjaNeural";
    let locale = isKannada ? "kn-IN" : "en-IN";

    if (requestedVoice) {
      if (requestedVoice.startsWith("kn-") || requestedVoice.startsWith("en-")) {
        voice = requestedVoice;
        locale = requestedVoice.slice(0, 5);
      }
    }

    // Optimal chunking with sentence boundary preservation
    const textChunk = getOptimalSpeechChunk(cleanText, 950);

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {
      voiceLocale: locale,
    });

    const { audioStream } = tts.toStream(textChunk);

    const chunks: Buffer[] = [];
    try {
      for await (const chunk of audioStream) {
        chunks.push(Buffer.from(chunk));
      }
    } catch (streamErr: any) {
      if (chunks.length > 0) {
        console.warn(`TTS stream closed early (${chunks.length} chunks). Delivering collected audio.`);
      } else {
        throw streamErr;
      }
    }

    if (chunks.length === 0) {
      throw new Error("No audio chunks received from speech synthesis");
    }

    const audioBuffer = Buffer.concat(chunks);

    return new NextResponse(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
      },
    });
  } catch (error: any) {
    console.error("Neural TTS API error:", error);
    return NextResponse.json(
      { error: "Failed to synthesize speech", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
