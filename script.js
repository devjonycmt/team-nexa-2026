// Supabase Client Initialization
const SUPABASE_URL = "https://wbavkbrkncsezwozdhat.supabase.co";
const SUPABASE_KEY = "sb_publishable_srEIHOqwXyOrQ3rNMrMZGQ_d_U6_YZY";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let allUserReports = [];

let currentModalCategory = "";
let currentModalData = [];

// ১. শুধু তারিখ বের করার হেলপার (Asia/Dhaka timezone)
function formatDateToYYYYMMDD(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const options = {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };
  const formatter = new Intl.DateTimeFormat("en-CA", options);
  return formatter.format(date);
}

// ================= হেলপার ফাংশন: বাংলাদেশ টাইমসহ তারিখ ফরম্যাট =================
function formatDateWithTime(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "N/A";

  const options = {
    timeZone: "Asia/Dhaka",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };

  return new Intl.DateTimeFormat("en-US", options).format(date);
}

// ================= প্ল্যাটফর্ম রেট ক্যালকুলেটর =================
function calculateSlabRate(totalGoodAccounts, workName) {
  if (workName === "facebook") return 7.0;
  if (workName === "instagram") return 4.0;
  if (workName === "meta_ai") return 1.0;
  return 1.0;
}

// On Load Check LocalStorage
window.addEventListener("DOMContentLoaded", async () => {
  const savedUser = localStorage.getItem("custom_app_user");
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    await loadUserData();
  } else {
    showAuth();
  }

  renderWorkInputs();
});

// Navigation & Layout Switches
function showAuth() {
  document.getElementById("auth-container").classList.remove("hidden");
  document.getElementById("dashboard-container").classList.add("hidden");
}

function showDashboard() {
  document.getElementById("auth-container").classList.add("hidden");
  document.getElementById("dashboard-container").classList.remove("hidden");
}

function switchAuthTab(tab) {
  if (tab === "login") {
    document.getElementById("login-form").classList.remove("hidden");
    document.getElementById("register-form").classList.add("hidden");
    document.getElementById("tab-login-btn").className =
      "w-1/2 py-2 text-center font-bold text-indigo-400 border-b-2 border-indigo-500";
    document.getElementById("tab-register-btn").className =
      "w-1/2 py-2 text-center font-bold text-slate-400 hover:text-slate-200";
  } else {
    document.getElementById("login-form").classList.add("hidden");
    document.getElementById("register-form").classList.remove("hidden");
    document.getElementById("tab-register-btn").className =
      "w-1/2 py-2 text-center font-bold text-indigo-400 border-b-2 border-indigo-500";
    document.getElementById("tab-login-btn").className =
      "w-1/2 py-2 text-center font-bold text-slate-400 hover:text-slate-200";
  }
}

function selectPaymentMethod(method) {
  document.getElementById("reg-pay-method").value = method;
  const bkashBtn = document.getElementById("pay-bkash-btn");
  const nagadBtn = document.getElementById("pay-nagad-btn");
  const input = document.getElementById("reg-pay-number");

  if (method === "bkash") {
    bkashBtn.className =
      "flex-1 py-2 bg-pink-600 font-semibold rounded-lg text-sm";
    nagadBtn.className =
      "flex-1 py-2 bg-slate-700 font-semibold rounded-lg text-sm";
    input.placeholder = "bKash নাম্বার দিন";
  } else {
    bkashBtn.className =
      "flex-1 py-2 bg-slate-700 font-semibold rounded-lg text-sm";
    nagadBtn.className =
      "flex-1 py-2 bg-orange-600 font-semibold rounded-lg text-sm";
    input.placeholder = "Nagad নাম্বার দিন";
  }
}

function switchDashTab(tabName) {
  document
    .querySelectorAll(".dash-view")
    .forEach((el) => el.classList.add("hidden"));
  document.querySelectorAll(".dash-tab-btn").forEach((el) => {
    el.className =
      "dash-tab-btn w-full text-left px-4 py-3 rounded-lg font-medium text-slate-400 hover:bg-slate-700/50";
  });

  const targetView = document.getElementById(`view-${tabName}`);
  const targetTab = document.getElementById(`tab-${tabName}`);

  if (targetView) targetView.classList.remove("hidden");
  if (targetTab)
    targetTab.className =
      "dash-tab-btn w-full text-left px-4 py-3 rounded-lg font-medium bg-indigo-600 text-white";
}

