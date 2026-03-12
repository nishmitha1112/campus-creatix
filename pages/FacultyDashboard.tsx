import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Header from "../components/Header";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { User } from "../types";

import FacultyHome from "./FacultyHome";
import Feed from "./Feed";
import Leaderboard from "./Leaderboard";
import Messages from "./Messages";
import Profile from "./Profile";
import Editor from "./Editor";
import { Spinner } from "../components/Common";

const FacultyDashboard: React.FC = () => {
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
          <Route path="home" element={<FacultyHome user={user} />} />
          <Route path="feed" element={<Feed userRole="faculty" userId={user.uid} />} />
          <Route path="editor/:postId" element={<Editor user={user} />} />
         <Route
  path="/leaderboard"
  element={user ? <Leaderboard userRole="faculty" user={user} /> : <Spinner />}
/>
          <Route path="messages" element={<Messages user={user} />} />
          <Route path="profile" element={<Profile user={user} />} />
          <Route path="/" element={<Navigate to="home" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default FacultyDashboard;