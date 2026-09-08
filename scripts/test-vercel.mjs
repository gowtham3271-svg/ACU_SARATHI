async function testFullPipeline() {
  const tests = [
    { name: "English Greeting", payload: { message: "hi" } },
    { name: "Kannada Greeting", payload: { message: "ನಮಸ್ಕಾರ", language: "kn" } },
    { name: "English Query (VC)", payload: { message: "Who is the Vice-Chancellor of ACU?" } },
    { name: "Kannada Query (VC)", payload: { message: "ವಿಶ್ವವಿದ್ಯಾಲಯದ ಉಪಕುಲಪತಿಗಳು ಯಾರು?", language: "kn" } }
  ];

  for (const t of tests) {
    console.log(`\n========================================`);
    console.log(`Testing: ${t.name}`);
    console.log(`========================================`);
    
    // 1. Test /api/chat
    const t0 = Date.now();
    const chatRes = await fetch("https://acu-sarathi.vercel.app/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(t.payload),
    });
    const chatDuration = Date.now() - t0;
    console.log(`Chat HTTP Status: ${chatRes.status} (${chatDuration}ms)`);
    
    if (!chatRes.ok) {
      console.error("Chat failed:", await chatRes.text());
      continue;
    }

    const chatData = await chatRes.json();
    console.log(`Language detected: ${chatData.language}`);
    console.log(`Answer excerpt: ${chatData.answer.slice(0, 180)}...`);

    // 2. Test /api/tts with the generated answer
    const tts0 = Date.now();
    const ttsRes = await fetch("https://acu-sarathi.vercel.app/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: chatData.answer,
        language: chatData.language,
      }),
    });
    const ttsDuration = Date.now() - tts0;
    console.log(`TTS HTTP Status: ${ttsRes.status} (${ttsDuration}ms)`);

    if (ttsRes.ok) {
      const audioBuffer = await ttsRes.arrayBuffer();
      console.log(`✅ Neural Audio synthesized: ${audioBuffer.byteLength} bytes (Content-Type: ${ttsRes.headers.get("content-type")})`);
    } else {
      console.error("TTS failed:", await ttsRes.text());
    }
  }
}

testFullPipeline();
