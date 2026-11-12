import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ToastProvider } from "./components/common/Toast";
import { AuthProvider } from "./context/AuthContext";
import { AppStateProvider } from "./context/AppState";
import "./styles/index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ToastProvider>
      <AuthProvider>
        <AppStateProvider>
          <App />
        </AppStateProvider>
      </AuthProvider>
    </ToastProvider>
  </StrictMode>
);