// ================= ১. রেজিস্ট্রেশন =================
async function handleRegister(e) {
  e.preventDefault();
  const fullName = document.getElementById("reg-fullname").value;
  const username = document.getElementById("reg-username").value;
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;
  const paymentMethod = document.getElementById("reg-pay-method").value;
  const paymentNumber = document.getElementById("reg-pay-number").value;

  const { data: existingUser } = await supabaseClient
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (existingUser) {
    return alert("এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে!");
  }

  const { error } = await supabaseClient.from("users").insert([
    {
      full_name: fullName,
      username: username,
      email: email,
      password: password,
      payment_method: paymentMethod,
      payment_number: paymentNumber,
    },
  ]);

  if (error) return alert("রেজিস্ট্রেশন ব্যর্থ: " + error.message);

  alert("রেজিস্ট্রেশন সফল হয়েছে! এখন লগইন করুন।");
  switchAuthTab("login");
}

// ================= ২. লগইন =================
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  const { data: user, error } = await supabaseClient
    .from("users")
    .select("*")
    .eq("email", email)
    .eq("password", password)
    .single();

  if (error || !user) {
    return alert("ভুল ইমেইল অথবা পাসওয়ার্ড দিয়েছেন!");
  }

  currentUser = user;
  localStorage.setItem("custom_app_user", JSON.stringify(user));
  await loadUserData();
}

function handleLogout() {
  localStorage.removeItem("custom_app_user");
  currentUser = null;
  showAuth();
}

// ================= ৩. ডাটা লোড =================
async function loadUserData() {
  if (!currentUser) return;
  showDashboard();

  document.getElementById("user-display-name").innerText =
    currentUser.full_name || "User";
  document.getElementById("prof-name").innerText = currentUser.full_name || "";
  document.getElementById("prof-username").innerText =
    currentUser.username || "";
  document.getElementById("prof-email").innerText = currentUser.email || "";

  const passElem = document.getElementById("prof-password");
  if (passElem) passElem.value = currentUser.password || "";

  document.getElementById("prof-pay-method").innerText =
    currentUser.payment_method || "Not Set";
  document.getElementById("prof-pay-number").innerText =
    currentUser.payment_number || "Not Set";

  const avatarElem = document.getElementById("profile-avatar-letter");
  if (avatarElem) {
    avatarElem.innerText = currentUser.full_name
      ? currentUser.full_name.charAt(0).toUpperCase()
      : "U";
  }

  try {
    const { data: reports, error: reportsError } = await supabaseClient
      .from("work_reports")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (reportsError)
      console.error("Work reports load error:", reportsError.message);
    allUserReports = reports || [];

    const { data: payments, error: paymentsError } = await supabaseClient
      .from("payments")
      .select("*")
      .eq("user_id", currentUser.id);

    if (paymentsError)
      console.error("Payments load error:", paymentsError.message);

    updateStatsAndUI(allUserReports, payments || []);
  } catch (error) {
    console.error("Error fetching user data:", error);
    updateStatsAndUI([], []);
  }
}

