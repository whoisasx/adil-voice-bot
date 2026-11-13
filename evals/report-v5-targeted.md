# Eval report

Target: https://adil-voice-qkl6nra03-adil-shaikhs-projects-f73d7677.vercel.app
Run: 2026-11-13T20:45:54.442Z

## growth
**Q:** What are the top three areas you would like to grow in?

**A:** I’d like to grow in three ways: working directly with non‑technical customers, reaching simple designs faster, and deepening domain knowledge to spot high‑leverage bottlenecks. At Shipd I built a 44,000‑line switching system that later turned into a much simpler handoff, which taught me the value of early simplicity. I’m now focused on translating operator workflows into trusted automation and learning the mortgage space quickly enough to measure impact in hours saved and accuracy.

_73 words, 5.6s_

## limits
**Q:** How do you push your boundaries and limits?

**A:** I push my boundaries by deliberately taking on work that’s beyond my current comfort zone. I run long distances, a habit from military school that trains me to stay with discomfort. I also built Perpex, a perpetual futures exchange with a C++20 matching engine and Rust services, just to learn low‑latency systems. At Agent Orchestrator I wrote runbooks for all 71 failure points before declaring the agent‑switching feature complete.

_69 words, 5.5s_

## failure
**Q:** Tell me about a time you failed.

**A:** I once built a complex agent‑switching feature that turned out to be over‑engineered. Users needed to move a running session from Claude Code to Codex without losing work, so I created a durable handoff that preserved the session, worktree, branch, PR and terminal, added a progress view, and wrote a failure taxonomy covering 71 points with Sentry reports. The implementation grew to about 44 000 lines and became hard to maintain, so I later replaced it with a simple bounded‑note handoff, removing roughly 45 000 lines and adding about 15 000. The lesson was to ship the simplest version first and only add complexity when real usage demands it.

_109 words, 4.4s_

## weakness
**Q:** What's your biggest weakness?

**A:** My biggest weakness is that I haven’t yet worked in the mortgage domain and I don’t use Python as my primary language day‑to‑day. I’m honest about that gap and then focus on how I close it quickly. At Agent Orchestrator I shipped 58 merged PRs building reliable agent switching and runbooks, learning to measure baselines and hand off work to humans. I would apply the same disciplined rollout process to mortgage workflows, learning the domain while delivering value from day one.

_81 words, 5.5s_

## conflict
**Q:** How do you handle disagreement with a teammate?

**A:** I handle disagreement by stepping back, writing the options down, and letting data or the user’s need decide which path wins. When my own switching design for Agent Orchestrator turned out to be too heavy, I didn’t cling to it—I documented the trade‑offs, compared them against the performance metrics, and then replaced it with a simpler approach that the community accepted. I keep the discussion focused on the problem, not personalities, and move forward once we have a clear decision. This lets the team stay fast and the code stay reliable.

_91 words, 5.1s_

## why100x
**Q:** Why do you want to work at 100x?

**A:** I want to work at 100x because it’s the next step in taking reliable AI agents from developers to real operators who make business decisions. Over the last seven months on Agent Orchestrator I measured baselines, wrote runbooks and built hand‑off loops, and 100x’s focus on weekly releases and human‑in‑the‑loop outcomes aligns perfectly. The closest thing I’ve done is agreeing on a baseline with my team before each change and verifying it automatically, which mirrors the process they use with mortgage lenders.

_82 words, 5.1s_

## mortgage
**Q:** Do you have any mortgage industry experience?

**A:** I don’t have direct mortgage industry experience yet. I’ve spent the past year building reliable AI agent pipelines and evaluation frameworks, like the eval sets I created at Shipd for frontier AI labs. I would start by shadowing the mortgage operators, measuring their current turnaround times and error rates, then prototype a narrow workflow with human oversight before scaling. That’s how I’ve approached new domains before.

_66 words, 4.0s_

## customers
**Q:** How would you work with non-technical operators who are skeptical of AI?

**A:** I would start by observing their daily workflow, identify the task they dislike most, and agree on a baseline metric before any automation. Then I’d build a narrow‑scope agent that only assists, with a human in the loop for any critical decision, and provide a simple runbook and an easy way to override it. The closest example I have is the notification system I added to Agent Orchestrator, which pauses the agent and alerts a human at the right moment instead of acting alone. I’d use that pattern to earn trust and show measurable improvement against the baseline we set together.

_101 words, 4.2s_

## evals
**Q:** What did you actually do at Shipd?

**A:** At Shipd I built reproducible evaluation environments for frontier AI models, turning vague coding tasks into deterministic Docker setups with hidden tests and scoring rubrics. I authored the RL‑evaluation pipelines that generated the training data used by the LLMs, and I diagnosed failures to tighten task constraints and coverage. From October 2025 to February 2026 I was one of the engineers on a platform of over 14,000 vetted contributors, solving competitive coding bounties and fixing GitHub issues that fed directly into the evaluation suite. This work taught me that you can’t improve what you can’t score.

_96 words, 5.4s_

## notifications
**Q:** Walk me through a system you designed.

**A:** I designed a notification system that reliably alerts a human whenever an AI coding agent needs input. Each agent writes lifecycle events to SQLite, and a change‑data‑capture layer publishes those rows to a central notifier that dedupes, retries, and routes to six channels like Slack, Discord, desktop and webhooks. I first built it in TypeScript, then rewrote the core in Go with idempotent enqueue and fingerprint deduplication, and documented the design publicly. The system now powers the human‑in‑the‑loop flow for all of the fourteen‑thousand‑star agents I maintain.

_87 words, 5.1s_

---
Average words per answer: 86