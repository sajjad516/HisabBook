import { auth, db } from "./firebase.js";
import {
  collection, addDoc, getDocs,
  doc, updateDoc, deleteDoc,
  query, where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { signOut, onAuthStateChanged }
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* DOM */
const list = document.getElementById("list");
const seeMoreBtn = document.getElementById("seeMoreBtn");
const loading = document.getElementById("loading");
const empty = document.getElementById("empty");

const monthInput = document.getElementById("monthFilter");
const amountInput = document.getElementById("amount");
const typeInput = document.getElementById("type");
const addBtn = document.getElementById("addBtn");
const addSection = document.getElementById("addSection");

const totalIncome = document.getElementById("totalIncome");
const totalExpense = document.getElementById("totalExpense");
const totalSaving = document.getElementById("totalSaving");
const balance = document.getElementById("balance");

const dailyIncome = document.getElementById("dailyIncome");
const dailyExpense = document.getElementById("dailyExpense");
const dailySaving = document.getElementById("dailySaving");

const alertCard = document.getElementById("alertCard");
const alertMessage = document.getElementById("alertMessage");
const alertClose = document.querySelector(".alert-close");

const editModal = document.getElementById("editModal");
const editType = document.getElementById("editType");
const editAmount = document.getElementById("editAmount");

const confirmModal = document.getElementById("confirmModal");

const logoutBtn = document.getElementById("logoutBtn");
const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");
const darkToggle = document.getElementById("darkToggle");
const muteBtn = document.getElementById("muteBtn");

const searchInput = document.getElementById("searchInput");
const typeFilter = document.getElementById("typeFilter");

// NEW: category
const categorySelect = document.getElementById("category");
let tempNote = "";


/* Sounds */
const alertSoundError = new Audio("../sounds/error.mp3");
const alertSoundSuccess = new Audio("../sounds/success.mp3");
alertSoundError.volume = 0.6;
alertSoundSuccess.volume = 0.8;

/* State */
let chartInstance = null;
let editId = null;
let deleteId = null;
let alertTimer = null;
const PREVIEW_LIMIT = 5;     // শুরুতে ৫টা রেকর্ড দেখাবে
let showAllRecords = false;  // লগইন/রিফ্রেশ হলে আবার false হবে
let isMuted = localStorage.getItem("mute") === "true";

// NEW: type → category map
const categoryMap = {
  income: ["স্যালারী", "ব্যবসা", "উপহার/বখশিস", "অন্যান্য"],
  expense: ["খাবার/বাজার 🍔","যাতায়াত খরচ 🚕","বাড়ি ভাড়া 🏠","শিক্ষা 📚","চিকিৎসা 💊","অন্যান্য"],
  saving: ["বিকাশ","নগদ","রকেট","ব্যাংক"]
};

// NEW: note modal
const noteModal = document.getElementById("noteModal");
const noteInput = document.getElementById("noteInput");

categorySelect.addEventListener("change", ()=>{
  const v = categorySelect.value;
  if(v === "অন্যান্য" || v === "ব্যাংক"){
    noteInput.value = "";
    noteModal.style.display = "block";
  }else{
    tempNote = "";
  }
});

window.saveNote = () => {
  tempNote = noteInput.value.trim();
  noteModal.style.display = "none";
};

window.closeNote = () => {
  tempNote = "";
  noteModal.style.display = "none";
};


/* Utils */
const today = () => new Date().toISOString().slice(0,10);
const currentMonth = () => today().slice(0,7);

monthInput.value = currentMonth();
monthInput.max = currentMonth();

// NEW: load category based on type
function loadCategory(){
  if(!categorySelect) return;

  const type = typeInput.value;
  const cats = categoryMap[type];

  categorySelect.innerHTML = "";

  cats.forEach(c=>{
    const opt = document.createElement("option");
    opt.value = c;
    opt.innerText = c;
    categorySelect.appendChild(opt);
  });
}

typeInput.addEventListener("change", loadCategory);
loadCategory(); // page load


menuBtn.onclick = () => {
  sidebar.classList.toggle("show");
  menuBtn.classList.toggle("active");
};


/* Mute */
function updateMuteUI(){
  if(!muteBtn) return;
  muteBtn.innerText = isMuted ? "🔇" : "🔊";
}
updateMuteUI();

if(muteBtn){
  muteBtn.onclick = () => {
    isMuted = !isMuted;
    localStorage.setItem("mute", isMuted);
    updateMuteUI();
  };
}

/* Alert */
function showAlert(msg, type="error"){
  const progress = alertCard.querySelector(".alert-progress");
  alertMessage.innerText = msg;

  alertCard.classList.remove("alert-success","alert-error");
  alertCard.classList.add(type === "success" ? "alert-success" : "alert-error");
  alertCard.style.display = "flex";

  if(!isMuted){
    const sound = type === "success" ? alertSoundSuccess : alertSoundError;
    sound.currentTime = 0;
    sound.play().catch(()=>{});
  }

  if(navigator.vibrate){
    navigator.vibrate(type === "error" ? [100,50,100] : 80);
  }

  progress.style.animation = "none";
  progress.offsetHeight;
  progress.style.animation = "alertProgress 2.5s linear forwards";

  clearTimeout(alertTimer);
  alertTimer = setTimeout(hideAlert, 2500);
}

function hideAlert(){
  alertCard.style.display = "none";
  clearTimeout(alertTimer);
}

if(alertClose){
  alertClose.addEventListener("click", hideAlert);
}

/* Dark */
if(localStorage.getItem("dark")==="true"){
  document.body.classList.add("dark");
}
darkToggle.onclick = () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("dark", document.body.classList.contains("dark"));
};

