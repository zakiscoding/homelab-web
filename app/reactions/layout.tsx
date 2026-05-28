/** Bypass stale static 404 cache for /reactions from pre-deploy builds */
export const dynamic = "force-dynamic";

export default function ReactionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
