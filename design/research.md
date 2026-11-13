# Voice UI Research — Adil Voice Bot Redesign

## Key patterns

**1. One central "presence" element whose behaviour carries state.** ChatGPT's voice mode uses a pulsing blue orb; Retell's widget shows an animated orb above a "Start to call" button; ElevenLabs ships an Orb component (two gradient colours, default `#2792dc`) and waveform components as open-source React UI.
- https://www.croma.com/unboxed/chatgpt-in-chat-voice-live-visuals-update
- https://docs.retellai.com/deploy/chat-widget
- https://elevenlabs.io/docs/eleven-agents/customization/widget · https://elevenlabs.io/blog/elevenlabs-ui

**2. Voice and text are converging into one thread.** In late 2025 ChatGPT moved voice into the normal chat view: the answer streams as text while it is spoken, and the full-screen orb became an opt-in "Separate mode". Gemini Live added a captions button that opens a floating transcript of the reply. In 2026 it added an on-screen "Tap to interrupt" control, and a plain transcript appears after an interruption.
- https://www.engadget.com/ai/now-you-can-use-chatgpt-voice-without-leaving-your-chat-195000538.html
- https://9to5google.com/2025/06/25/gemini-live-android-captions/
- https://androidauthority.com/gemini-live-ui-design-live-translation-3705267

**3. Interruption is a state, not an edge case.** Recommended handling: model states as a full state machine (interrupted, permission-denied, offline). When the user cuts in, stop the audio but keep the transcript boundaries. Escape stops the current action. If the network drops mid-answer, mark the answer as partial and offer a retry.
- https://dev.to/babycat/gpt-live-needs-an-interruption-ui-not-just-a-microphone-button-41b6

**4. Brand glow is the signal for "AI is active".** Gemini uses an edge glow on its Live and overlay screens, and is testing a circular button ringed by animated dots on a blue glow.
- https://9to5google.com/2025/03/24/gemini-astra-screen-glow/
- https://androidauthority.com/gemini-live-neural-expressive-audio-visualizer-redesign-3728666

**5. Ask for the mic only after explaining why.** Google Meet first asks in its own dialog, then shows the browser prompt, with a button labelled with the action ("Allow microphone and camera") and a path that works without the mic. First-join allow rate rose 14% and fewer users clicked Block. After a Block, `getUserMedia` fails silently (NotAllowedError, no new prompt), so recovery means telling the user how to change browser or OS settings.
- https://web.dev/case-studies/google-meet-permissions-best-practices
- https://docs.daily.co/docs/daily-js/guides/device-permissions

**6. Accessibility basics.**
- Use `role="log"` with `aria-live="polite"` for the conversation, and announce state changes, not each token.
- Every voice action needs a keyboard and text path.
- Never put the start control inside a canvas.
- Touch targets: WCAG 2.5.8 sets a 24px minimum (AA), 2.5.5 sets 44px (AAA), Apple recommends 44pt and Material 48dp.
- `prefers-reduced-motion` covers WCAG 2.3.3. For state feedback, swap motion for an opacity crossfade instead of removing it.
- https://testparty.ai/blog/accessible-voice-chatbots-multimodal-interfaces
- https://silktide.com/accessibility-guide/the-wcag-standard/2-5/input-modalities/2-5-8-target-size-minimum/
- https://w3c.github.io/wcag/understanding/animation-from-interactions.html

**7. Mobile.**
- Hoober's thumb zone: 49% of people hold the phone one-handed, and the easiest reach is the bottom-centre arc. https://smashingmagazine.com/2016/09/the-thumb-zone-designing-for-mobile-users
- iOS Safari only plays audio after a user gesture. Create or `resume()` the AudioContext inside the gesture handler itself, ideally on `touchend` (`touchstart` can start a scroll). The context gets suspended when the user switches apps, so resume it on return. A mic grant does not unlock playback. https://bugs.webkit.org/show_bug.cgi?id=149367 · https://bugs.webkit.org/show_bug.cgi?id=276016
- Safe areas: insets read as 0 unless the viewport meta has `viewport-fit=cover`. Pad the fixed bottom bar with `env(safe-area-inset-bottom)`. Use `dvh`/`svh` (iOS 15.4+), and expect layout jumps when the toolbar collapses. https://blog.openreplay.com/5-mobile-web-papercuts-fixes/

