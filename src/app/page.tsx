import { HowItWorks } from "@/components/HowItWorks";
import { VoiceBot } from "@/components/VoiceBot";
import { profile, sampleQuestions } from "@/lib/persona";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-8 px-4 py-10 sm:py-16">
      <header className="text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-600">Voice interview bot</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Talk to {profile.name}</h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          Tap the mic and ask an interview question out loud. I&apos;ll answer the way I would in person.
        </p>
      </header>

      <VoiceBot sampleQuestions={sampleQuestions} />

      <HowItWorks />

      <footer className="mt-auto pt-6 text-center text-xs text-zinc-400">
        Works best in Chrome, Edge, or Safari. Allow microphone access when prompted.
      </footer>
    </main>
  );
}
