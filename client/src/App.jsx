import { useEffect, useState } from "react";
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function checkSession() {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/auth/me`,
          {
            credentials: "include",
            signal: controller.signal,
          },
        );

        // No active session is normal before logging in.
        if (response.status === 401) {
          if (!controller.signal.aborted) {
            setUser(null);
          }
          return;
        }

        if (!response.ok) {
          throw new Error("Unable to check your session.");
        }

        const data = await response.json();

        if (!controller.signal.aborted) {
          setUser(data.user);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setSessionError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCheckingSession(false);
        }
      }
    }

    checkSession();

    return () => controller.abort();
  }, []);

  if (checkingSession) {
    return (
      <main className="section">
        <p role="status">Checking your session...</p>
      </main>
    );
  }

  if (sessionError) {
    return (
      <main className="section">
        <h2>We could not connect.</h2>
        <p role="alert">{sessionError}</p>
        <p className="muted">
          Check that the backend is running, then try again.
        </p>

        <button
          className="button button-primary"
          type="button"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </main>
    );
  }

  if (user) {
    return <DashboardPage user={user} onLogout={() => setUser(null)} />;
  }

  return <HomePage onLogin={setUser} />;
}
