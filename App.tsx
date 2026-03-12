import React, { useEffect, useState } from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import StudentDashboard from "./pages/StudentDashboard";
import FacultyDashboard from "./pages/FacultyDashboard";
import { Spinner } from "./components/Common";

const App: React.FC = () => {

const [user, setUser] = useState<FirebaseUser | null>(null);
const [role, setRole] = useState<string | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {

const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {

  if (!firebaseUser) {
    setUser(null);
    setRole(null);
    setLoading(false);
    return;
  }

  setUser(firebaseUser);

  try {

    const snap = await getDoc(doc(db, "users", firebaseUser.uid));

    if (snap.exists()) {
      const data = snap.data();
      setRole(data.role);
    }

  } catch (err) {
    console.error("Role fetch error:", err);
  }

  setLoading(false);

});

return () => unsubscribe();


}, []);

if (loading) {
return ( <div className="min-h-screen flex items-center justify-center"> <Spinner /> </div>
);
}

return (


<Router>

  <Routes>

    {/* Login */}
    <Route
  path="/login"
  element={!user ? <Login /> : <Navigate to="/" />}
/>
   <Route
  path="/signup"
  element={!user ? <Signup /> : <Navigate to="/" />}
/>

    {/* Student Dashboard */}
    <Route
      path="/student/*"
      element={user && role === "student"
        ? <StudentDashboard />
        : <Navigate to="/login" />}
    />

    {/* Faculty Dashboard */}
    <Route
      path="/faculty/*"
      element={user && role === "faculty"
        ? <FacultyDashboard />
        : <Navigate to="/login" />}
    />
<Route
  path="/"
  element={
    !user ? (
      <Navigate to="/login" />
    ) : role === null ? (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    ) : role === "faculty" ? (
      <Navigate to="/faculty/home" />
    ) : (
      <Navigate to="/student/home" />
    )
  }
/>
   
  </Routes>

</Router>


);

};

export default App;

