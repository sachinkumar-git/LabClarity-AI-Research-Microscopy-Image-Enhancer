export function Footer() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:px-6">
        <p>© {new Date().getFullYear()} LabClarity AI · For research use only.</p>
        <p>
          AI output may contain hallucinated structures. Always validate against the original
          data before drawing scientific conclusions.
        </p>
      </div>
    </footer>
  );
}
