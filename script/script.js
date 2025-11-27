const menuBtn = document.querySelector(".fa-bars");
const sidebar = document.querySelector("aside");

if (menuBtn && sidebar) {
  menuBtn.addEventListener("click", () => {
    sidebar.classList.toggle("hidden");
    sidebar.classList.toggle("fixed");
    sidebar.classList.toggle("inset-0");
    sidebar.classList.toggle("z-50");
    sidebar.classList.toggle("flex");
  });
}

(() => {
  try {
    const links = document.querySelectorAll("aside nav a.sidebar-item");
    if (!links || links.length === 0) return;

    const currentPath = window.location.pathname;

    const normalize = (href) => {
      try {
        return new URL(href, window.location.origin).pathname;
      } catch (e) {
        return href;
      }
    };

    links.forEach((a) => {
      const aPath = normalize(a.getAttribute("href"));
      if (
        aPath === currentPath ||
        (aPath.endsWith("/") === false && currentPath.endsWith(aPath))
      ) {
        a.classList.add("active");
      } else {
        a.classList.remove("active");
      }

      a.addEventListener("click", () => {
        links.forEach((x) => x.classList.remove("active"));
        a.classList.add("active");
      });
    });
  } catch (err) {
    console.error("sidebar active toggle error", err);
  }
})();

function toggleLogoutPopup(event) {
  if (event && event.stopPropagation) event.stopPropagation();
  const popup = document.getElementById("logoutPopup");
  if (!popup) return;
  popup.classList.toggle("hidden");
}

document.addEventListener("click", function (event) {
  const popup = document.getElementById("logoutPopup");
  const icon = document.getElementById("userIcon");

  if (!popup) return;

  if (
    !popup.classList.contains("hidden") &&
    !popup.contains(event.target) &&
    event.target !== icon
  ) {
    popup.classList.add("hidden");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  try {
    const icon = document.getElementById("userIcon");
    if (icon) {
      icon.style.cursor = "pointer";
    }
  } catch (e) {}
});

function handleLogout() {
  const token = localStorage.getItem("session_token");
  if (token) {
    fetch("/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_token: token }),
    }).catch(() => {});
  }

  try {
    localStorage.removeItem("session_token");
  } catch (e) {}
  try {
    sessionStorage.removeItem("from_index");
  } catch (e) {}

  window.location.href = "/";
}

(function blockBackToIndexIfPrevWasIndex() {
  try {
    const path = window.location.pathname || "";

    const isIndex =
      path === "/" ||
      path.endsWith("/index.html") ||
      path.endsWith("/frontend/index.html");
    if (isIndex) {
      try {
        sessionStorage.setItem("prev_was_index", "1");
      } catch (e) {}
      return;
    }

    const ref = document.referrer || "";
    let refPath = "";
    try {
      refPath = new URL(ref).pathname;
    } catch (e) {
      refPath = ref;
    }
    const refIsIndex =
      refPath === "/" ||
      refPath.endsWith("/index.html") ||
      refPath.endsWith("/frontend/index.html");

    const prevWasIndex = sessionStorage.getItem("prev_was_index") === "1";

    if (!refIsIndex && !prevWasIndex) return;

    try {
      history.replaceState({ aurion_block_back: true }, "", location.href);
      history.pushState({}, "", location.href);

      window.addEventListener("popstate", function (e) {
        try {
          history.pushState({}, "", location.href);
        } catch (ex) {}
      });
    } catch (err) {}
  } catch (err) {
    console.error("blockBackToIndex error", err);
  }
})();

try {
  window.toggleLogoutPopup = toggleLogoutPopup;
  window.handleLogout = handleLogout;
} catch (e) {}

// index.html uses these functions
function openRegister() {
  closeLogin();
  const errorDiv = document.getElementById("reg_error");
  if (errorDiv) {
      errorDiv.classList.add("hidden");
      errorDiv.innerText = "";
  }
  document.getElementById("registerModal").classList.remove("hidden");
}
function openLogin() {
  closeRegister();
  const errorDiv = document.getElementById("log_error");
  if (errorDiv) {
      errorDiv.classList.add("hidden");
      errorDiv.innerText = "";
  }
  document.getElementById("loginModal").classList.remove("hidden");
}

function closeRegister() {
  document.getElementById("registerModal").classList.add("hidden");
}
function closeLogin() {
  document.getElementById("loginModal").classList.add("hidden");
}

function switchModal(target) {
  if (target === "login") {
    closeRegister();
    openLogin();
  } else {
    closeLogin();
    openRegister();
  }
}

async function submitRegister() {
  let email = document.getElementById("reg_email").value.trim();
  let password = document.getElementById("reg_password").value.trim();
  let errorDiv = document.getElementById("reg_error"); // Lấy thẻ div lỗi

  // Reset lỗi trước khi chạy
  if (errorDiv) {
      errorDiv.classList.add("hidden");
      errorDiv.innerText = "";
  }

  if (!email || !password) {
    if (errorDiv) {
        errorDiv.innerText = "Vui lòng nhập đầy đủ email và mật khẩu!";
        errorDiv.classList.remove("hidden");
    }
    return;
  }

  try {
    let res = await fetch("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    let data = await res.json();

    if (data.status === "success") {
      closeRegister();
      window.location.href = "chat.html";
    } else {
      // HIỂN THỊ LỖI LÊN FORM (THAY VÌ ALERT)
      if (errorDiv) {
          errorDiv.innerText = data.message;
          errorDiv.classList.remove("hidden");
      }
    }
  } catch (err) {
    console.error(err);
    if (errorDiv) {
        errorDiv.innerText = "Lỗi kết nối server! Kiểm tra backend của bạn.";
        errorDiv.classList.remove("hidden");
    }
  }
}

async function submitLogin() {
  let email = document.getElementById("log_email").value.trim();
  let password = document.getElementById("log_password").value.trim();
  let errorDiv = document.getElementById("log_error"); 

  if (errorDiv) {
      errorDiv.classList.add("hidden");
      errorDiv.innerText = "";
  }

  if (!email || !password) {
    if (errorDiv) {
        errorDiv.innerText = "Vui lòng nhập email và mật khẩu!";
        errorDiv.classList.remove("hidden");
    }
    return;
  }

  try {
    let res = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    let data = await res.json();

    if (data.status === "success") {
      localStorage.setItem("session_token", data.session_token);
      try {
        sessionStorage.setItem("from_index", "1");
      } catch (e) {}

      closeLogin();
      window.location.href = "chat.html";
    } else {
      if (errorDiv) {
          errorDiv.innerText = data.message;
          errorDiv.classList.remove("hidden");
      }
    }
  } catch (err) {
    console.error(err);
    if (errorDiv) {
        errorDiv.innerText = "Không thể kết nối server.";
        errorDiv.classList.remove("hidden");
    }
  }
}

window.onclick = function (event) {
  let regModal = document.getElementById("registerModal");
  let logModal = document.getElementById("loginModal");
  if (event.target == regModal) {
    closeRegister();
  }
  if (event.target == logModal) {
    closeLogin();
  }
};