**8. Visual language of AI and portfolio pages in 2026.**
- Typography: a serif headline over a neutral sans. Geist + Instrument Serif is the most-cited AI/SaaS pairing. Geist Mono suits small technical labels. https://madegooddesigns.com/?p=152093 · https://muz.li/blog/font-pairings-2026/
- Dark mode: build a real dark palette (not inverted colours) and keep contrast in check. https://line25.com/?p=45415

## Do / Don't

| Do | Don't |
|---|---|
| Pair the orb with a visible text label for each state ("Listening…", "Thinking…", "Tap to stop") | Rely on animation or colour alone to show state |
| Stream the answer as captions while it is spoken | Make audio the only output (often muted on phones, in offices) |
| Make "stop" a single large tap during speaking, and support Esc | Hide interruption in a menu or require a long press |
| Explain the mic before the browser asks, and keep text input visible | Call `getUserMedia` on page load |
| Treat permission-denied as a designed screen with steps | Retry `getUserMedia` after a Block (it fails silently) |
| Unlock audio inside the first tap on the mic | Create the AudioContext after an `await` |
| Swap motion for opacity/scale-free cues under reduced motion | Run endless looping blobs with no pause |
| Keep the primary control at the bottom centre, 64–80px, above the safe area | Put the mic at the top or in a corner |
| Label speakers with text ("You" / "Adil") | Tell speakers apart by bubble colour only |

## Recommendations for this app (ranked by impact)

1. **Make one bottom-centre mic control the hero (72–80px tap target).** Tap to toggle and hold for push-to-talk. During speaking it becomes a "Stop" square. Put a short text status line directly above it.
2. **Unlock audio inside the mic tap.** Resume the shared AudioContext synchronously on the first gesture, and resume again on `visibilitychange`. If iOS stays silent, fall back to an `<audio>` element. Without this, replies are silent on iPhones.
3. **Stream captions in the transcript as the answer plays,** with "You" / "Adil" labels and a subtle highlight on the turn being spoken. Recruiters on mute still get the answer.
4. **Add a mic pre-prompt card:** "Ask Adil out loud. We'll need your microphone." with an "Allow microphone" button and a "Type instead" link. On NotAllowedError, show Safari/Chrome steps and focus the text input.
5. **Give each state a distinct, calm signature.** Idle: slow breathing glow. Listening: orb scales with the live mic RMS. Transcribing/thinking: rotating shimmer or three dots. Speaking: the orb pulses with output amplitude. Error: a static amber ring.
6. **Show sample-question chips above the input as the first-run empty state.** Tapping one runs the full flow, which is a zero-risk demo for people unsure about speaking.
7. **Accessibility wiring:**
   - The status line is an `aria-live="polite"` region; the transcript is `role="log"`.
   - Space held = push-to-talk when focus is not in the input; Esc = stop.
   - Visible focus rings, and the mic button exposes `aria-pressed` and its label.
8. **Reduced motion:** replace the scaling orb with an opacity pulse and a static level bar, and keep the text labels.
9. **Typography:** an Instrument Serif (or Newsreader) headline such as "Interview Adil, out loud." over Geist sans, with Geist Mono for small meta ("Transcribing · 1.2s").
10. **Colour:** dark-first near-black (`#0B0B0F`) with one accent gradient (e.g. teal→indigo) used only on the orb and the active state. Provide a light theme via `prefers-color-scheme`. Body text contrast should be at least 4.5:1.
11. **Mobile layout:**
    - `viewport-fit=cover`, `min-h-dvh`, and a fixed bottom dock padded with `env(safe-area-inset-bottom)`.
    - Chips scroll horizontally in a single row.
    - Collapse "How it works" by default and put it below the transcript.
12. **Interruption polish:** a tap during speaking stops the audio immediately, marks the turn "(stopped)", and returns to idle within 150ms. A network failure marks the turn as partial with a Retry chip.
