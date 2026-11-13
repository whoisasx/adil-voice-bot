const STATS = [
  { value: "58", label: "merged PRs, Agent Orchestrator" },
  { value: "~14k", label: "GitHub stars on Agent Orchestrator" },
  { value: "~1950", label: "LeetCode Knight rating" },
  { value: "2025", label: "NIT Patna graduate" },
];

const TAGS = ["AI agents", "Evals", "Reliability", "Go · TypeScript"];

export function Profile() {
  return (
    <section className="profile" aria-labelledby="pname">
      <div className="p-head">
        <div className="avatar" aria-hidden>
          AS<span className="live-dot" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>
            Candidate · AI Engineer
          </div>
          <h1 className="p-name" id="pname">
            Adil Shaikh
          </h1>
          <p className="p-role">AI engineer · NIT Patna ’25 · ex-Shipd by Datacurve</p>
        </div>
      </div>
      <p className="p-bio">
        Builds AI agents and the plumbing that makes them <em>reliable</em>. Ask anything you would ask in a first-round
        interview; he answers out loud, the way he would in person.
      </p>
      <ul className="stats" aria-label="Highlights">
        {STATS.map((s) => (
          <li key={s.value} className="stat">
            <b>{s.value}</b>
            <span>{s.label}</span>
          </li>
        ))}
      </ul>
      <div className="tags">
        {TAGS.map((t) => (
          <span key={t} className="tag">
            {t}
          </span>
        ))}
      </div>
    </section>
  );
}