/* Sidebar */
menuBtn.onclick = () => sidebar.classList.toggle("show");

/* Load */
async function loadData(){
  loading.style.display="block";
  list.innerHTML="";
  empty.style.display="none";

  const search = searchInput.value.toLowerCase();
  const filterType = typeFilter.value;


  let income=0, expense=0, saving=0;
  let dIncome=0, dExpense=0, dSaving=0;
  let count = 0;
  
  if(!auth.currentUser){
    // console.log("User not logged in");
    return;
  }

  // const snap = await getDocs(collection(db,"hisab"));
  const q = query(
    collection(db,"hisab"),
    where("uid","==",auth.currentUser.uid)
  );

  const snap = await getDocs(q);

  snap.forEach(s=>{
    const d=s.data();
    if(d.uid!==auth.currentUser.uid) return;
    if(d.month!==monthInput.value) return;

    if(filterType !== "all" && d.type !== filterType) return;

    if(
      search &&
      !String(d.amount).includes(search) &&
      !d.type.includes(search)
    ) return;

    count++;

    /* ✅ 1) হিসাব সব রেকর্ড দিয়েই হবে (এখানে কোনো preview return থাকবে না) */
    if(d.type==="income") income+=d.amount;
    if(d.type==="expense") expense+=d.amount;
    if(d.type==="saving") saving+=d.amount;

    if(d.date.toDate().toISOString().slice(0,10)===today()){
      if(d.type==="income") dIncome+=d.amount;
      if(d.type==="expense") dExpense+=d.amount;
      if(d.type==="saving") dSaving+=d.amount;
    }

    /* ✅ 2) শুধু UI লিস্টটা preview mode এ ৫টার পর আর render করবে না */
    if (!showAllRecords && count > PREVIEW_LIMIT) {
      return; // NOTE: এখানে return মানে শুধু “এই রেকর্ডটা দেখাবে না”, হিসাব আগেই হয়ে গেছে
    }

    const dateObj = d.date?.toDate ? d.date.toDate() : new Date(d.date);

    const li = document.createElement("li");
    li.className = "record-row";
    li.setAttribute("data-type", d.type);

    const icon =
      d.type === "income" ? "⬆️" :
      d.type === "expense" ? "⬇️" :
      "💾";

    li.innerHTML = `
      <div class="record-left">
        <span class="record-type">${icon} ${d.type}</span>

        <span class="record-amount">৳ ${d.amount}</span>
        <span class="record-category">
          ${d.category}${d.note ? " • " + d.note : ""}
        </span>

        <span class="record-datetime">
          ${d.date.toDate().toLocaleDateString("en-GB")} • 
          ${d.date.toDate().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
        </span>
      </div>

      <div class="actions">
        <button onclick="openEdit('${s.id}','${d.type}',${d.amount})">✏️</button>
        <button onclick="openConfirm('${s.id}')">🗑</button>
      </div>
    `;

    list.appendChild(li);

  });

  loading.style.display="none";
  if (count === 0) empty.style.display = "block";
  // ✅ See more button show/hide
  if (seeMoreBtn) {
    // যদি total record preview limit এর বেশি হয় এবং এখনো showAllRecords না হয় → show
    seeMoreBtn.style.display = (!showAllRecords && count > PREVIEW_LIMIT) ? "block" : "none";
  }


  totalIncome.innerText=income;
  totalExpense.innerText=expense;
  totalSaving.innerText=saving;
  balance.innerText=Math.max(0,income-expense-saving);

  dailyIncome.innerText=dIncome;
  dailyExpense.innerText=dExpense;
  dailySaving.innerText=dSaving;

  addSection.style.display = monthInput.value===currentMonth()?"block":"none";

  /* ✅ গ্রাফ এখানেই কল হবে */
  renderChart(income, expense, saving);

  function renderChart(income, expense, saving){
  const ctx = document.getElementById("monthlyChart");
  if(!ctx) return;

  if(chartInstance){
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Income", "Expense", "Saving"],
      datasets: [{
        data: [income, expense, saving],
        backgroundColor: [
          "#16a34a",
          "#dc2626",
          "#2563eb"
        ],
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins:{
        legend:{ display:false }
      },
      scales:{
        y:{
          beginAtZero:true,
          ticks:{
            color: document.body.classList.contains("dark") ? "#e5e7eb" : "#0f172a"
          }
        },
        x:{
          ticks:{
            color: document.body.classList.contains("dark") ? "#e5e7eb" : "#0f172a"
          }
        }
      }
    }
  });
}
}

