# Talk to Adil: Voice Interview Bot

**Live:** https://adil-voice-bot.vercel.app

A web voice bot that answers interview questions the way Adil would. Open the link, tap the mic, ask a question, hear the answer. No install, no sign-up, no API key needed for testers.

## How it works

```
Mic (MediaRecorder + silence detection) ──► /api/transcribe ──► Whisper (speech → text)
                                                                   │
Natural voice ◄── /api/tts (Orpheus) ◄── sentence queue ◄── /api/chat ◄┘  LLM + persona prompt (streamed)
```

- **Talking:** tap and speak; recording stops on its own when you pause. Or hold the button (or the Space key) and release to send. A live ring shows your mic level.
- **Speech to text:** Whisper (`whisper-large-v3-turbo` on Groq). Works in Chrome, Safari, Firefox and on mobile.
- **Answers:** streamed from `gpt-oss-120b` on Groq with a first-person persona prompt built only from real resume and work facts (`src/lib/persona.ts`), with a rule never to invent details.
- **Voice:** natural text-to-speech (Groq Orpheus). Each sentence is turned into speech while the answer is still streaming, and the next one is prepared while the current one plays, so speaking starts in about 2.5 seconds. Falls back to the browser's built-in voice if needed.
- **Reliability on a free tier:** fallback across models (`gpt-oss-120b` → `gpt-oss-20b` → Qwen → optional Vercel AI Gateway), automatic wait-and-retry on rate limits, and a compact prompt to fit more answers per minute.
- **Fallbacks for people:** clickable sample questions, a text box if the mic is blocked, mute and start-over controls, clear error messages.
- **Safety:** API key stays on the server; per-IP rate limiting; input size limits.

## Project structure

```
src/
  app/
    page.tsx                 Landing page
    api/chat/route.ts        Streams the persona's answer (with model fallback)
    api/transcribe/route.ts  Audio → text
    api/tts/route.ts         Text → natural speech
  components/                VoiceBot (orchestrator), MicButton, Transcript, SampleQuestions, TextInput, HowItWorks
  hooks/
    useRecorder.ts           Mic recording, level meter, silence auto-stop
    useSpeech.ts             Speech queue: natural voice with browser fallback
  lib/
    persona.ts               Who "I" am: facts + system prompt
    llm.ts                   Chat (multi-provider fallback), transcription, speech clients
    config.ts                Env-driven models, limits, providers
    rate-limit.ts            In-memory per-IP limiter
```

## Run locally

```bash
cp .env.example .env.local   # add GROQ_API_KEY
npm install
npm run dev                  # http://localhost:3000
```

## Deploy

Deploy to Vercel and set `GROQ_API_KEY` in the project's environment variables. The Orpheus voice requires accepting its model terms once in the Groq console.

The version originally submitted is tagged `v1-submission`.
