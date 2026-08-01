"use client";

const SYMBOL_COLORS: Record<string, string> = {
  W: "bg-[#fff6eb] text-[#4f3b1f] border-[#d7c39c]",
  U: "bg-[#0080ff] text-[#05111d] border-[#8eb7e8]",
  B: "bg-[#141414] text-[#f7f2ea] border-[#1f1f1f]",
  R: "bg-[#ff0000] text-[#120505] border-[#d68d8d]",
  G: "bg-[#00ff91] text-[#2a5f2f] border-[#97c68b]",
  X: "bg-[#ece8f7] text-[#4e3f79] border-[#b9b0d4]",
  C: "bg-[#f3ebff] text-[#5a2d9d] border-[#c8a9f0]",
  T: "bg-[#fff8c6] text-[#6b5a0f] border-[#d8c365]",
  P: "bg-[#f7e9ff] text-[#6a3d93] border-[#c999ec]",
};

const NUMBER_COLORS = "bg-[#2f2f2f] text-[#f8f5ef] border-[#535353]";

export default function ManaCost({ cost, className }: { cost?: string; className?: string }) {
  if (!cost) return null;

  const symbols = cost.match(/\{[^}]+\}/g) ?? [];
  if (symbols.length === 0) {
    return <span className={className}>{cost}</span>;
  }

  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${className ?? ""}`.trim()}>
      {symbols.map((symbol, index) => {
        const value = symbol.slice(1, -1);
        const isNumber = /^\d+$/.test(value);
        const colorClass = isNumber ? NUMBER_COLORS : SYMBOL_COLORS[value] ?? SYMBOL_COLORS.X;

        return (
          <span
            key={`${symbol}-${index}`}
            className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold uppercase ${colorClass}`}
            title={symbol}
          >
            {value}
          </span>
        );
      })}
    </span>
  );
}