// ================= ৪. ড্যাশবোর্ড ও ক্যাটাগরি রিপোর্ট আপডেট লজিক =================
function updateStatsAndUI(reports = [], payments = []) {
  const safeReports = Array.isArray(reports) ? reports : [];
  const todayStr = formatDateToYYYYMMDD(new Date().toISOString());

  let overallGood = 0;
  let hasAnyGoodInputOverall = false;
  let overallEarnings = 0;

  safeReports.forEach((r) => {
    if (
      r.good_count !== null &&
      r.good_count !== undefined &&
      r.good_count !== ""
    ) {
      hasAnyGoodInputOverall = true;
      const gCount = Number(r.good_count) || 0;
      overallGood += gCount;
      overallEarnings += gCount * calculateSlabRate(gCount, r.work_name);
    }
  });

  const categories = ["instagram", "facebook", "meta_ai"];

  categories.forEach((cat) => {
    const catReports = safeReports.filter((r) => r.work_name === cat);
    const totalCatCount = catReports.length;

    const catToday = catReports.filter((r) => {
      if (!r.created_at) return false;
      return formatDateToYYYYMMDD(r.created_at) === todayStr;
    }).length;

    let hasGoodInput = false;
    let catGood = 0;

    catReports.forEach((r) => {
      if (
        r.good_count !== null &&
        r.good_count !== undefined &&
        r.good_count !== ""
      ) {
        hasGoodInput = true;
        catGood += Number(r.good_count) || 0;
      }
    });

    let catGoodDisplay = "N/A";
    let catBadDisplay = "N/A";
    let catEarn = 0;
    const catRate = calculateSlabRate(catGood, cat);

    if (hasGoodInput) {
      catGoodDisplay = catGood;
      const catBad = totalCatCount >= catGood ? totalCatCount - catGood : 0;
      catBadDisplay = catBad;
      catEarn = catGood * catRate;
    }

    const prefix =
      cat === "instagram" ? "insta" : cat === "facebook" ? "fb" : "meta";

    if (document.getElementById(`cat-${prefix}-today`))
      document.getElementById(`cat-${prefix}-today`).innerText = catToday;

    if (document.getElementById(`cat-${prefix}-total`))
      document.getElementById(`cat-${prefix}-total`).innerText = totalCatCount;

    if (document.getElementById(`cat-${prefix}-good`))
      document.getElementById(`cat-${prefix}-good`).innerText = catGoodDisplay;

    if (document.getElementById(`cat-${prefix}-bad`))
      document.getElementById(`cat-${prefix}-bad`).innerText = catBadDisplay;

    if (document.getElementById(`cat-${prefix}-earn`))
      document.getElementById(`cat-${prefix}-earn`).innerText =
        `৳${catEarn.toFixed(2)}`;
  });

  const todayCount = safeReports.filter((r) => {
    if (!r.created_at) return false;
    return formatDateToYYYYMMDD(r.created_at) === todayStr;
  }).length;

  if (document.getElementById("stat-today-submissions")) {
    document.getElementById("stat-today-submissions").innerText = todayCount;
  }
  if (document.getElementById("stat-good-accounts")) {
    document.getElementById("stat-good-accounts").innerText =
      hasAnyGoodInputOverall ? overallGood : "N/A";
  }
  if (document.getElementById("stat-due-payment")) {
    document.getElementById("stat-due-payment").innerText =
      `৳${overallEarnings.toFixed(2)}`;
  }

  const recentList = document.getElementById("recent-history-list");
  if (recentList) {
    if (safeReports.length === 0) {
      recentList.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-500">এখনো কোনো কাজ জমা দেওয়া হয়নি</td></tr>`;
    } else {
      recentList.innerHTML = safeReports
        .slice(0, 5)
        .map((r) => {
          let accountDisplay =
            r.account_email || r.account_username || r.uid || "N/A";

          let badgeClass =
            "bg-purple-500/10 text-purple-400 border-purple-500/20";
          if (r.work_name === "facebook")
            badgeClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";
          if (r.work_name === "instagram")
            badgeClass = "bg-pink-500/10 text-pink-400 border-pink-500/20";

          const rowRate = calculateSlabRate(0, r.work_name);

          return `
            <tr class="hover:bg-slate-800/50 transition-colors border-t border-slate-700/50">
              <td class="p-3.5 font-semibold">
                <span class="px-2.5 py-1 text-xs rounded-lg border uppercase tracking-wider font-bold ${badgeClass}">
                  ${(r.work_name || "").replace("_", " ")}
                </span>
              </td>
              <td class="p-3.5 font-medium text-slate-200 truncate max-w-[180px]" title="${accountDisplay}">
                ${accountDisplay}
              </td>
              <td class="p-3.5 text-right font-semibold text-emerald-400">৳${rowRate.toFixed(2)}</td>
              <td class="p-3.5 text-center text-xs text-slate-400 font-mono">${formatDateWithTime(r.created_at)}</td>
            </tr>
          `;
        })
        .join("");
    }
  }

  if (typeof renderPaymentHistoryFromReports === "function") {
    renderPaymentHistoryFromReports(safeReports);
  } else if (typeof renderPaymentHistory === "function") {
    renderPaymentHistory(payments);
  }
}

