// Admin Modal Toggle Logic
const adminBtn = document.getElementById("adminBtn");
const adminModal = document.getElementById("adminModal");
const closeAdminModal = document.getElementById("closeAdminModal");

if (adminBtn && adminModal && closeAdminModal) {
  adminBtn.addEventListener("click", () => {
    adminModal.classList.add("active");
  });

  closeAdminModal.addEventListener("click", () => {
    adminModal.classList.remove("active");
  });

  // Close modal when clicking outside the card box
  adminModal.addEventListener("click", (e) => {
    if (e.target === adminModal) {
      adminModal.classList.remove("active");
    }
  });
}
