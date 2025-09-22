import { createRoot } from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Failed to find root element");
}

createRoot(container).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
