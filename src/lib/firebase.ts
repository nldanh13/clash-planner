import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "gen-lang-client-0532387840",
  appId: "1:539581123557:web:542ea1eacc8efb2a4e7d0c",
  apiKey: "AIzaSyCa9-6sMlOsFwQYTOfP5ZnXll0Nsdp44pg",
  authDomain: "gen-lang-client-0532387840.firebaseapp.com",
  storageBucket: "gen-lang-client-0532387840.firebasestorage.app",
  messagingSenderId: "539581123557",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
// Enable popup sign in on cross-origin iframe (AI Studio specific)
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const db = getFirestore(app, "ai-studio-clashplanner-0aa17f6a-3476-4bf0-8e29-4c4893fc0b8b");
