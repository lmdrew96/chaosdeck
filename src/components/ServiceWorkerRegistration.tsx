"use client";

import { useEffect } from "react";

// Gated to production: registering the SW against Turbopack's dev output
// would cache half-built assets and fight the dev server's own HMR.
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
