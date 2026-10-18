import { useEffect, useState, type FormEvent } from "react";
import { API_BASE_URL, apiFetch } from "./lib/api-client";
import "./App.css";

type AuthResponse = {
  accessToken: string;
};

type AuthMode = "login" | "register";

const oauthResult = new URLSearchParams(window.location.search).get("oauth");

function App() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessToken, setAccessToken] = useState(
    () => localStorage.getItem("accessToken") ?? "",
  );
  const [error, setError] = useState(() =>
    oauthResult === "error"
      ? "Google sign-in was unsuccessful. Please try again."
      : oauthResult === "not-configured"
        ? "Google sign-in is not configured yet."
        : "",
  );
  const [busy, setBusy] = useState(oauthResult === "success");

  useEffect(() => {
    if (!oauthResult) {
      return;
    }

    window.history.replaceState({}, "", window.location.pathname);
    if (oauthResult === "error" || oauthResult === "not-configured") {
      return;
    }

    apiFetch<AuthResponse>("/auth/refresh", { method: "POST" })
      .then(({ accessToken: token }) => {
        localStorage.setItem("accessToken", token);
        setAccessToken(token);
      })
      .catch((refreshError: unknown) => {
        setError(
          refreshError instanceof Error
            ? refreshError.message
            : "Could not finish Google sign-in.",
        );
      })
      .finally(() => setBusy(false));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const result = await apiFetch<AuthResponse>(path, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem("accessToken", result.accessToken);
      setAccessToken(result.accessToken);
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setError("");
    try {
      await apiFetch<void>("/auth/logout", { method: "POST" });
    } catch (signOutError: unknown) {
      setError(
        signOutError instanceof Error
          ? signOutError.message
          : "Could not sign out from this device.",
      );
    } finally {
      localStorage.removeItem("accessToken");
      setAccessToken("");
    }
  }

  if (accessToken) {
    return (
      <main className="auth-page">
        <section className="auth-card" aria-labelledby="welcome-title">
          <div className="brand-mark" aria-hidden="true">L</div>
          <p className="eyebrow">LETSTALK</p>
          <h1 id="welcome-title">You’re signed in</h1>
          <p className="description">
            Your account is ready. You can continue to LetsTalk.
          </p>
          <button className="secondary-button" onClick={signOut} type="button">
            Sign out
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="brand-mark" aria-hidden="true">L</div>
        <p className="eyebrow">LETSTALK</p>
        <h1 id="auth-title">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="description">
          {mode === "login"
            ? "Sign in to pick up where you left off."
            : "Join LetsTalk with your email or Google account."}
        </p>

        <a className="google-button" href={`${API_BASE_URL}/auth/google`}>
          <GoogleIcon />
          Continue with Google
        </a>

        <div className="divider"><span>or continue with email</span></div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Email address</label>
          <input
            autoComplete="email"
            id="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />

          <label htmlFor="password">Password</label>
          <input
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            id="password"
            minLength={8}
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />

          {error && <p className="error-message" role="alert">{error}</p>}

          <button className="primary-button" disabled={busy} type="submit">
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <p className="mode-switch">
          {mode === "login" ? "New to LetsTalk?" : "Already have an account?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
            type="button"
          >
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </section>
      <p className="page-note">Secure sign-in for your conversations</p>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="google-icon" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.73 7.18l7.66 5.94c4.47-4.13 7.11-10.21 7.11-17.59Z" />
      <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.88.93 7.55 2.56 10.78l7.97-6.19Z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.66-5.94c-2.13 1.43-4.86 2.28-8.24 2.28-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
    </svg>
  );
}

export default App;
