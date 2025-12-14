/* ==========================================================================
   PHẦN 1: CÁC HÀM HỖ TRỢ GIAO DIỆN (UI UTILS) - (GIỮ NGUYÊN)
   ========================================================================== */

// 1.1. Hiển thị thông báo dạng dòng chữ (Inline)
function showInlineMessage(elementId, message, type = 'error') {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.innerText = message;
    el.classList.remove('hidden');
    
    el.classList.remove('text-red-500', 'text-green-500');
    if (type === 'success') {
        el.classList.add('text-green-500');
    } else {
        el.classList.add('text-red-500');
    }
}

// 1.2. Hiển thị Toast (Thông báo trượt)
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) { alert(message); return; }

    const config = {
        success: { icon: '<i class="fas fa-check-circle text-green-400"></i>', border: 'border-green-500/50' },
        error: { icon: '<i class="fas fa-times-circle text-red-400"></i>', border: 'border-red-500/50' },
        info: { icon: '<i class="fas fa-info-circle text-blue-400"></i>', border: 'border-blue-500/50' }
    };
    const style = config[type] || config.success;

    const toast = document.createElement('div');
    toast.className = `toast-enter pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border ${style.border} bg-[#202123] shadow-2xl min-w-[300px] z-[999999]`;
    toast.innerHTML = `
        <div class="text-xl">${style.icon}</div>
        <p class="text-sm text-gray-200 font-medium">${message}</p>
    `;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.remove('toast-enter');
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 1.3. Modal Xác nhận Xóa
let deleteAction = null;

function openConfirmModal(action) {
    deleteAction = action;
    const modal = document.getElementById('confirmModal');
    if (modal) modal.classList.remove('hidden');
}

function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    if (modal) modal.classList.add('hidden');
    deleteAction = null;
}

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('confirmDeleteBtn');
    if (btn) {
        btn.onclick = () => { 
            if(deleteAction) deleteAction(); 
            closeConfirmModal(); 
        };
    }
});


/* ==========================================================================
   PHẦN 2: XÁC THỰC (AUTHENTICATION) - (GIỮ NGUYÊN)
   ========================================================================== */

function openLogin() { 
    document.getElementById('loginModal').classList.remove('hidden'); 
    const err = document.getElementById('log_error');
    if(err) err.classList.add('hidden'); 
}
function closeLogin() { document.getElementById('loginModal').classList.add('hidden'); }

function openRegister() { 
    document.getElementById('registerModal').classList.remove('hidden'); 
    const err = document.getElementById('reg_error');
    if(err) err.classList.add('hidden'); 
}
function closeRegister() { document.getElementById('registerModal').classList.add('hidden'); }

function switchModal(type) {
    if (type === 'login') { closeRegister(); openLogin(); } 
    else { closeLogin(); openRegister(); }
}

// --- ĐĂNG KÝ ---
async function submitRegister() {
    // 1. Lấy dữ liệu từ form
    const email = document.getElementById('reg_email').value;
    const password = document.getElementById('reg_password').value;
    const errorDiv = 'reg_error';
    
    // 2. Reset thông báo lỗi cũ (nếu có)
    const errEl = document.getElementById(errorDiv);
    if (errEl) errEl.classList.add('hidden');

    // 3. Validate cơ bản phía Client
    if (!email || !password) {
        showInlineMessage(errorDiv, "Please fill in all fields", "error");
        return;
    }
    if (password.length < 6) {
        showInlineMessage(errorDiv, "Password must be at least 6 characters", "error");
        return;
    }

    // 4. [QUAN TRỌNG] Lấy mã giới thiệu từ bộ nhớ (nếu người dùng đã click link trước đó)
    // Nếu không có, biến này sẽ là null
    const referralCode = localStorage.getItem('referral_code');

    // 5. Hiệu ứng Loading cho nút bấm
    const btn = document.querySelector('#registerModal button[type="submit"]') || document.querySelector('#registerModal button');
    const originalText = btn ? btn.innerHTML : 'Sign Up';
    if(btn) { 
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...'; 
        btn.disabled = true; 
    }

    try {
        // 6. Gửi API đăng ký kèm Referral Code
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email, 
                password, 
                full_name: "User", // Tên mặc định, người dùng có thể đổi sau trong Profile
                referral_code: referralCode // <--- Gửi mã lên server để tính thưởng
            })
        });
        const data = await response.json();

        // 7. Xử lý kết quả trả về
        if (data.status === "success") {
            showInlineMessage(errorDiv, "Registration successful! Redirecting to Login...", "success");
            
            // [QUAN TRỌNG] Đăng ký thành công -> Xóa mã giới thiệu khỏi máy để sạch sẽ
            localStorage.removeItem('referral_code');

            // Chuyển sang màn hình Login sau 1.5s để người dùng kịp đọc thông báo
            setTimeout(() => {
                switchModal('login');
                // Tự động điền email vừa đăng ký vào ô Login cho tiện
                const logEmail = document.getElementById('log_email');
                if(logEmail) logEmail.value = email;
            }, 1500);
        } else {
            showInlineMessage(errorDiv, data.message || "Registration failed", "error");
        }
    } catch (e) {
        console.error("Register error:", e);
        showInlineMessage(errorDiv, "Connection error to Server. Please check your internet.", "error");
    } finally {
        // 8. Trả lại trạng thái nút bấm ban đầu
        if(btn) { 
            btn.innerHTML = originalText; 
            btn.disabled = false; 
        }
    }
}


