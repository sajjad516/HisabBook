
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCDoE9LsFyWo0FF57jF65g4icbUDq8EuKw",
  authDomain: "hisab-962d6.firebaseapp.com",
  projectId: "hisab-962d6",
  storageBucket: "hisab-962d6.firebasestorage.app",
  messagingSenderId: "735969285988",
  appId: "1:735969285988:web:a913729e6b73727ce80c71"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Services
const auth = getAuth(app);
const db = getFirestore(app);

// Export
export { auth, db };
