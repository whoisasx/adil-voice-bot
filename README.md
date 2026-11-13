# Talk to Adil — Voice Interview Bot

A web voice bot that answers interview questions the way Adil would. Open the link, tap the mic, ask a question, hear the answer. No install, no API key needed for testers.

## How it works

```
Mic (MediaRecorder) ──► /api/transcribe ──► Whisper (speech → text)
                                               │
Browser TTS ◄── sentence queue ◄── /api/chat ◄─┘  LLM + persona prompt (streamed)
```

- **Speech-to-text:** browser records audio → server sends it to Whisper (`whisper-large-v3-turbo` on Groq). Works in Chrome, Safari, Firefox, and mobile.
- **Answers:** streamed from an OpenAI-compatible chat API (`llama-3.3-70b-versatile` on Groq) with a first-person persona prompt grounded in real facts (`src/lib/persona.ts`).
- **Text-to-speech:** the browser's built-in voice, spoken sentence-by-sentence while the answer streams, for low latency.
- **Fallbacks:** clickable sample questions and a text box if the mic is unavailable; mute toggle; friendly errors.
- **Safety:** API key stays server-side; per-IP rate limiting; input size limits.

## Project structure

```
src/
  app/
    page.tsx                 Landing page
    api/chat/route.ts        Streams the persona's answer
    api/transcribe/route.ts  Audio → text
  components/                VoiceBot (orchestrator), MicButton, Transcript, SampleQuestions, TextInput
  hooks/                     useRecorder (mic), useSpeech (TTS queue)
  lib/
    persona.ts               ← who "I" am: facts + system prompt
    llm.ts                   OpenAI-compatible chat + transcription client
    config.ts                Env-driven config & limits
    rate-limit.ts            In-memory per-IP limiter
```

## Run locally

```bash
cp .env.example .env.local   # add GROQ_API_KEY
npm install
npm run dev                  # http://localhost:3000
```

## Deploy

Deploy to Vercel and set `GROQ_API_KEY` in the project's environment variables.