// --- ĐĂNG NHẬP ---
async function submitLogin() {
    const email = document.getElementById('log_email').value;
    const password = document.getElementById('log_password').value;
    const errorDiv = 'log_error';
    
    // 1. Reset trạng thái lỗi cũ
    const errEl = document.getElementById(errorDiv);
    if (errEl) errEl.classList.add('hidden');

    // 2. Validate client-side
    if (!email || !password) {
        showInlineMessage(errorDiv, "Please fill in all fields", "error");
        return;
    }

    // 3. Hiệu ứng Loading
    const btn = document.querySelector('#loginModal button[type="submit"]') || document.querySelector('#loginModal button');
    const originalText = btn ? btn.innerHTML : 'Log In';
    if(btn) { 
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...'; 
        btn.disabled = true; 
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();

        if (data.status === "success") {
            // Xóa token cũ hoặc referral code cũ (nếu có) để tránh rác
            localStorage.removeItem('referral_code'); 
            
            // Lưu token mới
            localStorage.setItem('session_token', data.session_token);
            
            showInlineMessage(errorDiv, "Login Success! Redirecting...", "success");
            
            // Redirect sau 1s
            setTimeout(() => {
                window.location.href = data.redirect || "/frontend/chat.html";
            }, 1000);
        } else {
            showInlineMessage(errorDiv, data.message || "Invalid credentials", "error");
        }
    } catch (e) {
        console.error("Login error:", e);
        showInlineMessage(errorDiv, "Connection Error. Please try again.", "error");
    } finally {
        // Reset nút bấm
        if(btn) { 
            btn.innerHTML = originalText; 
            btn.disabled = false; 
        }
    }
}



// --- ĐĂNG XUẤT ---
function toggleLogoutPopup(e) { e.stopPropagation(); document.getElementById('logoutPopup').classList.toggle('hidden'); }
document.addEventListener('click', (e) => {
    const p = document.getElementById('logoutPopup');
    if (p && !p.classList.contains('hidden') && !p.contains(e.target) && e.target.id !== 'userIcon') p.classList.add('hidden');
});

async function handleLogout() {
    const token = localStorage.getItem('session_token');
    if(token) {
        try { await fetch('/api/logout', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({session_token: token}) }); } catch (e) {}
    }
    
    // [IMPORTANT] Clear everything
    localStorage.removeItem('session_token');
    localStorage.removeItem('currentBotId'); // Clear previously selected bot
    sessionStorage.clear(); // Clear temporary session
    
    showToast("Logged out successfully", "success");
    setTimeout(() => window.location.href = "/frontend/index.html", 500);
}


/* ==========================================================================
   PHẦN 3: QUẢN LÝ BOT (BOT MANAGER)
   ========================================================================== */

function toggleBotModal() { document.getElementById('botModal').classList.toggle('hidden'); }

// Tạo Bot
async function handleCreateBot(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    btn.innerHTML = 'Creating...'; btn.disabled = true;

    try {
        const res = await fetch('/api/bots/create', { method: 'POST', body: new FormData(event.target) });
        const data = await res.json();
        if (data.status === 'success') {
            showToast("Tạo Bot thành công!", "success");
            toggleBotModal();
            event.target.reset();
            loadBots();
        } else { 
            showToast(data.message, "error"); 
        }
    } catch (e) { showToast("Lỗi hệ thống", "error"); }
    finally { btn.innerHTML = 'Create Bot'; btn.disabled = false; }
}

// Load Bot - [CẬP NHẬT]: Nút Chat giờ chuyển hướng kèm ID
async function loadBots() {
    const container = document.getElementById('botListContainer');
    const empty = document.getElementById('emptyBotState');
    if (!container) return;

    try {
        const res = await fetch('/api/bots');
        const data = await res.json();
        if (data.status === 'success' && data.data.length > 0) {
            empty.classList.add('hidden');
            container.innerHTML = data.data.map(bot => `
                <div class="bg-gptInput border border-gray-600 rounded-xl p-6 hover:border-gray-500 transition shadow-lg relative group flex flex-col justify-between">
                    <button onclick="reqDeleteBot('${bot.id}')" class="absolute top-4 right-4 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-2"><i class="fas fa-trash"></i></button>
                    
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-400"><i class="fas fa-robot"></i></div>
                        <div>
                            <h3 class="font-bold text-white truncate max-w-[150px]">${bot.name}</h3>
                            <p class="text-xs text-gray-500">${new Date(bot.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                    
                    <p class="text-gray-400 text-sm mb-4 line-clamp-2 h-10 overflow-hidden">${bot.description || 'No description'}</p>
                    
                    <a href="/frontend/chat.html?botId=${bot.id}" class="block w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-200 transition text-center">
                        <i class="fas fa-comment-alt mr-2"></i> Chat now
                    </a>
                </div>`).join('');
        } else { container.innerHTML = ''; empty.classList.remove('hidden'); }
    } catch (e) { console.error(e); }
}

