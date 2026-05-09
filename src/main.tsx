import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installModelCache, prefetchModels } from "./lib/modelCache";

// Install the ML model cache as early as possible so the very first
// COCO-SSD / face-api fetches can be intercepted and persisted.
(async () => {
  // Request persistent storage permission so the browser keeps our
  // cached model assets and cookies across sessions on every device.
  try {
    if (navigator.storage?.persist) {
      const already = await navigator.storage.persisted?.();
      if (!already) await navigator.storage.persist();
    }
  } catch {}
  await installModelCache();
  // Auto warm-up: prefetch ML models in the background once the app opens
  // so the first Start runs with everything already cached.
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => prefetchModels(), { timeout: 4000 });
  } else {
    setTimeout(() => prefetchModels(), 1500);
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
