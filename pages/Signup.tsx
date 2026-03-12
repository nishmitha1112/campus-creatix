import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { parseEmail } from "../services/authService";
import { useNavigate } from "react-router-dom";
import { Input, Button, Card } from "../components/Common";
import { AlertCircle } from "lucide-react";

const Signup: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const parsed = parseEmail(email);

    if (!parsed) {
      setError("Please use official SNIST email (@sreenidhi.edu.in)");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const uid = userCredential.user.uid;

      const newUser = {
        uid,
        email,
        displayName: name,
        role: parsed.role,
        rollNumber: parsed.rollNumber || "",
        branch: parsed.branch || "",
        joinedDate: new Date().toISOString(),
        likes: 0,
        rating: 0,
        score: 0,
      };

      await setDoc(doc(db, "users", uid), newUser);

      navigate("/login");
    } catch (err: any) {
      setError(err?.message || "Signup failed");
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
            Create your SNIST account
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-[var(--danger)] p-3 rounded-md flex items-center gap-2 mb-6 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">

          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <Input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">SNIST Email</label>
            <Input
              type="email"
              placeholder="21311A0501@cse.sreenidhi.edu.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <Input
              type="password"
              placeholder="Create password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating Account..." : "Sign Up"}
          </Button>

        </form>

        <p className="text-center text-sm mt-6 text-[var(--text-muted)]">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-[var(--accent-primary)] cursor-pointer font-medium"
          >
            Login
          </span>
        </p>

      </Card>
    </div>
  );
};

export default Signup;