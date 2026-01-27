import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/theme.css";
import "./styles/global.css";
import App from "./App.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";

import { CustomCursor } from "./components/ui/CustomCursor.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <CustomCursor />
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);
