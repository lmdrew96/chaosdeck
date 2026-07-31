/* eslint-disable @next/next/no-img-element */
"use client";

export type CardHoverFace = {
  name: string;
  imageUri?: string;
  oracleText?: string;
};

export type CardHoverPreviewData = {
  name: string;
  imageUri?: string;
  cardFaces?: CardHoverFace[];
  oracleText?: string;
  subtitle?: string;
};

type CardHoverPreviewProps = {
  card: CardHoverPreviewData | null;
  position: { top: number; left: number } | null;
};

export default function CardHoverPreview({ card, position }: CardHoverPreviewProps) {
  if (!card || !position) return null;

  const hasFaces = Boolean(card.cardFaces?.length);

  return (
    <div
      className="pointer-events-none fixed z-40 hidden w-[18rem] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-y-auto sm:block"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      <div className="overflow-hidden rounded-xl border border-foreground/15 bg-background/95 shadow-[0_24px_60px_rgba(0,0,0,0.32)] backdrop-blur-sm">
        <div className="flex flex-col gap-3 p-3">
          {hasFaces ? (
            <div className={`grid gap-2 ${card.cardFaces!.length > 1 ? "grid-cols-2" : ""}`}>
              {card.cardFaces!.map((face) => (
                <CardImage key={face.name} src={face.imageUri} alt={face.name} />
              ))}
            </div>
          ) : (
            <CardImage src={card.imageUri} alt={card.name} />
          )}

          <div className="space-y-1 text-xs text-ash-grey/80">
            <p className="font-semibold uppercase tracking-[0.18em] text-orchid-hush">{card.name}</p>
            {card.subtitle ? <p className="font-mono uppercase tracking-[0.16em] text-ash-grey/80">{card.subtitle}</p> : null}
            <p className="whitespace-pre-wrap text-sm leading-5 text-orchid-hush/90">{card.oracleText ?? "No oracle text available."}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CardImage({ src, alt }: { src?: string; alt: string }) {
  if (!src) {
    return <div className="flex min-h-64 items-center justify-center rounded-lg border border-foreground/10 px-4 py-6 text-sm text-ash-grey/80">No image available.</div>;
  }

  return <img src={src} alt={alt} className="w-full rounded-lg border border-foreground/10 shadow-[0_14px_30px_rgba(0,0,0,0.22)]" />;
}
