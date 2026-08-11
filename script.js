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
    return showCustomModal("এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে!");
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

  if (error) return showCustomModal("রেজিস্ট্রেশন ব্যর্থ: " + error.message);

  showCustomModal("রেজিস্ট্রেশন সফল হয়েছে! এখন লগইন করুন।");
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
    return showCustomModal("ভুল ইমেইল অথবা পাসওয়ার্ড দিয়েছেন!");
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

    // ৩. পেমেন্ট হিস্ট্রি এবং ড্যাশবোর্ড স্ট্যাটাস আপডেট করা
    renderOnlinePaymentsHistory(userPayments || []);
    updateStatsAndUI(allUserReports);

    // ৪. তারিখভিত্তিক একাউন্ট হিস্ট্রি টেবিল রেন্ডার করা (নতুন ফাংশন কল)
    renderDateWiseAccountHistory(allUserReports);
  } catch (error) {
    console.error("Error fetching user data:", error);
    updateStatsAndUI([]);
    renderDateWiseAccountHistory([]);
  }
}

// ================= অনলাইন পেমেন্ট হিস্ট্রি রেন্ডারিং ফাংশন =================
function renderOnlinePaymentsHistory(payments = []) {
  const paymentList = document.getElementById("payment-history-list");
  if (!paymentList) return;

  paymentList.innerHTML = "";

  if (!payments || payments.length === 0) {
    paymentList.innerHTML = `<div class="col-span-full bg-slate-800/80 backdrop-blur-md p-8 rounded-2xl border border-slate-700/60 text-center text-slate-400 text-xs">কোনো পেমেন্ট হিস্ট্রি পাওয়া যায়নি</div>`;
    return;
  }

  const gridContainer = document.createElement("div");
  gridContainer.className =
    "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full";

  payments.forEach((pay) => {
    let status = pay.status ? pay.status.toLowerCase() : "pending";
    let statusBadge = "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";

    let cardBg = "bg-slate-900";
    let cardBorder = "border-slate-800";
    let watermarkHtml = "";

    if (status === "success" || status === "completed" || status === "paid") {
      statusBadge = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      cardBg = "bg-emerald-950/30";
      cardBorder = "border-emerald-500/50";
      watermarkHtml = `
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
          <div class="border-[5px] border-emerald-500/30 rounded-3xl px-8 py-4 transform -rotate-25 flex flex-col items-center justify-center bg-emerald-500/[0.04]">
            <span class="text-emerald-400 text-4xl font-black uppercase tracking-widest opacity-40">SUCCESS</span>
            <span class="text-[10px] text-emerald-400 font-bold uppercase tracking-widest opacity-35 mt-1">VERIFIED & PAID</span>
          </div>
        </div>
      `;
    } else if (status === "rejected" || status === "failed") {
      statusBadge = "bg-rose-500/10 text-rose-400 border-rose-500/20";
      cardBg = "bg-rose-950/30";
      cardBorder = "border-rose-500/50";
      watermarkHtml = `
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
          <div class="border-[5px] border-rose-500/30 rounded-3xl px-8 py-4 transform -rotate-25 flex flex-col items-center justify-center bg-rose-500/[0.04]">
            <span class="text-rose-400 text-4xl font-black uppercase tracking-widest opacity-40">FAILED</span>
            <span class="text-[10px] text-rose-400 font-bold uppercase tracking-widest opacity-35 mt-1">REJECTED</span>
          </div>
        </div>
      `;
    } else {
      // PENDING কার্ডের জন্য হলুদ/অ্যাম্বার কালারের সিল স্টাইল
      statusBadge = "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      cardBg = "bg-yellow-950/20";
      cardBorder = "border-yellow-500/40";
      watermarkHtml = `
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
          <div class="border-[5px] border-yellow-500/30 rounded-3xl px-8 py-4 transform -rotate-25 flex flex-col items-center justify-center bg-yellow-500/[0.04]">
            <span class="text-yellow-400 text-4xl font-black uppercase tracking-widest opacity-40">PENDING</span>
            <span class="text-[10px] text-yellow-400 font-bold uppercase tracking-widest opacity-35 mt-1">IN REVIEW</span>
          </div>
        </div>
      `;
    }

    // Database columns mapping
    const date = pay.date || pay.created_at || "N/A";
    const workDetails = pay.work_details || "N/A";
    const gateway = (pay.gateway || "N/A").toUpperCase();
    const paymentNumber = pay.payment_number || "N/A";
    const transactionNum =
      pay.transaction_number || pay.transaction_id || "Pending / N/A";

    const goodAccount = pay.good_account ?? 0;
    const badAccount = pay.bad_account ?? 0;
    const totalAccount = pay.total_account ?? 0;

    const amount = Number(pay.amount || 0).toFixed(2);
    const payAmount = Number(pay.pay_amount || 0).toFixed(2);

    const displayStatus = pay.status ? pay.status.toUpperCase() : "PENDING";

    const voucherCard = document.createElement("div");
    voucherCard.className = `${cardBg} text-slate-100 rounded-3xl border ${cardBorder} shadow-2xl overflow-hidden p-6 relative font-sans transition-all hover:border-slate-600`;

    voucherCard.innerHTML = `
      <!-- Stamp Watermark -->
      ${watermarkHtml}

      <!-- Voucher Top Header -->
      <div class="flex justify-between items-center pb-4 border-b border-slate-800/80 relative z-10">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs">
            PV
          </div>
          <div>
            <h4 class="text-xs font-bold tracking-wider uppercase text-white">Payment Voucher</h4>
            <span class="text-[18px] text-slate-400 font-mono">${date}</span>
          </div>
        </div>
        <span class="px-2.5 py-1 text-[10px] rounded-full border uppercase tracking-wider font-bold ${statusBadge} flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></span>
          ${displayStatus}
        </span>
      </div>

      <!-- Work Details Section -->
      <div class="py-4 border-b border-slate-800/80 relative z-10">
        <span class="text-[10px] uppercase tracking-wider text-slate-400 block mb-0.5">Work Description</span>
        <h3 class="text-sm font-bold text-white">${workDetails}</h3>
      </div>

      <!-- Voucher Details Info -->
      <div class="py-4 space-y-2.5 border-b border-slate-800/80 text-xs relative z-10">
        <div class="flex justify-between items-center bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
          <span class="text-slate-400">Payment Gateway:</span>
          <span class="font-bold text-amber-300 uppercase">${gateway}</span>
        </div>
        <div class="flex justify-between items-center bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
          <span class="text-slate-400">Account Number:</span>
          <span class="font-mono text-indigo-300 font-semibold">${paymentNumber}</span>
        </div>
        <div class="flex justify-between items-center bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
          <span class="text-slate-400">Transaction Number:</span>
          <span class="font-mono text-amber-400 font-semibold">${transactionNum}</span>
        </div>
      </div>

      <!-- Stats Summary (Good, Bad, Total Acc) -->
      <div class="py-4 grid grid-cols-3 gap-2 text-center text-xs border-b border-slate-800/80 relative z-10">
        <div class="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
          <span class="text-[10px] uppercase tracking-wider text-emerald-400 block font-medium">Good Acc</span>
          <span class="text-sm font-bold text-emerald-300">${goodAccount}</span>
        </div>
        <div class="bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
          <span class="text-[10px] uppercase tracking-wider text-rose-400 block font-medium">Bad Acc</span>
          <span class="text-sm font-bold text-rose-300">${badAccount}</span>
        </div>
        <div class="bg-slate-800/50 p-2 rounded-xl border border-slate-800">
          <span class="text-[10px] uppercase tracking-wider text-slate-400 block font-medium">Total Acc</span>
          <span class="text-sm font-bold text-slate-200">${totalAccount}</span>
        </div>
      </div>

      <!-- Voucher Bottom Total Amount -->
      <div class="pt-4 flex items-center justify-between text-xs relative z-10">
        <div>
          <span class="text-[15px] text-slate-400 block">Base Amount</span>
          <strong class="text-sm text-slate-200 font-semibold">৳${amount}</strong>
        </div>
        <div class="text-right">
          <span class="text-[15px] text-yellow-400 block font-semibold uppercase tracking-wider">Paid Amount</span>
          <span class="text-base font-extrabold text-yellow-400">৳${payAmount}</span>
        </div>
      </div>
    `;

    gridContainer.appendChild(voucherCard);
  });

  paymentList.appendChild(gridContainer);
}

