import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAWqZaEEMpZ1P_dFaEdYRvds6VfDqpaTII",
  authDomain: "insightbase-e9b6a.firebaseapp.com",
  projectId: "insightbase-e9b6a",
  storageBucket: "insightbase-e9b6a.firebasestorage.app",
  messagingSenderId: "731425052284",
  appId: "1:731425052284:web:8c2605107b91e26f4a1bf9",
  measurementId: "G-W6CWL9Y5D9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
