"use client";

interface Props {
  insights?: { headline: string; body: string[]; asOf: string };
  className?: string;
}

export default function InsightsCard({ insights, className }: Props) {
  // Don't return null when calibrating — that breaks hero balance.
  if (!insights) {
    return (
      <section className={`rounded-lg border border-border bg-surface p-5 ${className ?? ""}`}>
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-subtle">
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
      className={`rounded-lg border border-border bg-surface p-5 sm:p-6 ${className ?? ""}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-subtle">
          Worth flagging
        </h2>
        <time
          dateTime={insights.asOf}
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle"
        >
          {insights.asOf}
        </time>
      </div>
      <h3 className="mt-2.5 text-[20px] sm:text-[22px] leading-snug font-medium text-fg tracking-tightish">
        {insights.headline}
      </h3>
      <div className="mt-3 space-y-3 text-[14.5px] leading-relaxed text-fg-muted">
        {insights.body.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </section>
  );
}
