import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import logo from "../assets/logo.png";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // If a session is returned immediately (email confirmation disabled),
      // redirect based on onboarding status.
      if (data.session) {
        const onboardingComplete =
          data.session.user?.user_metadata?.onboarding_complete;

        navigate(onboardingComplete ? "/home" : "/onboarding", {
          replace: true,
        });
      } else {
        // Email confirmation required — stay on page
        setLoading(false);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Connection failed.";

      // Provide a clearer hint for common network/DNS issues
      if (msg === "Failed to fetch" || /could not be resolved/i.test(msg)) {
        setError(
          "Unable to reach Supabase. Check `VITE_SUPABASE_URL` in opus-devia/.env and your network/DNS settings."
        );
      } else {
        setError(msg ?? "Connection failed. Check your env configuration.");
      }

      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 auth-bg">
      <div className="w-full max-w-sm p-8 flex flex-col gap-5 auth-card">
        {/* Logo – no container, screen blend to kill PNG black background */}
        <img
          src={logo}
          alt="Opus Devia"
          className="auth-logo mx-auto block select-none"
        />

        {/* Tagline */}
        <p className="auth-tagline -mt-2">Your path. Proven by you.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="auth-input"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="auth-input"
          />

          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="auth-input"
          />

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="text-center auth-footer-link">
          Already have an account?{" "}
          <Link to="/signin">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
