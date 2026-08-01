export default function OfflinePage() {
  return (
    <div className="tech-page flex min-h-screen flex-1 items-center justify-center px-6 py-16">
      <div className="tech-panel flex max-w-sm flex-col gap-2 px-6 py-5 text-center">
        <h1 className="text-2xl font-semibold text-orchid-hush">You&apos;re offline</h1>
        <p className="text-sm text-ash-grey/80">ChaosDeck needs a connection to sync deck and game state. Reconnect and try again.</p>
      </div>
    </div>
  );
}
