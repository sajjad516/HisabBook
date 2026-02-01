import { auth } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


const provider = new GoogleAuthProvider();

function showMsg(el, msg, type="error"){
  el.innerText = msg;
  el.className = "auth-msg " + type;
  el.style.display = "block";

  // 🔧 FIX: 3 সেকেন্ড পর message hide
  setTimeout(() => {
    el.style.display = "none";
  }, 3000);
}

function getAuthErrorMessage(error){
  switch(error.code){
    case "auth/invalid-credential":
      return "ইমেইল বা পাসওয়ার্ড ভুল হয়েছে";
    case "auth/user-not-found":
      return "এই ইমেইলে কোন একাউন্ট নেই";
    case "auth/wrong-password":
      return "পাসওয়ার্ড সঠিক নয়";
    case "auth/email-already-in-use":
      return "এই ইমেইল দিয়ে আগে একাউন্ট আছে";
    case "auth/weak-password":
      return "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে";
    case "auth/invalid-email":
      return "ইমেইল ফরম্যাট সঠিক নয়";
    default:
      return "কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন";
  }
}

/* =========================
   REGISTER
========================= */
const registerBtn = document.getElementById("registerBtn");
const registerMsg = document.getElementById("registerMsg");
const loginMsg = document.getElementById("loginMsg");

if (registerBtn) {
  registerBtn.addEventListener("click", () => {
    const email = document.getElementById("regEmail").value;
    const password = document.getElementById("regPassword").value;

    createUserWithEmailAndPassword(auth, email, password)
      .then(() => {
        showMsg(registerMsg,"Account created successfully","success");
        setTimeout(()=>location.href="index.html",1200);
      })
      .catch((error) => {
        showMsg(registerMsg, getAuthErrorMessage(error), "error");
      });
  });
}

/* =========================
   LOGIN
========================= */
const rememberMe = document.getElementById("rememberMe");
const loginBtn = document.getElementById("loginBtn");

if (loginBtn) {
  loginBtn.addEventListener("click", () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const persistence = (rememberMe && rememberMe.checked)
      ? browserLocalPersistence
      : browserSessionPersistence;

    setPersistence(auth, persistence)
      .then(() => signInWithEmailAndPassword(auth, email, password))
      .then(() => {

        // শুধু Email autofill (optional)
        if (rememberMe && rememberMe.checked) {
          localStorage.setItem("rememberEmail", email);
        } else {
          localStorage.removeItem("rememberEmail");
        }

        showMsg(loginMsg, "Login successful", "success");
        setTimeout(() => location.href = "dashboard.html", 800);
      })
      .catch((error) => {
        showMsg(loginMsg, getAuthErrorMessage(error), "error");
      });
  });
}

/* 🔧 FIX: Page load এ auto fill */
const savedEmail = localStorage.getItem("rememberEmail");
if (savedEmail) {
  const emailInput = document.getElementById("email");
  if (emailInput) emailInput.value = savedEmail;
  if (rememberMe) rememberMe.checked = true;
}

/* 👁 Password toggle */
window.togglePassword = (id) => {
  const input = document.getElementById(id);
  const eye = input.nextElementSibling; // 👁 span

  if (!input || !eye) return;

  if (input.type === "password") {
    input.type = "text";
    eye.innerText = "🙈";
  } else {
    input.type = "password";
    eye.innerText = "👁";
  }
};


/* =========================
   RESET PASSWORD (MODAL)
========================= */
const forgotBtn = document.getElementById("forgotPassword");
const resetModal = document.getElementById("resetModal");
const closeReset = document.getElementById("closeReset");
const resetBtn = document.getElementById("resetBtn");
const resetMsg = document.getElementById("resetMsg");

if (forgotBtn) {
  forgotBtn.addEventListener("click", () => {
    resetModal.classList.remove("hidden");
    resetMsg.style.display = "none";
  });
}

if (closeReset) {
  closeReset.addEventListener("click", () => {
    resetModal.classList.add("hidden");
  });
}

if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    const email = document.getElementById("resetEmail").value;

    if (!email) {
      showMsg(resetMsg, "ইমেইল দিন", "error");
      return;
    }

    sendPasswordResetEmail(auth, email)
      .then(() => {
        showMsg(
          resetMsg,
          "পাসওয়ার্ড রিসেট লিংক ইমেইলে পাঠানো হয়েছে",
          "success"
        );
      })
      .catch((error) => {
        showMsg(resetMsg, getAuthErrorMessage(error), "error");
      });
  });
}



/* continue with google for sign in */
const googleBtn = document.getElementById("googleLogin");

if (googleBtn) {
  googleBtn.addEventListener("click", () => {
    signInWithPopup(auth, provider)
      .then(() => {
        window.location.href = "dashboard.html";
      })
      .catch((error) => {
        alert(error.message);
      });
  });
}

/* পাসওয়ার্ড শক্তিশালী করার জন্য */
const regPassword = document.getElementById("regPassword");
const strengthBar = document.querySelector(".strength-bar");
const strengthText = document.getElementById("strengthText");

if(regPassword){
  regPassword.addEventListener("input", () => {
    const val = regPassword.value;
    let strength = 0;

    if(val.length >= 6) strength++;
    if(/[A-Z]/.test(val)) strength++;
    if(/[0-9]/.test(val)) strength++;
    if(/[^A-Za-z0-9]/.test(val)) strength++;

    if(val.length === 0){
      strengthBar.style.width = "0%";
      strengthText.innerText = "";
      return;
    }

    if(strength <= 1){
      strengthBar.style.width = "25%";
      strengthBar.style.background = "#dc2626";
      strengthText.innerText = "Weak password";
    }else if(strength === 2){
      strengthBar.style.width = "50%";
      strengthBar.style.background = "#f59e0b";
      strengthText.innerText = "Medium password";
    }else if(strength === 3){
      strengthBar.style.width = "75%";
      strengthBar.style.background = "#22c55e";
      strengthText.innerText = "Strong password";
    }else{
      strengthBar.style.width = "100%";
      strengthBar.style.background = "#16a34a";
      strengthText.innerText = "Very strong password";
    }
  });
}
