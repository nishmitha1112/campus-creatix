import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBHIvbEnHb6K4GEqwcUewqxJ3SMgOtpQpo",
  authDomain: "app1-42aaa.firebaseapp.com",
  projectId: "app1-42aaa",
  storageBucket: "app1-42aaa.firebasestorage.app",
  messagingSenderId: "57543408260",
  appId: "1:57543408260:web:e0703ea19b2dee2b5120d1",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Google Authentication Provider
export const googleProvider = new GoogleAuthProvider();