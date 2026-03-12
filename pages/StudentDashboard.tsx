import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Header from "../components/Header";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { User } from "../types";

import StudentHome from "./StudentHome";
import Feed from "./Feed";
import Leaderboard from "./Leaderboard";
import Messages from "./Messages";
import Profile from "./Profile";
import { Spinner } from "../components/Common";

const StudentDashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      if (!auth.currentUser) return;

      const userRef = doc(db, "users", auth.currentUser.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        setUser(snap.data() as User);
      }
    };

    fetchUser();
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)]">
      <Header user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="home" element={<StudentHome user={user} />} />
          <Route path="feed" element={<Feed userRole="student" userId={user.uid} />} />
          <Route path="leaderboard" element={<Leaderboard userRole="student" />} />
          <Route path="messages" element={<Messages user={user} />} />
          <Route path="profile" element={<Profile user={user} />} />
          <Route path="/" element={<Navigate to="home" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default StudentDashboard;