// ================= আপডেটকৃত স্ট্যাটাস ও ইউআই ফাংশন (সেফটি চেকসহ) =================
function updateStatsAndUI(reports = []) {
  const safeReports = Array.isArray(reports) ? reports : [];

  const currentUserId =
    window.currentUserId ||
    localStorage.getItem("user_id") ||
    localStorage.getItem("uid") ||
    (window.currentUser ? window.currentUser.id : null);
  const currentUserEmail =
    window.currentUserEmail ||
    localStorage.getItem("user_email") ||
    (window.currentUser ? window.currentUser.email : null);

  const userReports =
    !currentUserId && !currentUserEmail
      ? safeReports
      : safeReports.filter((r) => {
          return (
            (currentUserId &&
              (r.user_id == currentUserId ||
                r.uid == currentUserId ||
                r.userId == currentUserId)) ||
            (currentUserEmail &&
              (r.email === currentUserEmail ||
                r.user_email === currentUserEmail))
          );
        });

  const todayStr = formatDateToYYYYMMDD(new Date().toISOString());

  const todayReports = userReports.filter((r) => {
    if (!r.created_at) return false;
    return formatDateToYYYYMMDD(r.created_at) === todayStr;
  });

  let todaySubmissions = todayReports.length;
  let todayGoodAccounts = 0;
  let todayPending = 0;
  let todayCancel = 0;
  let todayIncome = 0;

  todayReports.forEach((r) => {
    const status = (r.status || "").toLowerCase();
    const gCount = (r.good_count || "").toString().toLowerCase();

    if (gCount === "pending" || status === "pending") {
      todayPending++;
    } else if (
      gCount === "cancel" ||
      status === "cancel" ||
      status === "failed" ||
      status === "rejected"
    ) {
      todayCancel++;
    } else if (
      gCount === "success" ||
      status === "success" ||
      !isNaN(Number(gCount))
    ) {
      const countNum = !isNaN(Number(gCount)) ? Number(gCount) : 1;
      todayGoodAccounts += countNum;
      todayIncome += countNum * calculateSlabRate(countNum, r.work_name);
    }
  });

  if (document.getElementById("stat-today-submissions")) {
    document.getElementById("stat-today-submissions").innerText =
      todaySubmissions;
  }
  if (document.getElementById("stat-good-accounts")) {
    document.getElementById("stat-good-accounts").innerText = todayGoodAccounts;
  }
  if (document.getElementById("stat-today-pending")) {
    document.getElementById("stat-today-pending").innerText = todayPending;
  }
  if (document.getElementById("stat-today-cancel")) {
    document.getElementById("stat-today-cancel").innerText = todayCancel;
  }
  if (document.getElementById("stat-today-income")) {
    document.getElementById("stat-today-income").innerText =
      `৳${todayIncome.toFixed(2)}`;
  }

  const categories = ["instagram", "facebook", "meta_ai"];

  categories.forEach((cat) => {
    const catTodayReports = todayReports.filter((r) => r.work_name === cat);
    const catTodayCount = catTodayReports.length;

    const prefix =
      cat === "instagram" ? "insta" : cat === "facebook" ? "fb" : "meta";

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

  const recentList = document.getElementById("recent-history-list");
  if (recentList) {
    if (userReports.length === 0) {
      recentList.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-500">এখনো কোনো কাজ জমা দেওয়া হয়নি</td></tr>`;
    } else {
      recentList.innerHTML = userReports
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

          let gCountVal = (r.good_count || "").toString().toLowerCase();
          let statusBadge = "";

          if (gCountVal === "pending" || r.status === "pending") {
            statusBadge = `<span style="color: #f59e0b; font-weight: bold; background: rgba(245, 158, 11, 0.1); padding: 2px 8px; border-radius: 4px;">Pending</span>`;
          } else if (gCountVal === "cancel" || r.status === "cancel") {
            statusBadge = `<span style="color: #f43f5e; font-weight: bold; background: rgba(244, 63, 94, 0.1); padding: 2px 8px; border-radius: 4px;">Cancel</span>`;
          } else if (gCountVal === "success" || r.status === "success") {
            statusBadge = `<span style="color: #10b981; font-weight: bold; background: rgba(16, 185, 129, 0.1); padding: 2px 8px; border-radius: 4px;">Success</span>`;
          } else {
            statusBadge = `<span class="font-semibold text-emerald-400">${r.good_count || "N/A"}</span>`;
          }

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
              <td class="p-3.5 text-center">${statusBadge}</td>
            </tr>
          `;
        })
        .join("");
    }
  }
}

function setSubmitMode(mode) {
  document.getElementById("submit-mode-input").value = mode;
  const singleBtn = document.getElementById("mode-single-btn");
  const bulkBtn = document.getElementById("mode-bulk-btn");

  if (mode === "single") {
    singleBtn.className =
      "px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-600 text-white transition";
    bulkBtn.className =
      "px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-400 hover:text-white transition";
  } else {
    bulkBtn.className =
      "px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-600 text-white transition";
    singleBtn.className =
      "px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-400 hover:text-white transition";
  }
  renderWorkInputs();
}

async function handleWorkSubmit(e) {
  e.preventDefault();
  const modeInput = document.getElementById("submit-mode-input");
  const mode = modeInput ? modeInput.value : "single";

  if (mode === "bulk") {
    return handleBulkSubmitAction(e);
  }

  const workTypeElem = document.getElementById("work-type");
  if (!workTypeElem) return;

  const work_name = workTypeElem.value;
  let userFullName = currentUser
    ? currentUser.full_name || currentUser.username || currentUser.email
    : "Unknown User";

  let payload = {
    user_id: currentUser ? currentUser.id : null,
    full_name: userFullName,
    work_name,
    account_password: document.getElementById("work-pass")
      ? document.getElementById("work-pass").value
      : "",
    account_email: "",
    account_username: "",
    two_fa: "",
    uid: "",
    cookies: "",
    account_stock: "stock",
    good_count: "pending",
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
  if (error) return showCustomModal("জমা ব্যর্থ হয়েছে: " + error.message);

  showCustomModal("কাজটি সফলভাবে জমা হয়েছে!");
  e.target.reset();
  renderWorkInputs();
  await loadUserData();
}

async function handleBulkSubmitAction(e) {
  const workTypeElem = document.getElementById("work-type");
  const work_name = workTypeElem ? workTypeElem.value || "meta_ai" : "meta_ai";

  const textarea = document.getElementById("bulk-work-textarea");
  if (!textarea || !textarea.value.trim())
    return showCustomModal("দয়া করে বাল্ক ডাটা দিন।");

  const lines = textarea.value.trim().split("\n");
  let userFullName = currentUser
    ? currentUser.full_name || currentUser.username || currentUser.email
    : "Unknown User";
  let insertPayloads = [];
  let seenInBatch = new Set();

  for (let i = 0; i < lines.length; i++) {
    let cleanLine = lines[i].trim();
    if (!cleanLine) continue;

    let sanitized = cleanLine.replace(/[\u200B\u200C\u200D\uFEFF]/g, "").trim();

    const parts = sanitized.split(/\s+/).map((p) => p.trim());

    if (parts.length < 3 || !parts[0] || !parts[1] || !parts[2]) {
      return showCustomModal(
        `লাইন ${i + 1}-এ তথ্য অসম্পূর্ণ! প্রতিটি লাইনে অবশ্যই ইমেইল, পাসওয়ার্ড এবং ইউজারনেম দিতে হবে।`,
      );
    }

    let email = parts[0];
    let password = parts[1];
    let username = parts[2];

    let uniqueKey = `${email}_${password}_${username}`;
    if (seenInBatch.has(uniqueKey)) {
      return showCustomModal(
        `লাইন ${i + 1}-এ ডুপ্লিকেট ডাটা পাওয়া গেছে! একই ডাটা একাধিকবার দেওয়া যাবে না।`,
      );
    }
    seenInBatch.add(uniqueKey);

    let payload = {
      user_id: currentUser ? currentUser.id : null,
      full_name: userFullName,
      work_name,
      account_email: email,
      account_password: password,
      account_username: username,
      two_fa: "",
      uid: "",
      cookies: "",
      account_stock: "stock",
      good_count: "pending",
      created_at: getBangladeshISOString(),
    };

    insertPayloads.push(payload);
  }

  if (insertPayloads.length === 0)
    return showCustomModal("কোনো বৈধ ডাটা পাওয়া যায়নি!");

  for (let item of insertPayloads) {
    const { data: existingData, error: checkError } = await supabaseClient
      .from("work_reports")
      .select("id")
      .eq("account_email", item.account_email)
      .eq("account_password", item.account_password)
      .eq("account_username", item.account_username)
      .maybeSingle();

    if (checkError) {
      console.error("Duplicate check error:", checkError);
    }

    if (existingData) {
      return showCustomModal(
        `সতর্কতা: "${item.account_email}" এই অ্যাকাউন্টটি ইতিমধ্যে ডাটাবেজে জমা রয়েছে। ডুপ্লিকেট ডাটা পুনরায় জমা দেওয়া যাবে না।`,
      );
    }
  }

  const { error } = await supabaseClient
    .from("work_reports")
    .insert(insertPayloads);
  if (error)
    return showCustomModal("বাল্ক সাবমিট ব্যর্থ হয়েছে: " + error.message);

  showCustomModal(
    `সফলভাবে ${insertPayloads.length}টি অ্যাকাউন্ট একসাথে জমা হয়েছে!`,
  );

  // টেক্সটবক্স এবং ডানপাশের লাইভ প্রিভিউ পরিষ্কার করার কোড
  textarea.value = "";
  renderWorkInputs();
  updateLivePreview();

  await loadUserData();
}

// ডাইনামিক ইনপুট ফিল্ড রেন্ডারিং
function renderWorkInputs() {
  const container = document.getElementById("dynamic-work-inputs");
  const modeInput = document.getElementById("submit-mode-input");
  const mode = modeInput ? modeInput.value : "single";

  if (!container) return;

  if (mode === "bulk") {
    container.innerHTML = `
      <div>
    <label class="block text-xs font-medium text-slate-400 mb-1">বাল্ক ডাটা (প্রতি লাইনে ১টি)</label>
    <textarea id="bulk-work-textarea" required rows="6" placeholder="jonykhan@gmail.com Jony@777 jonycmtd445" class="w-full h-[155px] bg-slate-900 border border-slate-700/80 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono resize-none"></textarea>
    <p class="text-[11px] text-slate-400 mt-1">ফরম্যাট: <code>email password username</code> (স্পেস দিয়ে)</p>
</div>
    `;
    return;
  }

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
    return showCustomModal("দয়া করে একটি সঠিক পাসওয়ার্ড দিন।");
  }

  const { error } = await supabaseClient
    .from("users")
    .update({ password: newPassword })
    .eq("id", currentUser.id);

  if (error)
    return showCustomModal("পাসওয়ার্ড আপডেট ব্যর্থ হয়েছে: " + error.message);

  currentUser.password = newPassword;
  localStorage.setItem("custom_app_user", JSON.stringify(currentUser));

  document.getElementById("prof-password").value = newPassword;
  document.getElementById("update-new-pass").value = "";
  showCustomModal("পাসওয়ার্ড সফলভাবে আপডেট করা হয়েছে!");
}

async function handlePaymentUpdate(e) {
  e.preventDefault();
  const method = document.getElementById("update-pay-method").value;
  const number = document.getElementById("update-pay-number").value;

  if (!number || number.trim() === "") {
    return showCustomModal("দয়া করে সঠিক মোবাইল নাম্বার দিন।");
  }

  const { error } = await supabaseClient
    .from("users")
    .update({ payment_method: method, payment_number: number })
    .eq("id", currentUser.id);

  if (error)
    return showCustomModal("পেমেন্ট তথ্য আপডেট ব্যর্থ হয়েছে: " + error.message);

  currentUser.payment_method = method;
  currentUser.payment_number = number;
  localStorage.setItem("custom_app_user", JSON.stringify(currentUser));

  document.getElementById("prof-pay-method").innerText = method;
  document.getElementById("prof-pay-number").innerText = number;
  document.getElementById("update-pay-number").value = "";
  showCustomModal("পেমেন্ট তথ্য সফলভাবে আপডেট করা হয়েছে!");
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
    return showCustomModal("দয়া করে আগে লগইন করুন!");
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
    return showCustomModal("ভুল পাসওয়ার্ড দেওয়া হয়েছে!");
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
    return showCustomModal("ত্রুটি: " + error.message);
  }

  showCustomModal("সফলভাবে সম্পন্ন হয়েছে!");
  closeMetaGeneratorModal();
}

function copyText(text, label) {
  navigator.clipboard.writeText(text);
  showCustomModal(label + " সফলভাবে কপি করা হয়েছে!");
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

  historyData.forEach((item) => {
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

// ================= তারিখভিত্তিক একাউন্ট হিস্ট্রি রেন্ডার ফাংশন (তারিখ ফরম্যাট সহ) =================
function renderDateWiseAccountHistory(reports = []) {
  const safeReports = Array.isArray(reports) ? reports : [];

  const currentUserId =
    window.currentUserId ||
    localStorage.getItem("user_id") ||
    localStorage.getItem("uid") ||
    (window.currentUser ? window.currentUser.id : null);
  const currentUserEmail =
    window.currentUserEmail ||
    localStorage.getItem("user_email") ||
    (window.currentUser ? window.currentUser.email : null);

  const userReports =
    !currentUserId && !currentUserEmail
      ? safeReports
      : safeReports.filter((r) => {
          return (
            (currentUserId &&
              (r.user_id == currentUserId ||
                r.uid == currentUserId ||
                r.userId == currentUserId)) ||
            (currentUserEmail &&
              (r.email === currentUserEmail ||
                r.user_email === currentUserEmail))
          );
        });

  const groupedData = {};

  userReports.forEach((r) => {
    if (!r.created_at) return;
    const dateStr = formatDateToYYYYMMDD(r.created_at);
    const category = (r.work_name || "unknown").toLowerCase();

    const key = `${dateStr}_${category}`;

    if (!groupedData[key]) {
      groupedData[key] = {
        date: dateStr,
        category: r.work_name || category,
        total: 0,
        good: 0,
        cancel: 0,
        pending: 0,
        goodReports: [],
        cancelReports: [],
      };
    }

    groupedData[key].total += 1;

    const gCount = (r.good_count || "").toString().toLowerCase();
    const status = (r.status || "").toString().toLowerCase();

    if (gCount === "pending" || status === "pending") {
      groupedData[key].pending += 1;
    } else if (
      gCount === "cancel" ||
      status === "cancel" ||
      status === "failed" ||
      status === "rejected"
    ) {
      groupedData[key].cancel += 1;
      groupedData[key].cancelReports.push(r);
    } else {
      groupedData[key].good += 1;
      groupedData[key].goodReports.push(r);
    }
  });

  const tableBody = document.getElementById("daily-account-history-list");
  if (!tableBody) return;

  const keys = Object.keys(groupedData).sort().reverse();

  if (keys.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400 text-xs">কোনো হিস্ট্রি পাওয়া যায়নি</td></tr>`;
    return;
  }

  tableBody.innerHTML = keys
    .map((key) => {
      const item = groupedData[key];

      const formattedDate = (() => {
        const d = new Date(item.date);
        if (isNaN(d.getTime())) return item.date;
        return d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      })();

      let badgeClass = "bg-purple-500/10 text-purple-400 border-purple-500/20";
      if (item.category === "facebook")
        badgeClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";
      if (item.category === "instagram")
        badgeClass = "bg-pink-500/10 text-pink-400 border-pink-500/20";

      const goodDisplay =
        item.good > 0
          ? `<button onclick='openGoodDetailsModal(${JSON.stringify(item)})' class="font-bold text-emerald-500 hover:text-emerald-400 underline cursor-pointer bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 transition">${item.good} টি</button>`
          : `<span class="font-semibold text-emerald-500/70">0</span>`;

      const cancelDisplay =
        item.cancel > 0
          ? `<button onclick='openCancelDetailsModal(${JSON.stringify(item)})' class="font-bold text-rose-500 hover:text-rose-400 underline cursor-pointer bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20 transition">${item.cancel} টি</button>`
          : `<span class="font-semibold text-rose-500/70">0</span>`;

      return `
      <tr class="hover:bg-slate-800/50 transition-colors border-t border-slate-700/50">
        <td class="p-4 font-mono text-slate-300">${formattedDate}</td>
        <td class="p-4 font-semibold">
          <span class="px-2.5 py-1 text-xs rounded-lg border uppercase tracking-wider ${badgeClass}">
            ${item.category.replace("_", " ")}
          </span>
        </td>
        <td class="p-4 font-bold text-emerald-400">${item.total} টি</td>
        <td class="p-4 font-semibold">${goodDisplay}</td>
        <td class="p-4 font-semibold">${cancelDisplay}</td>
        <td class="p-4 font-semibold text-amber-500">${item.pending}</td>
      </tr>
    `;
    })
    .join("");
}

// ================= গুড ডিটেইলস মডাল হ্যান্ডলার =================
function openGoodDetailsModal(item) {
  const modal = document.getElementById("good-details-modal");
  const title = document.getElementById("good-modal-title");
  const subtitle = document.getElementById("good-modal-subtitle");
  const list = document.getElementById("good-modal-accounts-list");

  if (!modal) return;

  title.innerText = `${(item.category || "Category").toUpperCase()} - গুড অ্যাকাউন্টস`;
  subtitle.innerText = `তারিখ: ${item.date} | মোট গুড: ${item.good} টি`;

  list.innerHTML = "";
  const goodReports = item.goodReports || [];

  if (goodReports.length === 0) {
    list.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-500 text-xs">কোনো গুড রিপোর্ট পাওয়া যায়নি</td></tr>`;
  } else {
    goodReports.forEach((acc, idx) => {
      const accountDisplay =
        acc.account_username || acc.account_email || acc.uid || "N/A";
      const password = acc.account_password || acc.password || "N/A";
      const extraInfo = acc.two_fa || acc.cookies || "N/A";

      const tr = document.createElement("tr");
      tr.className =
        "hover:bg-slate-800/50 transition-colors border-b border-slate-800/40";
      tr.innerHTML = `
        <td class="p-3 font-mono text-slate-400">${idx + 1}</td>
        <td class="p-3 text-slate-200 font-mono font-semibold">${accountDisplay}</td>
        <td class="p-3 text-slate-300 font-mono">${password}</td>
        <td class="p-3 text-indigo-300 font-mono max-w-[250px] truncate" title="${extraInfo}">${extraInfo}</td>
        <td class="p-3 text-center">
          <span class="px-2.5 py-1 text-[11px] rounded-lg font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Good / Success
          </span>
        </td>
      `;
      list.appendChild(tr);
    });
  }

  modal.classList.remove("hidden");
}

function closeGoodModal() {
  const modal = document.getElementById("good-details-modal");
  if (modal) {
    modal.classList.add("hidden");
  }
}

// ================= ক্যানসেল ডিটেইলস মডাল হ্যান্ডলার =================
function openCancelDetailsModal(item) {
  const modal = document.getElementById("cancel-details-modal");
  const title = document.getElementById("cancel-modal-title");
  const subtitle = document.getElementById("cancel-modal-subtitle");
  const list = document.getElementById("cancel-modal-accounts-list");

  if (!modal) return;

  title.innerText = `${(item.category || "Category").toUpperCase()} - ক্যানসেল অ্যাকাউন্টস`;
  subtitle.innerText = `তারিখ: ${item.date} | মোট ক্যানসেল: ${item.cancel} টি`;

  list.innerHTML = "";
  const cancelReports = item.cancelReports || [];

  if (cancelReports.length === 0) {
    list.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-500 text-xs">কোনো ক্যানসেল রিপোর্ট পাওয়া যায়নি</td></tr>`;
  } else {
    cancelReports.forEach((acc, idx) => {
      const accountDisplay =
        acc.account_username || acc.account_email || acc.uid || "N/A";
      const password = acc.account_password || acc.password || "N/A";
      const extraInfo = acc.two_fa || acc.cookies || "N/A";

      const tr = document.createElement("tr");
      tr.className =
        "hover:bg-slate-800/50 transition-colors border-b border-slate-800/40";
      tr.innerHTML = `
        <td class="p-3 font-mono text-slate-400">${idx + 1}</td>
        <td class="p-3 text-slate-200 font-mono font-semibold">${accountDisplay}</td>
        <td class="p-3 text-slate-300 font-mono">${password}</td>
        <td class="p-3 text-indigo-300 font-mono max-w-[250px] truncate" title="${extraInfo}">${extraInfo}</td>
        <td class="p-3 text-center">
          <span class="px-2.5 py-1 text-[11px] rounded-lg font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            Cancel
          </span>
        </td>
      `;
      list.appendChild(tr);
    });
  }

  modal.classList.remove("hidden");
}

function closeCancelModal() {
  const modal = document.getElementById("cancel-details-modal");
  if (modal) {
    modal.classList.add("hidden");
  }
}

function selectPlatform(platformValue, element) {
  localStorage.setItem("selectedPlatform", platformValue);

  const selectElem = document.getElementById("work-type");
  if (selectElem) {
    selectElem.value = platformValue;
    selectElem.dispatchEvent(new Event("change"));
  }

  document.querySelectorAll(".platform-option").forEach((opt) => {
    opt.className =
      "platform-option flex items-center justify-between p-3 rounded-xl border border-slate-700/60 bg-slate-900/90 hover:bg-slate-800 cursor-pointer transition-all";
    const indicator = opt.querySelector(".radio-indicator");
    if (indicator) {
      indicator.innerHTML = "";
      indicator.className =
        "radio-indicator w-3.5 h-3.5 rounded-full border border-slate-600 flex items-center justify-center shrink-0";
    }
  });

  let activeBorder = "border-slate-700/60";
  let activeBg = "bg-slate-900/90";
  let indicatorClass = "w-3.5 h-3.5 rounded-full bg-slate-600";

  let infoBorder = "border-slate-700/60";
  let infoShadow = "";
  let infoBg = "bg-slate-900/40";

  if (platformValue === "instagram") {
    activeBorder = "border-pink-500 shadow-lg shadow-pink-500/20";
    activeBg = "bg-gradient-to-r from-pink-500/15 to-slate-900/90";
    indicatorClass =
      "w-3.5 h-3.5 rounded-full bg-pink-500 flex items-center justify-center shadow-sm shadow-pink-500";

    infoBorder = "border-pink-500/60";
    infoShadow = "shadow-xl shadow-pink-500/10";
    infoBg =
      "bg-gradient-to-br from-pink-500/10 via-slate-900/40 to-slate-900/60";
  } else if (platformValue === "facebook") {
    activeBorder = "border-blue-500 shadow-lg shadow-blue-500/20";
    activeBg = "bg-gradient-to-r from-blue-500/15 to-slate-900/90";
    indicatorClass =
      "w-3.5 h-3.5 rounded-full bg-blue-500 flex items-center justify-center shadow-sm shadow-blue-500";

    infoBorder = "border-blue-500/60";
    infoShadow = "shadow-xl shadow-blue-500/10";
    infoBg =
      "bg-gradient-to-br from-blue-500/10 via-slate-900/40 to-slate-900/60";
  } else if (platformValue === "meta_ai") {
    activeBorder = "border-purple-500 shadow-lg shadow-purple-500/20";
    activeBg = "bg-gradient-to-r from-purple-500/15 to-slate-900/90";
    indicatorClass =
      "w-3.5 h-3.5 rounded-full bg-purple-500 flex items-center justify-center shadow-sm shadow-purple-500";

    infoBorder = "border-purple-500/60";
    infoShadow = "shadow-xl shadow-purple-500/10";
    infoBg =
      "bg-gradient-to-br from-purple-500/10 via-slate-900/40 to-slate-900/60";
  }

  if (!element) {
    document.querySelectorAll(".platform-option").forEach((opt) => {
      if (
        opt.getAttribute("onclick") &&
        opt.getAttribute("onclick").includes(platformValue)
      ) {
        element = opt;
      }
    });
  }

  if (element) {
    element.className = `platform-option flex items-center justify-between p-3 rounded-xl border ${activeBorder} ${activeBg} cursor-pointer transition-all`;
    const activeIndicator = element.querySelector(".radio-indicator");
    if (activeIndicator) {
      activeIndicator.className = `radio-indicator ${indicatorClass}`;
      activeIndicator.innerHTML = `<svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>`;
    }
  }

  const infoContainer = document.getElementById("account-info-container");
  if (infoContainer) {
    infoContainer.className = `md:col-span-7 space-y-4 p-4 sm:p-5 rounded-2xl border ${infoBorder} ${infoBg} ${infoShadow} transition-all duration-300`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const savedPlatform = localStorage.getItem("selectedPlatform") || "meta_ai";
  selectPlatform(savedPlatform);
});

function updateLivePreview() {
  const tableBody = document.getElementById("live-preview-table-body");
  const countBadge = document.getElementById("preview-count");

  if (!tableBody || !countBadge) return;

  const textarea = document.querySelector("textarea");

  if (!textarea || !textarea.value.trim()) {
    tableBody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-slate-500 text-xs">বামপাশের বক্সে ডাটা লিখলে এখানে টেবিল আকারে প্রিভিউ দেখা যাবে...</td></tr>`;
    countBadge.innerText = `০ টি আইটেম`;
    return;
  }

  const text = textarea.value.trim();
  const lines = text.split("\n").filter((line) => line.trim() !== "");
  countBadge.innerText = `${lines.length} টি আইটেম`;

  let html = "";
  lines.forEach((line, index) => {
    const parts = line.trim().split(/\s+/);
    const mail = parts[0] || "";
    const password = parts[1] || "";
    const username = parts[2] || "";

    html += `
      <tr class="hover:bg-slate-800/50 transition">
        <td class="p-2.5 text-center text-slate-400 font-semibold">${index + 1}</td>
        <td class="p-2.5 text-indigo-300 truncate max-w-[140px]">${mail}</td>
        <td class="p-2.5 text-emerald-400">${password}</td>
        <td class="p-2.5 text-amber-300">${username}</td>
      </tr>
    `;
  });

  tableBody.innerHTML = html;
}

document.addEventListener("input", function (e) {
  if (e.target.tagName === "TEXTAREA") {
    updateLivePreview();
  }
});

function showCustomModal(message, title = "সতর্কতা") {
  const modal = document.getElementById("customModal");
  const modalBox = document.getElementById("customModalBox");
  const titleEl = document.getElementById("customModalTitle");
  const msgEl = document.getElementById("customModalMessage");

  if (!modal) return;

  titleEl.textContent = title;
  msgEl.textContent = message;

  modal.classList.remove("hidden");
  setTimeout(() => {
    modalBox.classList.remove("scale-95", "opacity-0");
    modalBox.classList.add("scale-100", "opacity-100");
  }, 10);
}

function closeCustomModal() {
  const modal = document.getElementById("customModal");
  const modalBox = document.getElementById("customModalBox");

  if (!modal) return;

  modalBox.classList.remove("scale-100", "opacity-100");
  modalBox.classList.add("scale-95", "opacity-0");
  setTimeout(() => {
    modal.classList.add("hidden");
  }, 200);
}

// See All মডাল ওপেন করার ফাংশন এবং সকল ডাটা ফেচ করা
async function openAllSubmissionsModal() {
  const modal = document.getElementById("all-submissions-modal");
  const tbody = document.getElementById("all-submissions-tbody");
  if (!modal || !tbody) return;

  modal.style.display = "flex";
  tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #aaa;">লোড হচ্ছে...</td></tr>`;

  try {
    let query = supabaseClient
      .from("work_reports")
      .select("*")
      .order("created_at", { ascending: false });

    // যদি ইউজার আইডি অনুযায়ী ফিল্টার করতে হয়
    if (currentUser && currentUser.id) {
      query = query.eq("user_id", currentUser.id);
    }

    const { data, error } = await query;

    if (error) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #ff5252;">ডাটা লোড করতে সমস্যা হয়েছে!</td></tr>`;
      console.error(error);
      return;
    }

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #aaa;">কোনো কাজ পাওয়া যায়নি।</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    data.forEach((item) => {
      let statusBadge = "";
      if (item.account_stock === "success" || item.good_count === "success") {
        statusBadge = `<span style="background: rgba(16, 185, 129, 0.15); color: #34d399; padding: 3px 10px; border-radius: 4px; font-size: 12px; font-weight: 500;">Success</span>`;
      } else if (
        item.account_stock === "cancel" ||
        item.good_count === "cancel"
      ) {
        statusBadge = `<span style="background: rgba(239, 68, 68, 0.15); color: #f87171; padding: 3px 10px; border-radius: 4px; font-size: 12px; font-weight: 500;">Cancel</span>`;
      } else {
        statusBadge = `<span style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; padding: 3px 10px; border-radius: 4px; font-size: 12px; font-weight: 500;">Pending</span>`;
      }

      let row = `
        <tr style="border-bottom: 1px solid #252538;">
          <td style="padding: 12px 10px;"><span style="background: rgba(99, 102, 241, 0.15); color: #818cf8; padding: 3px 8px; border-radius: 4px; font-size: 11px;">${item.work_name || "META AI"}</span></td>
          <td style="padding: 12px 10px;">${item.account_email || item.account_username || "N/A"}</td>
          <td style="padding: 12px 10px; color: #34d399;">৳1.00</td>
          <td style="padding: 12px 10px; color: #9ca3af; font-size: 13px;">${item.created_at ? new Date(item.created_at).toLocaleString() : ""}</td>
          <td style="padding: 12px 10px;">${statusBadge}</td>
        </tr>
      `;
      tbody.innerHTML += row;
    });
  } catch (err) {
    console.error("Error fetching all submissions:", err);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #ff5252;">unexpected error occurred.</td></tr>`;
  }
}

// See All মডাল বন্ধ করার ফাংশন
function closeAllSubmissionsModal() {
  const modal = document.getElementById("all-submissions-modal");
  if (modal) {
    modal.style.display = "none";
  }
}

// বাইরে ক্লিক করলে মডাল বন্ধ হওয়ার অপশন (ঐচ্ছিক)
window.addEventListener("click", function (event) {
  const modal = document.getElementById("all-submissions-modal");
  if (event.target === modal) {
    closeAllSubmissionsModal();
  }
});
