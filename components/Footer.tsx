import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 flex flex-wrap items-center justify-between gap-4">
        <div className="text-[12px] text-fg-subtle leading-relaxed max-w-xl">
          Stock Cycle Compass reads the equity cycle from valuation, sentiment, breadth and macro signals.
          It is a thinking aid, not a recommendation. Always consider your own circumstances and risk tolerance.
        </div>
        <nav className="flex items-center gap-4 text-[12px]">
          <Link href="/methodology" className="text-fg-muted hover:text-fg">Methodology</Link>
          <Link href="/about" className="text-fg-muted hover:text-fg">About</Link>
          <a href="https://www.etoro.com/customer-service/regulation-license/" target="_blank" rel="noreferrer" className="text-fg-muted hover:text-fg">
            Regulation
          </a>
        </nav>
      </div>
    </footer>
  );
}
