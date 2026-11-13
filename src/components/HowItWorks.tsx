import { ChevronIcon } from "./icons";

const STEPS = [
  { title: "You speak", detail: "Ask out loud, like in a normal interview. Recording stops when you pause." },
  { title: "Whisper transcribes", detail: "Your voice becomes text on the server in about a second." },
  { title: "The model answers from Adil’s real stories", detail: "Grounded only in his actual projects and experience, with a rule never to invent facts." },
  { title: "A natural voice speaks it back", detail: "Speaking starts within a couple of seconds, and you can read along." },
];

export function HowItWorks() {
  return (
    <details className="how">
      <summary>
        How it works
        <ChevronIcon />
      </summary>
      <ol className="steps">
        {STEPS.map((s) => (
          <li key={s.title}>
            <div>
              <b>{s.title}</b>
              <span>{s.detail}</span>
            </div>
          </li>
        ))}
      </ol>
    </details>
  );
}
