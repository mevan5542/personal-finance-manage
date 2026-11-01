import { useState } from "react";

export default function RegisterForm({ onBackToLogin }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);

  async function handleRegister(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const fields = new FormData(form);

    const password = fields.get("password");
    const confirmPassword = fields.get("confirmPassword");

    if (password !== confirmPassword) {
      setMessage("The passwords do not match.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: fields.get("name"),
            email: fields.get("email"),
            password,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed.");
      }

      form.reset();
      setCreated(true);
      setMessage(data.message);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <p className="eyebrow">A FRESH START</p>
      <h2 id="login-title">Create your account.</h2>
      <p className="muted">Take the first step towards clearer finances.</p>

      {!created && (
        <form className="login-form" onSubmit={handleRegister}>
          <label htmlFor="register-name">Your name</label>
          <input
             id="register-name"
             name="name"
             type="text"
             autoComplete="name"
             minLength={2}
             maxLength={80}
             required
          />

          <label htmlFor="register-email">Email address</label>
          <input
            id="register-email"
            name="email"
            type="email"
            autoComplete="username"
            maxLength={254}
            required
          />

          <label htmlFor="register-password">Password</label>
          <input
               id="register-password"
               name="password"
               type="password"
               autoComplete="new-password"
               minLength={15}
               maxLength={128}
               aria-describedby="password-help"
               required
          />
          <small id="password-help">
            Use 15–128 characters. A long, memorable passphrase works well.
          </small>

          <label htmlFor="register-confirm">Confirm password</label>
          <input
               id="register-confirm"
               name="confirmPassword"
               type="password"
               autoComplete="new-password"
               minLength={15}
               maxLength={128}
               required
          />

          <button
            className="button button-primary"
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>
      )}

      <p className="form-notice" role="status">
        {message}
      </p>

      <button className="text-button" type="button" onClick={onBackToLogin}>
        Back to login
      </button>
    </>
  );
}
