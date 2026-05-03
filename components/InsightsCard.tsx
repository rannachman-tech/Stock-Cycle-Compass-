"use client";

interface Props {
  insights?: { headline: string; body: string[]; asOf: string };
  className?: string;
}

export default function InsightsCard({ insights, className }: Props) {
  // Don't return null when calibrating — that breaks hero balance.
  if (!insights) {
    return (
      <section className={`rounded-xl border border-border/80 bg-surface p-5 ${className ?? ""}`}>
        <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg-subtle">
          Worth flagging
        </h2>
        <p className="mt-3 text-fg-muted leading-relaxed">
          Insights resume once today's data finishes calibrating.
        </p>
      </section>
    );
  }

  return (
    <section
      className={`rounded-xl border border-border/80 bg-surface p-5 sm:p-6 ${className ?? ""}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg-subtle">
          Worth flagging
        </h2>
        <time
          dateTime={insights.asOf}
          className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle/70 tabular-nums"
        >
          {insights.asOf}
        </time>
      </div>
      <h3 className="mt-3 text-[20px] sm:text-[22px] leading-[1.35] font-medium text-fg tracking-tightish">
        {insights.headline}
      </h3>
      <div className="mt-3.5 space-y-3 text-[14px] leading-[1.65] text-fg-muted">
        {insights.body.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </section>
  );
}