/* Add */
addBtn.onclick = async () => {

  if(!auth.currentUser){
    return showAlert("Login হয়নি","error");
  }

  const amount = Number(amountInput.value);
  const type = typeInput.value;

  if(!amount) return showAlert("Amount লিখুন","error");
  if(type!=="income" && amount>Number(balance.innerText))
    return showAlert("ইনকাম এর চেয়ে বেশি খরচ/সেভিংস করা যাবে না","error");

  await addDoc(collection(db,"hisab"),{
    uid: auth.currentUser.uid,
    amount,
    type,
    category: categorySelect.value,
    note: tempNote || "",
    month: monthInput.value,
    date: new Date()
  });


  amountInput.value="";
  loadData();
  showAlert("এন্ট্রি সফলভাবে যোগ হয়েছে","success");
};

/* Edit */
window.openEdit=(id,type,amount)=>{
  editId=id;
  editType.value=type;
  editAmount.value=amount;
  editModal.style.display="block";
};
window.updateEntry=async()=>{
  await updateDoc(doc(db,"hisab",editId),{
    amount:Number(editAmount.value),
    type:editType.value
  });
  editModal.style.display="none";
  loadData();
};
window.closeEditModal=()=>editModal.style.display="none";

/* Delete */
window.openConfirm=id=>{
  deleteId=id;
  confirmModal.style.display="block";
};
window.closeConfirm=()=>{
  deleteId=null;
  confirmModal.style.display="none";
};
window.confirmDelete=async()=>{
  await deleteDoc(doc(db,"hisab",deleteId));
  closeConfirm();
  loadData();
};

monthInput.onchange=loadData;
logoutBtn.onclick=()=>signOut(auth).then(()=>location.href="index.html");

// loadData();
onAuthStateChanged(auth, (user) => {
  if(!user){
    location.href = "index.html";
    return;
  }
  showAllRecords = false; // ✅ login হলে আবার preview mode
  loadData();
});


// close sidebar on outside click (mobile)
document.addEventListener("click", (e) => {
  if(window.innerWidth > 1024) return;

  if(
    sidebar.classList.contains("show") &&
    !sidebar.contains(e.target) &&
    !menuBtn.contains(e.target)
  ){
    sidebar.classList.remove("show");
    menuBtn.classList.remove("active");
  }
});

if (seeMoreBtn) {
  seeMoreBtn.onclick = () => {
    showAllRecords = true;
    loadData();
  };
}


searchInput.oninput = loadData;
typeFilter.onchange = loadData;

const contactBtn = document.getElementById("contactBtn");
const contactModal = document.getElementById("contactModal");

if(contactBtn && contactModal){
  contactBtn.onclick = () => {
    contactModal.style.display = "flex";
    contactModal.setAttribute("aria-hidden", "false");
  };
}

window.closeContact = () => {
  if(!contactModal) return;
  contactModal.style.display = "none";
  contactModal.setAttribute("aria-hidden", "true");
};

// বাইরে ক্লিক করলে modal বন্ধ
if(contactModal){
  contactModal.addEventListener("click", (e) => {
    if(e.target === contactModal) closeContact();
  });
}
