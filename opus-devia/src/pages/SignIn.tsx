import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import logo from "../assets/logo.png";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      const onboardingComplete =
        data.session?.user?.user_metadata?.onboarding_complete;

      navigate(onboardingComplete ? "/home" : "/onboarding", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Connection failed. Check your env configuration."
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 auth-bg">
      <div className="w-full max-w-sm flex flex-col gap-5 auth-card">
        {/* Logo */}
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

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-center auth-footer-link">
          Don't have an account?{" "}
          <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
