type P = { className?: string };

const stroke = { fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, "aria-hidden": true };

export const MicIcon = ({ className }: P) => (
  <svg className={className} viewBox="0 0 24 24" strokeWidth={1.8} {...stroke}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
  </svg>
);

export const StopIcon = ({ className }: P) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden>
    <rect x="7" y="7" width="10" height="10" rx="2.5" fill="currentColor" />
  </svg>
);

export const MicOffIcon = ({ className }: P) => (
  <svg className={className} viewBox="0 0 24 24" strokeWidth={1.8} {...stroke}>
    <path d="M9 9v2a3 3 0 0 0 5.1 2.1M15 9.3V5a3 3 0 0 0-5.8-1" />
    <path d="M5.5 11a6.5 6.5 0 0 0 11 4.6M18.5 11c0 .6-.1 1.2-.2 1.7M12 17.5V21M3 3l18 18" />
  </svg>
);

export const ArrowIcon = ({ className, width = 2 }: P & { width?: number }) => (
  <svg className={className} viewBox="0 0 24 24" strokeWidth={width} strokeLinejoin="round" {...stroke}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const TrashIcon = ({ className }: P) => (
  <svg className={className} viewBox="0 0 24 24" strokeWidth={1.8} {...stroke}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </svg>
);

export const KeyboardIcon = ({ className }: P) => (
  <svg className={className} viewBox="0 0 24 24" strokeWidth={1.7} {...stroke}>
    <rect x="3" y="6" width="18" height="12" rx="3" />
    <path d="M7 10h.01M11 10h.01M15 10h.01M8 14h8" />
  </svg>
);

export const ChevronIcon = ({ className }: P) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" strokeWidth={2} {...stroke}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const CloseIcon = ({ className }: P) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" strokeWidth={2} {...stroke}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const GitHubIcon = ({ className }: P) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9V21c0 .3.2.6.7.5A10 10 0 0 0 12 2z" />
  </svg>
);

export const AlertIcon = ({ className }: P) => (
  <svg className={className} viewBox="0 0 24 24" strokeWidth={1.8} {...stroke}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.5h.01" />
  </svg>
);