// ================= পেমেন্ট হিস্ট্রি টেবিল রেন্ডারিং =================
function renderPaymentHistoryFromReports(reports = []) {
  const paymentList = document.getElementById("payment-history-list");
  if (!paymentList) return;

  paymentList.innerHTML = "";
  const safeReports = Array.isArray(reports) ? reports : [];

  const groupedByDate = {};

  safeReports.forEach((r) => {
    if (
      r.good_count !== null &&
      r.good_count !== undefined &&
      r.good_count !== "" &&
      Number(r.good_count) > 0
    ) {
      const dateKey = formatDateToYYYYMMDD(r.created_at) || "N/A";
      const workName = r.work_name;

      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = {
          date: dateKey,
          goodAccounts: 0,
          workName: workName,
        };
      }
      groupedByDate[dateKey].goodAccounts += Number(r.good_count) || 0;
    }
  });

  const paymentDataList = Object.values(groupedByDate).sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });

  if (paymentDataList.length === 0) {
    paymentList.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400 text-xs">কোনো পেমেন্ট হিস্ট্রি পাওয়া যায়নি (Good Accounts আপডেট হলে শো করবে)</td></tr>`;
    return;
  }

  paymentDataList.forEach((pay) => {
    const rate = calculateSlabRate(pay.goodAccounts, pay.workName);
    const totalAmount = pay.goodAccounts * rate;

    const tr = document.createElement("tr");
    tr.className =
      "hover:bg-slate-800/40 transition-colors border-b border-slate-700/30";
    tr.innerHTML = `
      <td class="p-3.5 text-xs text-slate-400 font-mono">${pay.date}</td>
      <td class="p-3.5 text-xs text-slate-200 font-medium">${pay.goodAccounts} Accounts</td>
      <td class="p-3.5 text-xs font-semibold text-emerald-400">৳${totalAmount.toFixed(2)}</td>
      <td class="p-3.5 text-xs text-slate-300 uppercase">${(currentUser && currentUser.payment_method) || "bKash"}</td>
      <td class="p-3.5 text-xs">
        <span class="px-2.5 py-1 text-xs rounded-lg border uppercase tracking-wider font-bold bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
          Pending
        </span>
      </td>
    `;
    paymentList.appendChild(tr);
  });
}

// কাজ জমা দেওয়ার ফাংশন
async function handleWorkSubmit(e) {
  e.preventDefault();
  const workTypeElem = document.getElementById("work-type");
  if (!workTypeElem) return;

  const work_name = workTypeElem.value;

  let payload = {
    user_id: currentUser.id,
    work_name,
    account_password: document.getElementById("work-pass")
      ? document.getElementById("work-pass").value
      : "",
    account_email: "",
    account_username: "",
    two_fa: "",
    uid: "",
    cookies: "",
  };

  if (work_name === "instagram") {
    payload.account_username = document.getElementById("work-username")
      ? document.getElementById("work-username").value
      : "";
    payload.two_fa = document.getElementById("work-2fa")
      ? document.getElementById("work-2fa").value
      : "";
  } else if (work_name === "facebook") {
    payload.uid = document.getElementById("work-uid")
      ? document.getElementById("work-uid").value
      : "";
    payload.cookies = document.getElementById("work-cookies")
      ? document.getElementById("work-cookies").value
      : "";
  } else if (work_name === "meta_ai") {
    payload.account_email = document.getElementById("work-email")
      ? document.getElementById("work-email").value
      : "";
    payload.account_username = document.getElementById("work-username")
      ? document.getElementById("work-username").value
      : "";
  }

  const { error } = await supabaseClient.from("work_reports").insert([payload]);

  if (error) return alert("জমা ব্যর্থ হয়েছে: " + error.message);

  alert("কাজটি সফলভাবে জমা হয়েছে!");

  if (e.target) e.target.reset();
  renderWorkInputs();
  await loadUserData();
}

