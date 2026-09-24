// apps/web/src/App.tsx
import { useEffect, useState } from "react";
import { apiFetch } from "./lib/api-client";

type HealthResponse = {
  status: string;
  postgres: boolean;
  redis: boolean;
};

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiFetch<HealthResponse>("/health")
      .then(setHealth)
      .catch(() => setError(true));
  }, []);

  const healthy = health?.status === "ok";

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">
          Gateway Health
        </h1>

        <p className={healthy ? "text-green-600" : "text-red-600"}>
          {error
            ? "🔴 Gateway unavailable"
            : healthy
              ? "🟢 Everything is healthy"
              : "🔴 Dependency unavailable"}
        </p>
      </div>
    </main>
  );
}

export default App;