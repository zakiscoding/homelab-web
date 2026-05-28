import Link from "next/link";

const nav = [
  { href: "/", label: "Overview" },
  { href: "/chat", label: "Chat" },
  { href: "/rag", label: "RAG" },
  { href: "/reactions", label: "Reactions" },
] as const;

export function Shell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-emerald-400/90">
              Homelab ML
            </p>
            <h1 className="text-lg font-semibold text-zinc-50">{title}</h1>
            {subtitle ? (
              <p className="mt-0.5 text-sm text-zinc-400">{subtitle}</p>
            ) : null}
          </div>
          <nav className="flex gap-1 rounded-lg bg-zinc-900/80 p-1 ring-1 ring-zinc-800">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-zinc-50"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
