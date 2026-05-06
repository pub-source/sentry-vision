import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installModelCache } from "./lib/modelCache";

// Install the ML model cache as early as possible so the very first
// COCO-SSD / face-api fetches can be intercepted and persisted.
installModelCache();

createRoot(document.getElementById("root")!).render(<App />);
