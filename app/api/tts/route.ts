import { NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

export const maxDuration = 60; // Extend Vercel function timeout limit up to 60s

// Clean text for natural speech synthesis
function prepareTextForSpeech(raw: string): string {
  return raw
    .replace(/^[Jj]ai [Ss]ri [Gg]urudev 🙏\s*/i, "")
    .replace(/^ಜೈ ಶ್ರೀ ಗುರುದೇವ್ 🙏\s*/i, "")
    .replace(/\(https?:\/\/[^\)]+\)/g, "") // remove markdown link URLs
    .replace(/https?:\/\/\S+/g, "") // remove raw URLs
    .replace(/[*#_`•\-\[\]]/g, " ") // remove markdown artifacts
    .replace(/\s+/g, " ")
    .trim();
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

    const cleanText = prepareTextForSpeech(rawText);
    if (!cleanText) {
      return NextResponse.json({ error: "No speakable content" }, { status: 400 });
    }

    const isKannada = requestedLang === "kn" || /[\u0C80-\u0CFF]/.test(rawText);

    // Default to Female Indian English (Neerja) or Native Kannada (Sapna)
    let voice = isKannada ? "kn-IN-SapnaNeural" : "en-IN-NeerjaNeural";
    let locale = isKannada ? "kn-IN" : "en-IN";

    if (requestedVoice) {
      if (requestedVoice.startsWith("kn-") || requestedVoice.startsWith("en-")) {
        voice = requestedVoice;
        locale = requestedVoice.slice(0, 5);
      }
    }

    // Limit text length per chunk to maintain rapid audio streaming
    const textChunk = cleanText.slice(0, 800);

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {
      voiceLocale: locale,
    });

    const { audioStream } = tts.toStream(textChunk);

    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(Buffer.from(chunk));
    }
    const audioBuffer = Buffer.concat(chunks);

    return new NextResponse(audioBuffer, {
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
