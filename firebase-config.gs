import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBiP8g18Ev_7yv05-etUcKRLa-P6xOsh8I",
  authDomain: "brain-flow-master.firebaseapp.com",
  databaseURL: "https://brain-flow-master-default-rtdb.firebaseio.com",
  projectId: "brain-flow-master",
  storageBucket: "brain-flow-master.firebasestorage.app",
  messagingSenderId: "137353474062",
  appId: "1:137353474062:web:b53db8e1cde4c341740c5f",
  measurementId: "G-XHCEYHY37W"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getDatabase(app);
