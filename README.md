# 🤖 ACU Saarthi — Official Voice & AI University Assistant
### ಎಸಿಯು ಸಾರಥಿ | Adichunchanagiri University (ACU)

[![Next.js](https://img.shields.io/badge/Next.js-16.3.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Groq](https://img.shields.io/badge/Groq-Llama--3.3--70B-orange?style=for-the-badge)](https://groq.com/)

**ACU Saarthi** is an intelligent, voice-enabled AI robot assistant built for **Adichunchanagiri University (ACU)** located at B.G. Nagara, Mandya District, Karnataka. It helps students, parents, applicants, and visitors get instant, verified, and voice-assisted information in both **English** and **Kannada (ಕನ್ನಡ)**.

---

## 🌟 Key Features

- **🎙️ Hands-Free Voice Module**:
  - **Speech-to-Text (STT)**: Speaks with real-time audio visualization and automatic submission upon sentence pause.
  - **Text-to-Speech (TTS)**: Reads verified responses aloud in natural accents (Indian English and Kannada).
- **🌐 Seamless Dual-Language Support**:
  - Understands English, Kannada script (`ಕನ್ನಡ`), and Kannada transliteration in Latin script (`"BGSIT courses yavudhu ide"`, `"VC yaaru"`, etc.).
  - Automatic language detection with polite cultural salutations (`Jai Sri Gurudev 🙏` & `ಜೈ ಶ್ರೀ ಗುರುದೇವ್ 🙏`).
- **🌌 Cosmic Galaxy & 3D Robot UI**:
  - Side-by-side split screen dashboard with animated blooming aura visualizer rings.
  - Independent right-hand chat stream that scrolls smoothly without shifting layout.
- **⚡ 100% Grounded Zero-Hallucination Knowledge Engine**:
  - Grounded against verified ACU records across all constituent colleges, leadership, hospital, hostels, and admission hotlines.
  - Powered by Groq Cloud (`llama-3.3-70b-versatile`) with an instant zero-fail knowledge fallback engine.

---

## 🏛️ Knowledge Base Scope

| No. | Constituent College / School | Code |
|---|---|---|
| 1 | Adichunchanagiri Institute of Medical Sciences | **AIMS** |
| 2 | BGS Institute of Technology | **BGSIT** |
| 3 | Sri Adichunchanagiri College of Pharmacy | **SACP** |
| 4 | Adichunchanagiri College of Nursing | **ACN** |
| 5 | Adichunchanagiri School of Allied Health Sciences | **ASAHS** |
| 6 | Adichunchanagiri School of Natural Sciences | **ASNS** |
| 7 | BGS First Grade College | **BGS FGC** |
| 8 | BGS College of Education | **BGS CoE** |
| 9 | Adichunchanagiri Hospital & Research Centre (1000+ beds) | **AH&RC** |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.18+ or 20+
- npm, yarn, or pnpm
- Groq API Key ([Get a free key from console.groq.com](https://console.groq.com/keys))

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/acu-saarthi.git
   cd acu-saarthi
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env.local` file in the root directory:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```

5. **Open in Browser**:
   Navigate to [http://localhost:3000](http://localhost:3000).

---

## 📁 Project Structure

```
acu-saarthi/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts         # Bilingual Groq LLM & Knowledge Ranking
│   ├── globals.css              # Galaxy Sky theme & Blooming animations
│   ├── layout.tsx               # Root metadata & fonts
│   └── page.tsx                 # Split dashboard, voice STT/TTS engine
├── data/
│   └── acu-knowledge.json       # Verified ACU knowledge base
├── public/                      # Static assets
├── .env.example                 # Environment template
├── .gitignore                   # Ignored files (secrets, build artifacts)
└── README.md                    # Project documentation
```

---

## 🛡️ Security & Privacy
- API keys are secured server-side in `.env.local` and never exposed to the client.
- `.gitignore` prevents private keys and environment files from being committed to GitHub.

---

## 📜 License
Developed for **Adichunchanagiri University (ACU)**. All rights reserved.

