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

function getBangladeshISOString() {
  const now = new Date();
  const options = {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };
  const formatter = new Intl.DateTimeFormat("en-CA", options);
  const parts = formatter.formatToParts(now);

  let year, month, day, hour, minute, second;
  parts.forEach((p) => {
    if (p.type === "year") year = p.value;
    if (p.type === "month") month = p.value;
    if (p.type === "day") day = p.value;
    if (p.type === "hour") hour = p.value;
    if (p.type === "minute") minute = p.value;
    if (p.type === "second") second = p.value;
  });

  return `${year}-${month}-${day}T${hour}:${minute}:${second}+06:00`;
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

// ================= ৩. ডাটা লোড (Online Payments & Work Reports Fetching) =================
async function loadUserData() {
  if (!currentUser) return;
  showDashboard();

  // ইউজারের প্রফাইল ডাটা সেট করা
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
    // ১. কাজের রিপোর্ট লোড
    const { data: reports, error: reportsError } = await supabaseClient
      .from("work_reports")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (reportsError)
      console.error("Work reports load error:", reportsError.message);
    allUserReports = reports || [];

    // ২. online_payments টেবিল থেকে বর্তমান ইউজারের পেমেন্ট ডাটা সরাসরি ফেচ করা
    const { data: userPayments, error: paymentsError } = await supabaseClient
      .from("online_payments")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (paymentsError) {
      console.error("Online payments load error:", paymentsError.message);
    }

    // ৩. পেমেন্ট হিস্ট্রি টেবিল রেন্ডার করা এবং স্ট্যাটাস আপডেট করা
    renderOnlinePaymentsHistory(userPayments || []);
    updateStatsAndUI(allUserReports);

    // ================= এই অংশটুকু এখানে বসাবেন =================
    const groupedHistory = {};
    allUserReports.forEach((report) => {
      const dateStr = formatDateToYYYYMMDD(report.created_at);
      const category = report.work_name || "general";
      const key = `${dateStr}_${category}`;

      if (!groupedHistory[key]) {
        groupedHistory[key] = {
          date: dateStr,
          category: category,
          total_accounts: 0,
          status: "Completed",
          accounts: [],
        };
      }
      groupedHistory[key].total_accounts += 1;
      groupedHistory[key].accounts.push(report); // সম্পূর্ণ রিপোর্ট অবজেক্ট সেভ করা হলো
    });

    renderDailyAccountHistoryTable(Object.values(groupedHistory));
    // ========================================================
  } catch (error) {
    console.error("Error fetching user data:", error);
    updateStatsAndUI([]);
    renderDailyAccountHistoryTable([]);
  }
}
// ================= অনলাইন পেমেন্ট হিস্ট্রি রেন্ডারিং ফাংশন =================
function renderOnlinePaymentsHistory(payments = []) {
  const paymentList = document.getElementById("payment-history-list");
  if (!paymentList) return;

  paymentList.innerHTML = "";

  if (!payments || payments.length === 0) {
    paymentList.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-400 text-xs">কোনো পেমেন্ট হিস্ট্রি পাওয়া যায়নি</td></tr>`;
    return;
  }

  payments.forEach((pay) => {
    let status = pay.status ? pay.status.toLowerCase() : "pending";
    let statusBadge = "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";

    if (status === "success" || status === "completed" || status === "paid") {
      statusBadge = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    } else if (status === "rejected" || status === "failed") {
      statusBadge = "bg-rose-500/10 text-rose-400 border-rose-500/20";
    }

    const payDate = formatDateWithTime(pay.created_at || pay.date) || "N/A";
    const gateway = pay.gateway || pay.payment_method || "N/A";
    const trxId = pay.transaction_id || pay.trx_id || "N/A";
    const workDetails =
      pay.work_details || pay.description || pay.note || "N/A";

    // কাজের বিবরণী থেকে সংখ্যা (Count) বের করা
    let match = workDetails.match(/\d+/);
    let countNum = match ? match[0] : pay.good_account_count || pay.count || "";

    // অ্যাকাউন্ট স্ট্যাটাসে সুন্দর ফরম্যাটে সংখ্যাসহ দেখানো
    let accountStatusDisplay = countNum
      ? `${countNum} গুড অ্যাকাউন্ট`
      : pay.account_status || "Good Account";

    const amount = Number(pay.amount || pay.total_amount || 0).toFixed(2);
    const displayStatus = pay.status ? pay.status.toUpperCase() : "PENDING";

    const tr = document.createElement("tr");
    tr.className =
      "hover:bg-slate-800/40 transition-colors border-b border-slate-700/30";
    tr.innerHTML = `
      <td class="p-4 text-xs text-slate-300 font-mono">${payDate}</td>
      <td class="p-4 text-xs text-slate-200 uppercase font-medium">${gateway}</td>
      <td class="p-4 text-xs text-slate-400 font-mono">${trxId}</td>
      <td class="p-4 text-xs text-slate-300">${workDetails}</td>
      <td class="p-4 text-xs">
        <span class="px-3 py-1.5 text-xs rounded-lg border font-semibold bg-emerald-500/10 text-emerald-400 border-emerald-500/30 flex items-center gap-1.5 w-max shadow-sm">
          <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          ${accountStatusDisplay}
        </span>
      </td>
      <td class="p-4 text-xs font-semibold text-emerald-400">৳${amount}</td>
      <td class="p-4 text-xs text-center">
        <span class="px-3 py-1 text-xs rounded-lg border uppercase tracking-wider font-bold ${statusBadge}">
          ${displayStatus}
        </span>
      </td>
    `;
    paymentList.appendChild(tr);
  });
}
function updateStatsAndUI(reports = []) {
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
    // শুধুমাত্র আজকের রিপোর্টগুলো ফিল্টার করা হচ্ছে কার্ডের জন্য
    const catTodayReports = safeReports.filter((r) => {
      if (r.work_name !== cat || !r.created_at) return false;
      return formatDateToYYYYMMDD(r.created_at) === todayStr;
    });

    // কার্ডে দেখানোর জন্য আজকের মোট অ্যাকাউন্ট সংখ্যা
    const catTodayCount = catTodayReports.length;

    const prefix =
      cat === "instagram" ? "insta" : cat === "facebook" ? "fb" : "meta";

    // কার্ডের নির্দিষ্ট এলিমেন্টে আজকের সংখ্যা বসানো
    if (document.getElementById(`cat-${prefix}-today`))
      document.getElementById(`cat-${prefix}-today`).innerText = catTodayCount;

    if (document.getElementById(`cat-${prefix}-total`))
      document.getElementById(`cat-${prefix}-total`).innerText = catTodayCount;

    if (document.getElementById(`cat-${prefix}-good`))
      document.getElementById(`cat-${prefix}-good`).innerText = catTodayCount;

    if (document.getElementById(`cat-${prefix}-bad`))
      document.getElementById(`cat-${prefix}-bad`).innerText = "0";

    if (document.getElementById(`cat-${prefix}-earn`)) {
      const rate = calculateSlabRate(catTodayCount, cat);
      document.getElementById(`cat-${prefix}-earn`).innerText =
        `৳${(catTodayCount * rate).toFixed(2)}`;
    }
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
}

