import React, { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { Input, Button, Card } from "../components/Common";
import { parseEmail } from "../services/authService";
import { AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => {
    if (!parseEmail(email)) {
      setError("Please use official SNIST email (@sreenidhi.edu.in)");
      return false;
    }
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateEmail(email)) return;

    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError("Invalid email or password");
    }

    setLoading(false);
  };

 const handleGoogleLogin = async () => {
  setError("");
  setLoading(true);

  try {
    const result = await signInWithPopup(auth, googleProvider);

    const email = result.user.email;

    const parsed = email ? parseEmail(email) : null;

    if (!parsed) {
      await auth.signOut();
      setError("Only SNIST email accounts are allowed.");
      setLoading(false);
      return;
    }

  } catch (err) {
    setError("Google sign in failed");
  }

  setLoading(false);
};
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--accent-primary)] mb-2">
            CampusCreatix
          </h1>
          <p className="text-[var(--text-muted)]">
            SNIST Creative Dashboard
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-[var(--danger)] p-3 rounded-md flex items-center gap-2 mb-6 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <Input
              type="email"
              placeholder="rollnumber@branch.sreenidhi.edu.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              Or continue with
            </span>
          </div>
        </div>

\<Button
  variant="outline"
  className="w-full"
  onClick={handleGoogleLogin}
  disabled={loading}
>
  <img
    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
    alt="Google"
    className="w-5 h-5 mr-2"
  />
  Google Sign In
</Button>

<p className="text-center text-sm mt-4 text-[var(--text-muted)]">
  Don't have an account?{" "}
  <span
    onClick={() => navigate("/signup")}
    className="text-[var(--accent-primary)] cursor-pointer font-medium"
  >
    Sign Up
  </span>
</p>

</Card>
     
    </div>
  );
};

export default Login;