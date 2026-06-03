import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA4yCWVCYVK74ELUF4LyILgmFBs0q8-K7c",
  authDomain: "vaultboy-projecet.firebaseapp.com",
  projectId: "vaultboy-projecet",
  storageBucket: "vaultboy-projecet.firebasestorage.app",
  messagingSenderId: "149287396818",
  appId: "1:149287396818:web:2e220da5f70d777007940b",
  measurementId: "G-8FJ4BPZ6EQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);