async function handleWorkSubmit(e) {
  e.preventDefault();
  const workTypeElem = document.getElementById("work-type");
  if (!workTypeElem) return;

  const work_name = workTypeElem.value;

  // ব্রাউজার সেশন বা ইউজার অবজেক্ট থেকে নাম বের করার নিরাপদ পদ্ধতি (Fallback সহ)
  let userFullName = "Unknown User";
  if (currentUser) {
    userFullName =
      currentUser.full_name ||
      currentUser.username ||
      currentUser.email ||
      "Unknown User";
  }

  let payload = {
    user_id: currentUser ? currentUser.id : null,
    full_name: userFullName, // এখন এখানে নিশ্চিতভাবে নাম বা ফলব্যাক পাস হবে
    work_name,
    account_password: document.getElementById("work-pass")
      ? document.getElementById("work-pass").value
      : "",
    account_email: "",
    account_username: "",
    two_fa: "",
    uid: "",
    cookies: "",
    created_at: getBangladeshISOString(),
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

  if (error) return alert("জমা ব্যর্থ হয়েছে: " + error.message);

  alert("কাজটি সফলভাবে জমা হয়েছে!");

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

// ================= মেটা অ্যাকাউন্ট জেনারেটর সিস্টেম =================
const GENERATOR_SECRET_PASSWORD = "Jony@8844!!!";

function openMetaGeneratorModal() {
  if (typeof currentUser !== "undefined" && !currentUser) {
    return alert("দয়া করে আগে লগইন করুন!");
  }
  document.getElementById("password-prompt-modal").classList.remove("hidden");
  document.getElementById("generator-secret-pass").value = "";
}

function closePasswordPrompt() {
  document.getElementById("password-prompt-modal").classList.add("hidden");
}

async function verifyGeneratorPassword() {
  const enteredPass = document.getElementById("generator-secret-pass").value;

  if (enteredPass !== GENERATOR_SECRET_PASSWORD) {
    return alert("ভুল পাসওয়ার্ড দেওয়া হয়েছে!");
  }

  closePasswordPrompt();
  document.getElementById("meta-generator-modal").classList.remove("hidden");

  await fetchAndLockMetaAccount();
}

function closeMetaGeneratorModal() {
  document.getElementById("meta-generator-modal").classList.add("hidden");
}

async function fetchAndLockMetaAccount() {
  const contentArea = document.getElementById("generator-content-area");
  contentArea.innerHTML = `<p class="text-center text-slate-400 py-6 text-sm">অ্যাকাউন্ট জেনারেট হচ্ছে...</p>`;

  const userId =
    typeof currentUser !== "undefined" && currentUser
      ? currentUser.id || currentUser.email
      : "guest_user";

  let { data: existingLock } = await supabaseClient
    .from("meta_accounts")
    .select("*")
    .eq("status", "locked")
    .eq("locked_by", userId)
    .single();

  let acc = existingLock;

  if (!acc) {
    const { data: availableAccs, error: fetchError } = await supabaseClient
      .from("meta_accounts")
      .select("*")
      .eq("status", "available")
      .limit(1);

    if (fetchError || !availableAccs || availableAccs.length === 0) {
      contentArea.innerHTML = `
        <div class="text-center py-8 space-y-2">
          <p class="text-amber-400 font-semibold text-base">দুঃখিত! বর্তমানে কোনো অ্যাকাউন্ট খালি নেই।</p>
          <p class="text-slate-400 text-xs">meta_accounts টেবিলে 'available' স্ট্যাটাসের কোনো অ্যাকাউন্ট পাওয়া যায়নি।</p>
        </div>
      `;
      return;
    }

    acc = availableAccs[0];

    const { error: lockError } = await supabaseClient
      .from("meta_accounts")
      .update({
        status: "locked",
        locked_by: userId,
      })
      .eq("id", acc.id)
      .eq("status", "available");

    if (lockError) {
      contentArea.innerHTML = `<p class="text-center text-rose-400 py-6 text-sm">লক করতে সমস্যা হয়েছে: ${lockError.message}</p>`;
      return;
    }
  }

  contentArea.innerHTML = `
    <div class="bg-slate-900/80 p-4 rounded-xl border border-slate-700/80 space-y-3">
      <div class="flex justify-between items-center">
        <span class="text-xs font-semibold text-slate-400 uppercase">আপনার জন্য বরাদ্দকৃত অ্যাকাউন্ট</span>
        <span class="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold">Reserved</span>
      </div>

      <div class="space-y-2 text-sm">
        <div class="flex justify-between items-center bg-slate-800 p-2.5 rounded-lg border border-slate-700/50">
          <div>
            <span class="text-[10px] text-slate-400 block">Email:</span>
            <span class="text-slate-200 font-mono text-xs">${acc.account_email || "N/A"}</span>
          </div>
          <button onclick="copyText('${acc.account_email}', 'Email')" class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-2.5 py-1.5 rounded-md transition">কপি</button>
        </div>

        <div class="flex justify-between items-center bg-slate-800 p-2.5 rounded-lg border border-slate-700/50">
          <div>
            <span class="text-[10px] text-slate-400 block">Username:</span>
            <span class="text-slate-200 font-mono text-xs">${acc.account_username || "N/A"}</span>
          </div>
          <button onclick="copyText('${acc.account_username}', 'Username')" class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-2.5 py-1.5 rounded-md transition">কপি</button>
        </div>

        <div class="flex justify-between items-center bg-slate-800 p-2.5 rounded-lg border border-slate-700/50">
          <div>
            <span class="text-[10px] text-slate-400 block">Password:</span>
            <span class="text-slate-200 font-mono text-xs">${acc.account_password || "N/A"}</span>
          </div>
          <button onclick="copyText('${acc.account_password}', 'Password')" class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-2.5 py-1.5 rounded-md transition">কপি</button>
        </div>
      </div>

      <button 
        onclick="finalizeAccount('${acc.id}')"
        class="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 rounded-xl shadow-lg transition text-sm flex items-center justify-center gap-2 mt-2">
        ফাইনাল কনফার্ম করুন (Done)
      </button>
    </div>
  `;
}

async function finalizeAccount(accountId) {
  if (
    !confirm(
      "আপনি কি নিশ্চিত? কনফার্ম করলে অ্যাকাউন্টটি ব্যবহৃত (used) হিসেবে সেভ হয়ে যাবে।",
    )
  )
    return;

  const userId =
    typeof currentUser !== "undefined" && currentUser
      ? currentUser.id || currentUser.email
      : "guest_user";

  const { error } = await supabaseClient
    .from("meta_accounts")
    .update({
      status: "used",
      used_by: userId,
    })
    .eq("id", accountId);

  if (error) {
    return alert("ত্রুটি: " + error.message);
  }

  alert("সফলভাবে সম্পন্ন হয়েছে!");
  closeMetaGeneratorModal();
}

function copyText(text, label) {
  navigator.clipboard.writeText(text);
  alert(label + " সফলভাবে কপি করা হয়েছে!");
}

// ================= ডেইলি হিস্ট্রি টেবিল ও ভিউ বাটন রেন্ডারিং =================
function renderDailyAccountHistoryTable(historyData = []) {
  const historyList = document.getElementById("daily-account-history-list");
  if (!historyList) return;

  historyList.innerHTML = "";

  if (!historyData || historyData.length === 0) {
    historyList.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400 text-xs">কোনো হিস্ট্রি পাওয়া যায়নি</td></tr>`;
    return;
  }

  historyData.forEach((item, index) => {
    const reportDate = item.date || item.created_at || "N/A";
    const category = item.category || "General";
    const totalAccounts = item.total_accounts || item.count || 0;
    const status = item.status || "Completed";

    const tr = document.createElement("tr");
    tr.className =
      "hover:bg-slate-800/40 transition-colors border-b border-slate-700/30";
    tr.innerHTML = `
      <td class="p-4 text-xs text-slate-300 font-mono">${reportDate}</td>
      <td class="p-4 text-xs text-slate-200 font-medium uppercase">${category}</td>
      <td class="p-4 text-xs font-extrabold text-emerald-400">${totalAccounts} টি</td>
      <td class="p-4 text-xs text-center">
        <span class="px-2.5 py-1 text-[11px] rounded-lg border font-semibold bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
          ${status}
        </span>
      </td>
      <td class="p-4 text-xs text-center">
        <button onclick='openAccountDetailsModal(${JSON.stringify(item)})' class="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/40 text-indigo-300 rounded-lg font-semibold transition-colors flex items-center gap-1 mx-auto">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
          </svg>
          View
        </button>
      </td>
    `;
    historyList.appendChild(tr);
  });
}

// ================= মেটা এবং অন্যান্য ক্যাটাগরির জন্য ডায়নামিক মডাল ফাংশন =================
function openAccountDetailsModal(item) {
  const modal = document.getElementById("account-details-modal");
  const modalTitle = document.getElementById("modal-title");
  const modalSubtitle = document.getElementById("modal-subtitle");
  const modalHeaderRow = document.getElementById("modal-header-row");
  const modalList = document.getElementById("modal-accounts-list");

  if (!modal) return;

  const categoryName = (item.category || "").toLowerCase();
  const isMeta = categoryName.includes("meta");

  modalTitle.innerText = `${(item.category || "Category").toUpperCase()} - অ্যাকাউন্ট লিস্ট`;
  modalSubtitle.innerText = `তারিখ: ${item.date || item.created_at || "N/A"}`;

  // ক্যাটাগরি অনুযায়ী টেবিল হেডার পরিবর্তন করা
  if (modalHeaderRow) {
    if (isMeta) {
      modalHeaderRow.innerHTML = `
        <th class="p-3">ক্রমিক</th>
        <th class="p-3">ইমেইল</th>
        <th class="p-3">পাসওয়ার্ড</th>
        <th class="p-3">ইউজারনেম</th>
        <th class="p-3">অন্যান্য তথ্য (2FA / Cookies)</th>
        <th class="p-3 text-center">স্ট্যাটাস</th>
      `;
    } else {
      modalHeaderRow.innerHTML = `
        <th class="p-3">ক্রমিক</th>
        <th class="p-3">ইউজারনেম / ইমেইল / UID</th>
        <th class="p-3">পাসওয়ার্ড</th>
        <th class="p-3">অন্যান্য তথ্য (2FA / Cookies)</th>
        <th class="p-3 text-center">স্ট্যাটাস</th>
      `;
    }
  }

  modalList.innerHTML = "";
  const accounts = item.accounts || [];

  if (accounts.length === 0) {
    const colSpan = isMeta ? 6 : 5;
    modalList.innerHTML = `<tr><td colspan="${colSpan}" class="p-4 text-center text-slate-500">এই তারিখে কোনো অ্যাকাউন্ট ডিটেইলস যুক্ত করা হয়নি</td></tr>`;
  } else {
    accounts.forEach((acc, idx) => {
      const status = acc.status || "Active";
      const extraInfo = acc.two_fa || acc.cookies || "N/A";
      const password = acc.account_password || acc.password || "N/A";

      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-800/50 transition-colors";

      if (isMeta) {
        // মেটার জন্য: ইমেইল -> পাসওয়ার্ড -> ইউজারনেম
        const email = acc.account_email || acc.email || "N/A";
        const username = acc.account_username || acc.username || "N/A";
        tr.innerHTML = `
          <td class="p-3 font-mono text-slate-400">${idx + 1}</td>
          <td class="p-3 text-slate-200 font-mono font-semibold">${email}</td>
          <td class="p-3 text-slate-300 font-mono">${password}</td>
          <td class="p-3 text-slate-300 font-mono">${username}</td>
          <td class="p-3 text-indigo-300 font-mono max-w-[200px] truncate" title="${extraInfo}">${extraInfo}</td>
          <td class="p-3 text-center">
            <span class="px-2 py-0.5 text-[10px] rounded font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              ${status}
            </span>
          </td>
        `;
      } else {
        // অন্যান্য ক্যাটাগরির জন্য স্বাভাবিক ফরম্যাট
        const mainInfo =
          acc.account_username || acc.account_email || acc.uid || "N/A";
        tr.innerHTML = `
          <td class="p-3 font-mono text-slate-400">${idx + 1}</td>
          <td class="p-3 text-slate-200 font-mono font-semibold">${mainInfo}</td>
          <td class="p-3 text-slate-300 font-mono">${password}</td>
          <td class="p-3 text-indigo-300 font-mono max-w-[250px] truncate" title="${extraInfo}">${extraInfo}</td>
          <td class="p-3 text-center">
            <span class="px-2 py-0.5 text-[10px] rounded font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              ${status}
            </span>
          </td>
        `;
      }
      modalList.appendChild(tr);
    });
  }

  modal.classList.remove("hidden");
}

function closeAccountDetailsModal() {
  const modal = document.getElementById("account-details-modal");
  if (modal) {
    modal.classList.add("hidden");
  }
}
