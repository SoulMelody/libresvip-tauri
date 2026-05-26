import { Suspense, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Box, CircularProgress } from "@mui/material";
import { App } from "./App";
import { MemoryRouter } from 'react-router';

const elem = document.getElementById("root")!;

function AppBoot() {
  useEffect(() => {
    const splash = document.getElementById("boot-splash");
    if (!splash) {
      return;
    }
    splash.classList.add("hidden");
    const timeoutId = window.setTimeout(() => splash.remove(), 220);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return <App />;
}

function InitialFallback() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        bgcolor: "background.default",
        color: "text.primary",
      }}
    >
      <CircularProgress color="inherit" size={28} />
    </Box>
  );
}

const app = (
  <MemoryRouter initialEntries={['/']}>
    <Suspense fallback={<InitialFallback />}>
      <AppBoot />
    </Suspense>
  </MemoryRouter>
);

if (import.meta.hot) {
  // With hot module reloading, `import.meta.hot.data` is persisted.
  const root = (import.meta.hot.data.root ??= createRoot(elem));
  root.render(app);
} else {
  // The hot module reloading API is not available in production.
  createRoot(elem).render(app);
}
