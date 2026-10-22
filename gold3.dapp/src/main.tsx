import { createRoot } from "react-dom/client";
import Root from "./Root.tsx";
import { initLocale } from "./locales";
import "./style.scss";

// Before the first render, so no `t` call runs without an active locale.
initLocale();

createRoot(document.getElementById("root")!).render(<Root />);
