import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import ToastContainer from "./components/Toast";
import ConfirmDialog from "./components/ConfirmDialog";
import AndroidBackHandler from "./components/AndroidBackHandler";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AndroidBackHandler />
        <App />
        <ToastContainer />
        <ConfirmDialog />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