// ডাইনামিক ইনপুট ফিল্ড রেন্ডারিং
function renderWorkInputs() {
  const workTypeElem = document.getElementById("work-type");
  const container = document.getElementById("dynamic-work-inputs");

  if (!workTypeElem || !container) return;
  const workType = workTypeElem.value;

  if (workType === "instagram") {
    container.innerHTML = `
      <div>
        <label class="block text-xs font-medium text-slate-400 mb-1">Username</label>
        <input type="text" id="work-username" required placeholder="ইন্সটাগ্রাম ইউজারনেম দিন" class="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500">
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-400 mb-1">Password</label>
        <input type="text" id="work-pass" required placeholder="পাসওয়ার্ড দিন" class="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500">
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-400 mb-1">2FA Key</label>
        <input type="text" id="work-2fa" required placeholder="২এফএ সিকিউরিটি কি" class="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500">
      </div>
    `;
  } else if (workType === "facebook") {
    container.innerHTML = `
      <div>
        <label class="block text-xs font-medium text-slate-400 mb-1">UID</label>
        <input type="text" id="work-uid" required placeholder="ফেসবুক প্রোফাইল UID" class="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500">
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-400 mb-1">Password</label>
        <input type="text" id="work-pass" required placeholder="পাসওয়ার্ড দিন" class="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500">
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-400 mb-1">Cookies</label>
        <textarea id="work-cookies" required rows="3" placeholder="সম্পূর্ণ কুকিজ পেস্ট করুন" class="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono text-xs"></textarea>
      </div>
    `;
  } else if (workType === "meta_ai") {
    container.innerHTML = `
      <div>
        <label class="block text-xs font-medium text-slate-400 mb-1">Email</label>
        <input type="email" id="work-email" required placeholder="ইমেইল এড্রেস দিন" class="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500">
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-400 mb-1">Password</label>
        <input type="text" id="work-pass" required placeholder="পাসওয়ার্ড দিন" class="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500">
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-400 mb-1">Username</label>
        <input type="text" id="work-username" required placeholder="মেটা ইউজারনেম" class="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500">
      </div>
    `;
  }
}

// ================= ৫. মোডাল লজিক =================
function openCategoryModal(category) {
  currentModalCategory = category;

  const modal = document.getElementById("category-modal");
  if (modal) modal.classList.remove("hidden");

  const titleElem = document.getElementById("modal-title");
  if (titleElem) titleElem.innerText = `${category.replace("_", " ")} Accounts`;

  const dateInput = document.getElementById("modal-date-filter");
  if (dateInput) dateInput.value = "";

  let sourceData = Array.isArray(allUserReports) ? allUserReports : [];

  currentModalData = sourceData.filter((item) => {
    const type = item.work_name || item.work_type || item.category;
    return type && type.toLowerCase() === category.toLowerCase();
  });

  renderModalTable(currentModalData);
}

function closeCategoryModal() {
  const modal = document.getElementById("category-modal");
  if (modal) modal.classList.add("hidden");
}

function renderModalTable(dataList) {
  const tbody = document.getElementById("modal-account-list");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!dataList || dataList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400 text-xs">কোনো ডাটা পাওয়া যায়নি</td></tr>`;
    return;
  }

  dataList.forEach((item) => {
    const itemDate = formatDateToYYYYMMDD(item.created_at || item.date);
    const accountDisplay =
      item.account_username || item.account_email || item.uid || "-";
    const extraInfo = item.two_fa || item.cookies || "-";

    const tr = document.createElement("tr");
    tr.className =
      "hover:bg-slate-800/40 transition-colors border-b border-slate-700/30";
    tr.innerHTML = `
      <td class="p-2.5 text-xs text-slate-400 font-mono">${itemDate || "-"}</td>
      <td class="p-2.5 text-xs text-slate-200 truncate max-w-[150px]" title="${accountDisplay}">${accountDisplay}</td>
      <td class="p-2.5 text-xs text-slate-200 font-mono">${item.account_password || item.password || "-"}</td>
      <td class="p-2.5 text-xs text-indigo-400 font-mono truncate max-w-[150px]" title="${extraInfo}">${extraInfo}</td>
    `;
    tbody.appendChild(tr);
  });
}

function filterModalByDate() {
  const selectedDate = document.getElementById("modal-date-filter").value;

  if (!selectedDate) {
    renderModalTable(currentModalData);
    return;
  }

  const filtered = currentModalData.filter((item) => {
    const itemFormattedDate = formatDateToYYYYMMDD(
      item.created_at || item.date,
    );
    return itemFormattedDate === selectedDate;
  });

  renderModalTable(filtered);
}

function resetModalDateFilter() {
  const dateInput = document.getElementById("modal-date-filter");
  if (dateInput) dateInput.value = "";
  renderModalTable(currentModalData);
}

