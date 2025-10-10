"use client";

import { Toaster } from "react-hot-toast";

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        // Default options
        duration: 4000,
        style: {
          background: "rgba(26, 26, 46, 0.95)",
          color: "#fff",
          border: "1px solid rgba(124, 58, 237, 0.3)",
          borderRadius: "12px",
          backdropFilter: "blur(10px)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        },
        // Success
        success: {
          duration: 3000,
          iconTheme: {
            primary: "#10b981",
            secondary: "#fff",
          },
          style: {
            border: "1px solid rgba(16, 185, 129, 0.3)",
          },
        },
        // Error
        error: {
          duration: 5000,
          iconTheme: {
            primary: "#ef4444",
            secondary: "#fff",
          },
          style: {
            border: "1px solid rgba(239, 68, 68, 0.3)",
          },
        },
        // Loading
        loading: {
          iconTheme: {
            primary: "#7c3aed",
            secondary: "#fff",
          },
          style: {
            border: "1px solid rgba(124, 58, 237, 0.3)",
          },
        },
      }}
    />
  );
}
