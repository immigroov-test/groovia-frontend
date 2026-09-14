export default function Loading() {
  return <main className="mx-auto max-w-6xl px-4 sm:px-6 py-14" aria-busy="true" aria-label="Loading page">
    <div className="h-4 w-28 animate-pulse rounded bg-brand-100" />
    <div className="mt-5 h-12 max-w-2xl animate-pulse rounded-lg bg-brand-100" />
    <div className="mt-4 h-5 max-w-xl animate-pulse rounded bg-brand-100" />
    <div className="mt-10 grid gap-4 sm:grid-cols-3">{[1,2,3].map((n) => <div key={n} className="h-56 animate-pulse rounded-[14px] border border-(--color-border) bg-white" />)}</div>
  </main>;
}
