import { useRef, useState } from "react";
import RegisterForm from "../components/RegisterForm";

const features = [
  {
      number: "01",
      title: "Understand your spending",
      description:
      "Bring your income and expenses together and see where your money goes.",
  },
  {
        number: "02",
        title: "Plan with confidence",
        description:
        "Set a monthly budget and make room for the things that matter to you.",
  },
  {
    number: "03",
    title: "Work towards your goals",
    description:
      "Build better money habits and plan for your next personal milestone.",
  },
];

export default function HomePage({ onLogin }) {
  const loginDialog = useRef(null);

  const [notice, setNotice] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  function openLogin() {
    setNotice("");
    setShowRegister(false);
    loginDialog.current.showModal();
  }

  function closeLogin() {
    loginDialog.current.close();
  }

  async function handleLogin(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const fields = new FormData(form);

    setLoginLoading(true);
    setNotice("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/login`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: fields.get("email"),
            password: fields.get("password"),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to log in.");
      }

      form.reset();
      closeLogin();
      onLogin(data.user);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoginLoading(false);
    }
  }

  return (
    <>
      <header className="site-header">
        <a className="brand" href="#home" aria-label="Ultimate Finance home">
          <span className="brand-icon" aria-hidden="true">
            U
          </span>
          <span>Ultimate Finance</span>
        </a>

        <nav aria-label="Main navigation">
          <a className="nav-link" href="#features">
            Features
          </a>

          <a className="nav-link" href="#how-it-works">
            How it works
          </a>

          <button
            className="button button-outline"
            type="button"
            onClick={openLogin}
          >
            Log in
          </button>
        </nav>
      </header>

      <main>
        <section id="home" className="hero">
          <div className="hero-copy">
            <p className="eyebrow">A LITTLE CLARITY. A LITTLE MORE CALM.</p>

            <h1>
              Your money.
              <br />A clearer picture.
            </h1>

            <p className="hero-description">
              Understand your spending, make a thoughtful plan, and take the
              next step towards your financial goals.
            </p>

            <button
              className="button button-primary"
              type="button"
              onClick={openLogin}
            >
              Get started <span aria-hidden="true">↗</span>
            </button>

            <p className="hero-note">
              Small steps today. More confidence tomorrow.
            </p>
          </div>

          <aside className="preview-card" aria-label="Example monthly summary">
            <div className="preview-heading">
              <span>Your monthly picture</span>
              <span className="sample-label">Example</span>
            </div>

            <p className="muted">Money remaining</p>
            <p className="preview-amount">LKR 35,000</p>

            <div className="preview-stats">
              <div>
                <span>Income</span>
                <strong>LKR 100,000</strong>
              </div>

              <div>
                <span>Expenses</span>
                <strong>LKR 65,000</strong>
              </div>
            </div>

            <div className="spending-label">
              <span>Income spent</span>
              <strong>65%</strong>
            </div>

            <progress
              className="spending-progress"
              value={65}
              max={100}
              aria-label="Example: 65 percent of income spent"
            >
              65%
            </progress>

            <p className="preview-footer">
              A simple view of what comes in and what goes out.
            </p>
          </aside>
        </section>

        <section id="features" className="section">
          <p className="eyebrow">MAKE SPACE FOR WHAT MATTERS</p>

          <h2>A simpler way to manage your money.</h2>

          <div className="feature-grid">
            {features.map((feature) => (
              <article className="feature-card" key={feature.number}>
                <span className="feature-number">{feature.number}</span>

                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="section how-section">
          <div>
            <p className="eyebrow">ONE HABIT AT A TIME</p>

            <h2>
              Start small.
              <br />
              See the bigger picture.
            </h2>
          </div>

          <ol className="steps">
            <li>
              <strong>Record your money</strong>
              <p>Add your income and everyday expenses.</p>
            </li>

            <li>
              <strong>Give it a plan</strong>
              <p>Set spending limits that fit your priorities.</p>
            </li>

            <li>
              <strong>Reflect and adjust</strong>
              <p>Review your month and decide what to change.</p>
            </li>
          </ol>
        </section>
      </main>

      <footer className="site-footer">
        <span>Ultimate Finance</span>
        <span>A calmer approach to everyday money.</span>
      </footer>

      <dialog
        ref={loginDialog}
        className="login-dialog"
        aria-labelledby="login-title"
      >
        <button
          className="close-button"
          type="button"
          onClick={closeLogin}
          aria-label="Close account window"
        >
          ×
        </button>

        {showRegister ? (
          <RegisterForm
            onBackToLogin={() => {
              setNotice("");
              setShowRegister(false);
            }}
          />
        ) : (
          <>
            <p className="eyebrow">YOUR NEXT CHAPTER</p>

            <h2 id="login-title">Welcome back.</h2>

            <p className="muted">Sign in to your personal finance manager.</p>

            <form className="login-form" onSubmit={handleLogin}>
              <label htmlFor="login-email">Email address</label>

              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="username"
                placeholder="you@example.com"
                required
              />

              <label htmlFor="login-password">Password</label>

              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />

              <button
                className="button button-primary"
                type="submit"
                disabled={loginLoading}
              >
                {loginLoading ? "Logging in..." : "Log in"}
              </button>
            </form>

            <p className="signup-prompt">
              New here?{" "}
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setNotice("");
                  setShowRegister(true);
                }}
              >
                Create an account
              </button>
            </p>

            <p className="form-notice" role="status">
              {notice}
            </p>
          </>
        )}
      </dialog>
    </>
  );
}