// ================= ৬. প্রোফাইল ও ইউজার আপডেট লজিক =================
function togglePasswordVisibility() {
  const passInput = document.getElementById("prof-password");
  const eyeIcon = document.getElementById("eye-icon");

  if (!passInput || !eyeIcon) return;

  if (passInput.type === "password") {
    passInput.type = "text";
    eyeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a8.959 8.959 0 013.682-.783c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18"></path>`;
  } else {
    passInput.type = "password";
    eyeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>`;
  }
}

async function handlePasswordUpdate(e) {
  e.preventDefault();
  const newPassword = document.getElementById("update-new-pass").value;

  if (!newPassword || newPassword.trim() === "") {
    return alert("দয়া করে একটি সঠিক পাসওয়ার্ড দিন।");
  }

  const { error } = await supabaseClient
    .from("users")
    .update({ password: newPassword })
    .eq("id", currentUser.id);

  if (error) return alert("পাসওয়ার্ড আপডেট ব্যর্থ হয়েছে: " + error.message);

  currentUser.password = newPassword;
  localStorage.setItem("custom_app_user", JSON.stringify(currentUser));

  document.getElementById("prof-password").value = newPassword;
  document.getElementById("update-new-pass").value = "";
  alert("পাসওয়ার্ড সফলভাবে আপডেট করা হয়েছে!");
}

async function handlePaymentUpdate(e) {
  e.preventDefault();
  const method = document.getElementById("update-pay-method").value;
  const number = document.getElementById("update-pay-number").value;

  if (!number || number.trim() === "") {
    return alert("দয়া করে সঠিক মোবাইল নাম্বার দিন।");
  }

  const { error } = await supabaseClient
    .from("users")
    .update({ payment_method: method, payment_number: number })
    .eq("id", currentUser.id);

  if (error) return alert("পেমেন্ট তথ্য আপডেট ব্যর্থ হয়েছে: " + error.message);

  currentUser.payment_method = method;
  currentUser.payment_number = number;
  localStorage.setItem("custom_app_user", JSON.stringify(currentUser));

  document.getElementById("prof-pay-method").innerText = method;
  document.getElementById("prof-pay-number").innerText = number;
  document.getElementById("update-pay-number").value = "";
  alert("পেমেন্ট তথ্য সফলভাবে আপডেট করা হয়েছে!");
}

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");

  if (sidebar) sidebar.classList.toggle("-translate-x-full");
  if (overlay) overlay.classList.toggle("hidden");
}

function selectDashTab(tabName) {
  if (typeof switchDashTab === "function") switchDashTab(tabName);
  if (window.innerWidth < 768) toggleSidebar();
}

// ================= পেমেন্ট হিস্ট্রি টেবিল রেন্ডারিং =================
function renderPaymentHistory(payments = []) {
  const paymentList = document.getElementById("payment-history-list");
  if (!paymentList) return;

  paymentList.innerHTML = "";

  if (!payments || payments.length === 0) {
    paymentList.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400 text-xs">কোনো পেমেন্ট হিস্ট্রি পাওয়া যায়নি</td></tr>`;
    return;
  }

  payments.forEach((pay, index) => {
    let statusBadge = "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    if (pay.status && pay.status.toLowerCase() === "paid") {
      statusBadge = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    } else if (pay.status && pay.status.toLowerCase() === "rejected") {
      statusBadge = "bg-rose-500/10 text-rose-400 border-rose-500/20";
    }

    const tr = document.createElement("tr");
    tr.className =
      "hover:bg-slate-800/40 transition-colors border-b border-slate-700/30";
    tr.innerHTML = `
      <td class="p-3.5 text-xs text-slate-400 font-mono">#${pay.id || index + 1}</td>
      <td class="p-3.5 text-xs text-slate-200 font-medium">${pay.good_accounts || pay.good_count || "-"}</td>
      <td class="p-3.5 text-xs font-semibold text-emerald-400">৳${Number(pay.amount || pay.total_amount || 0).toFixed(2)}</td>
      <td class="p-3.5 text-xs text-slate-300 uppercase">${pay.method || pay.payment_method || "bKash"}</td>
      <td class="p-3.5 text-xs">
        <span class="px-2.5 py-1 text-xs rounded-lg border uppercase tracking-wider font-bold ${statusBadge}">
          ${pay.status || "Pending"}
        </span>
      </td>
    `;
    paymentList.appendChild(tr);
  });
}
