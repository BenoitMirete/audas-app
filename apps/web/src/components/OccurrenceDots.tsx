const colorMap: Record<string, string> = {
  passed: 'bg-green-500',
  failed: 'bg-red-500',
  flaky: 'bg-orange-400',
  skipped: 'bg-slate-400',
};

export function OccurrenceDots({ occurrences }: { occurrences: Array<{ status: string }> }) {
  return (
    <div className="flex gap-1.5" aria-label="occurrence history">
      {occurrences.slice(-10).map((o, i) => (
        <span
          key={i}
          title={o.status}
          className={`w-3 h-3 rounded-full ${colorMap[o.status] ?? 'bg-slate-300'}`}
        />
      ))}
    </div>
  );
}