// Xóa Bot
function reqDeleteBot(id) { openConfirmModal(() => deleteItem(`/api/bots/${id}`, loadBots)); }


/* ==========================================================================
   PHẦN 4: QUẢN LÝ KNOWLEDGE (DATA MANAGER)
   ========================================================================== */

function toggleUploadModal() { document.getElementById('uploadModal').classList.toggle('hidden'); }

function showFileName(input) {
    if (input.files[0]) {
        document.getElementById('fileNameDisplay').textContent = input.files[0].name;
        document.getElementById('filePreview').classList.remove('hidden');
    }
}

// [MỚI] Tải danh sách Bot vào Dropdown trong Modal Upload
async function loadBotsForDropdown() {
    const select = document.getElementById('botSelectDropdown');
    if (!select) return; // Nếu không có dropdown thì thoát (trang khác)

    try {
        const res = await fetch('/api/bots');
        const data = await res.json();
        
        // Reset lại dropdown, giữ option đầu tiên
        select.innerHTML = '<option value="">-- General (All Bots) --</option>';
        
        if (data.status === 'success' && data.data) {
            data.data.forEach(bot => {
                const option = document.createElement("option");
                option.value = bot.id;
                option.textContent = bot.name;
                select.appendChild(option);
            });
        }
    } catch (e) { console.error("Lỗi tải bot list:", e); }
}

// Upload File
async function handleUpload(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    btn.innerHTML = 'Uploading...'; btn.disabled = true;

    try {
        // FormData sẽ tự động lấy cả file và bot_id từ thẻ <select> trong form
        const res = await fetch('/api/knowledge/upload', { method: 'POST', body: new FormData(event.target) });
        const data = await res.json();
        if (data.status === 'success') {
            showToast("Upload thành công!", "success");
            toggleUploadModal();
            event.target.reset();
            document.getElementById('filePreview').classList.add('hidden');
            loadKnowledge();
        } else { showToast(data.message, "error"); }
    } catch (e) { showToast("Lỗi upload", "error"); }
    finally { btn.innerHTML = 'Start Upload'; btn.disabled = false; }
}

// Load Knowledge
async function loadKnowledge() {
    const tbody = document.getElementById('knowledgeListBody');
    const table = document.getElementById('knowledgeTable');
    const empty = document.getElementById('emptyDataState');
    if (!tbody) return;

    try {
        const res = await fetch('/api/knowledge');
        const data = await res.json();
        if (data.status === 'success' && data.data.length > 0) {
            empty.classList.add('hidden'); table.classList.remove('hidden');
            tbody.innerHTML = data.data.map(f => `
                <tr class="border-b border-gray-700 hover:bg-gray-700/50">
                    <td class="px-6 py-4 text-white flex flex-col gap-1">
                        <div class="flex items-center gap-2"><i class="fas fa-file"></i> ${f.filename}</div>
                        ${f.bot_id ? '<span class="text-[10px] text-blue-400 border border-blue-500/30 rounded px-1 w-fit bg-blue-900/20">Bot Specific</span>' : '<span class="text-[10px] text-gray-500 border border-gray-600 rounded px-1 w-fit">General</span>'}
                    </td>
                    <td class="px-6 py-4 text-gray-400">${f.file_size}</td>
                    <td class="px-6 py-4 text-gray-500">${new Date(f.created_at).toLocaleDateString()}</td>
                    <td class="px-6 py-4 text-right">
                        <button onclick="reqDeleteFile('${f.id}')" class="text-gray-500 hover:text-red-500"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`).join('');
        } else { table.classList.add('hidden'); empty.classList.remove('hidden'); }
    } catch (e) { console.error(e); }
}

// Xóa File
function reqDeleteFile(id) { openConfirmModal(() => deleteItem(`/api/knowledge/${id}`, loadKnowledge)); }


/* ==========================================================================
   PHẦN 5: CHỨC NĂNG CHUNG (XÓA & KHỞI TẠO)
   ========================================================================== */

// Hàm xóa chung cho cả Bot và File
async function deleteItem(url, reloadCallback) {
    try {
        const res = await fetch(url, { method: 'DELETE' });
        const data = await res.json();
        if (data.status === 'success') { 
            showToast("Đã xóa thành công!", "success"); 
            reloadCallback(); 
        } else { 
            showToast(data.message, "error"); 
        }
    } catch (e) { showToast("Lỗi khi xóa", "error"); }
}

// Tự động chạy khi tải trang
document.addEventListener('DOMContentLoaded', () => {
    // Trang BOT
    if (document.getElementById('botListContainer')) loadBots();
    
    // Trang DATA
    if (document.getElementById('knowledgeListBody')) {
        loadKnowledge();
        loadBotsForDropdown(); // [MỚI] Tải danh sách bot vào dropdown upload
    }
});