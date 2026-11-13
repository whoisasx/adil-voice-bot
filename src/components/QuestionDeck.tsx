import { ArrowIcon } from "./icons";

export function QuestionDeck({
  questions,
  asked,
  disabled,
  onPick,
}: {
  questions: string[];
  asked: Set<string>;
  disabled?: boolean;
  onPick: (q: string) => void;
}) {
  return (
    <section className="deck" aria-labelledby="deckTitle">
      <div className="deck-head">
        <h2 id="deckTitle">Question deck</h2>
        <span className="eyebrow">{questions.length} prompts</span>
      </div>
      <ul className="deck-list">
        {questions.map((q, i) => {
          const done = asked.has(q);
          return (
            <li key={q}>
              <button
                type="button"
                className={`qcard${done ? " asked" : ""}`}
                disabled={disabled}
                onClick={() => onPick(q)}
              >
                <span className="qnum">{String(i + 1).padStart(2, "0")}</span>
                <span className="qtext">{q}</span>
                {done && <span className="sr-only"> (already asked)</span>}
                <span className="qgo" aria-hidden>
                  <ArrowIcon width={2.2} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
