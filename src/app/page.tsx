import { VoiceBot } from "@/components/VoiceBot";
import { sampleQuestions } from "@/lib/persona";

export default function Home() {
  return <VoiceBot sampleQuestions={sampleQuestions} />;
}
