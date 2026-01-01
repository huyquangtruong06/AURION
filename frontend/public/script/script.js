/* ==========================================================================
   SMOOTH TRANSITION LOGIC
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // 1. FADE IN: Thêm class để hiện trang từ từ
    // Dùng setTimeout nhỏ để đảm bảo CSS transition bắt được sự thay đổi
    setTimeout(() => {
        document.body.classList.add('page-loaded');
    }, 50);

    // 2. Gán sự kiện cho tất cả thẻ <a> nội bộ
    const links = document.querySelectorAll('a');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Chỉ áp dụng với link nội bộ, không phải # hoặc javascript:
            if (href && !href.startsWith('#') && !href.startsWith('javascript') && !this.getAttribute('target')) {
                e.preventDefault(); // Chặn chuyển trang ngay lập tức
                smoothNavigate(href); // Gọi hàm chuyển trang mượt
            }
        });
    });
});

// Hàm chuyển trang mượt (Fade Out -> Redirect)
function smoothNavigate(url) {
    // Xóa class để body mờ dần đi
    document.body.classList.remove('page-loaded');
    
    // Đợi 300ms (bằng thời gian transition trong CSS) rồi mới chuyển trang
    setTimeout(() => {
        window.location.href = url;
    }, 300);
}

// Xử lý nút Back của trình duyệt (để trang hiện lại nếu người dùng back về)
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        document.body.classList.add('page-loaded');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Kiểm tra URL xem có ?ref=... không
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode) {
        console.log("Referral detected:", refCode);
        // Lưu vào localStorage để dùng khi đăng ký
        localStorage.setItem('referral_code', refCode);
    }
});

/* ==========================================================================
    PART 1: UI UTILITY FUNCTIONS (UI UTILS) - (KEEP INTACT)
    ========================================================================== */
function navigateTo(url) {
    const token = localStorage.getItem('session_token');
    
    if (token) {
        // Logged in -> Use Smooth Navigate
        smoothNavigate(url);
    } else {
        showToast("You need to log in to access this feature!", "warning");
        setTimeout(() => {
            openLogin();
        }, 500);
    }
}

function checkAuthAndNavigate(url) {
    const token = localStorage.getItem('session_token');
    
    if (token) {
        // Logged in -> Use Smooth Navigate
        smoothNavigate(url);
    } else {
        showToast("Please log in to use this feature!", "warning");
        openLogin(); 
    }
}

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

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) { alert(message); return; }
    const config = {
        success: { icon: '<i class="fas fa-check-circle text-green-400"></i>', border: 'border-green-500/50' },
        error: { icon: '<i class="fas fa-times-circle text-red-400"></i>', border: 'border-red-500/50' },
        info: { icon: '<i class="fas fa-info-circle text-blue-400"></i>', border: 'border-blue-500/50' },
        warning: { icon: '<i class="fas fa-exclamation-triangle text-yellow-400"></i>', border: 'border-yellow-500/50' }
    };
    const style = config[type] || config.success;
    const toast = document.createElement('div');
    toast.className = `toast-enter pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border ${style.border} bg-[#202123] shadow-2xl min-w-[300px] z-[999999]`;
    toast.innerHTML = `<div class="text-xl">${style.icon}</div><p class="text-sm text-gray-200 font-medium">${message}</p>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.remove('toast-enter');
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

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
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
        localStorage.setItem('referral_code', refCode);
    }
});
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('confirmDeleteBtn');
    if (btn) {
        btn.onclick = () => { 
            if(deleteAction) deleteAction(); 
            closeConfirmModal(); 
        };
    }
    // --- CALL INITIALIZATION LOGIC DEPENDING ON PAGE ---
    const path = window.location.pathname;
    if (path.includes('bot.html') && document.getElementById('botListContainer')) loadBots();
    if (path.includes('data.html') && document.getElementById('knowledgeListBody')) { loadKnowledge(); loadBotsForDropdown(); }
    if (path.includes('chat.html')) initChatPage();
});

/* ==========================================================================
   PART 2: AUTHENTICATION - (KEEP INTACT)
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
   PART 3: BOT MANAGER (UPDATED: BOT SEARCH)
   ========================================================================== */
let allBotsData = []; // [NEW] Variable to store all bots for filtering

function toggleBotModal() { document.getElementById('botModal').classList.toggle('hidden'); }

async function handleCreateBot(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    btn.innerHTML = 'Creating...'; btn.disabled = true;
    try {
        const token = localStorage.getItem('session_token') || "";
        const res = await fetch('/api/bots/create', { 
            method: 'POST', 
            headers: { 'Authorization': token },
            body: new FormData(event.target) 
        });
        const data = await res.json();
        if (data.status === 'success') {
            showToast("Bot created successfully!", "success");
            toggleBotModal();
            event.target.reset();
            loadBots();
        } else { showToast(data.message, "error"); }
    } catch (e) { showToast("System error", "error"); }
    finally { btn.innerHTML = 'Create Bot'; btn.disabled = false; }
}

// [NEW] Function just to render UI
// [CẬP NHẬT] Hàm render danh sách Bot có thêm nút Embed
function renderBotList(bots) {
    const container = document.getElementById('botListContainer');
    const empty = document.getElementById('emptyBotState');
    if (!container) return;

    if (bots.length > 0) {
        empty.classList.add('hidden');
        container.innerHTML = bots.map(bot => `
            <div class="bg-gptInput border border-gray-600 rounded-xl p-6 hover:border-gray-500 transition shadow-lg relative group flex flex-col justify-between h-full">
                
                <button onclick="reqDeleteBot('${bot.id}')" class="absolute top-4 right-4 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-2 z-10">
                    <i class="fas fa-trash"></i>
                </button>

                <div class="flex items-center gap-3 mb-4">
                    <div class="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-400 shrink-0">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="overflow-hidden">
                        <h3 class="font-bold text-white truncate w-full" title="${bot.name}">${bot.name}</h3>
                        <p class="text-xs text-gray-500">${new Date(bot.created_at).toLocaleDateString()}</p>
                    </div>
                </div>

                <p class="text-gray-400 text-sm mb-6 line-clamp-2 h-10 overflow-hidden">
                    ${bot.description || 'No description provided.'}
                </p>

                <div class="flex gap-2 mt-auto">
                    <a href="/frontend/chat.html?botId=${bot.id}" class="flex-1 py-2.5 bg-gptBlue hover:bg-blue-600 rounded-lg text-sm text-white transition text-center font-medium">
                        <i class="fas fa-comment-alt mr-2"></i> Chat
                    </a>
                    <button onclick="showEmbedCode('${bot.id}')" class="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition" title="Get Embed Code">
                        <i class="fas fa-code"></i>
                    </button>
                </div>
            </div>`).join('');
    } else {
        container.innerHTML = '';
        empty.classList.remove('hidden');
    }
}

async function loadBots() {
    try {
        const token = localStorage.getItem('session_token') || "";
        const res = await fetch('/api/bots', { headers: { 'Authorization': token } });
        const data = await res.json();
        
        if (data.status === 'success') {
            allBotsData = data.data; // [NEW] Save data to global variable
            renderBotList(allBotsData); // Initial display
        }
    } catch (e) { console.error(e); }

    // [NEW] Handle search event immediately after load (if not assigned)
    const searchInput = document.getElementById('botSearchInput');
    if (searchInput) {
        searchInput.oninput = function(e) {
            const term = e.target.value.toLowerCase().trim();
            const filteredBots = allBotsData.filter(bot => 
                bot.name.toLowerCase().includes(term) || 
                (bot.description && bot.description.toLowerCase().includes(term))
            );
            renderBotList(filteredBots);
        }
    }
}

function reqDeleteBot(id) { openConfirmModal(() => deleteItem(`/api/bots/${id}`, loadBots)); }

/* ==========================================================================
   PART 4: KNOWLEDGE MANAGER (KEEP INTACT)
   ========================================================================== */
function toggleUploadModal() { document.getElementById('uploadModal').classList.toggle('hidden'); }
function showFileName(input) {
    if (input.files[0]) {
        document.getElementById('fileNameDisplay').textContent = input.files[0].name;
        document.getElementById('filePreview').classList.remove('hidden');
    }
}
async function loadBotsForDropdown() {
    const select = document.getElementById('botSelectDropdown');
    if (!select) return;
    try {
        const token = localStorage.getItem('session_token') || "";
        const res = await fetch('/api/bots', { headers: { 'Authorization': token } });
        const data = await res.json();
        select.innerHTML = '<option value="">-- General (All Bots) --</option>';
        if (data.status === 'success' && data.data) {
            data.data.forEach(bot => {
                const option = document.createElement("option");
                option.value = bot.id;
                option.textContent = bot.name;
                select.appendChild(option);
            });
        }
    } catch (e) { console.error("Error loading bot list:", e); }
}
async function handleUpload(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    btn.innerHTML = 'Uploading...'; btn.disabled = true;
    try {
        const token = localStorage.getItem('session_token') || "";
        const res = await fetch('/api/knowledge/upload', { 
            method: 'POST', 
            headers: { 'Authorization': token },
            body: new FormData(event.target) 
        });
        const data = await res.json();
        if (data.status === 'success') {
            showToast("Upload successful!", "success");
            toggleUploadModal();
            event.target.reset();
            document.getElementById('filePreview').classList.add('hidden');
            loadKnowledge();
        } else { showToast(data.message, "error"); }
    } catch (e) { showToast("Upload error", "error"); }
    finally { btn.innerHTML = 'Start Upload'; btn.disabled = false; }
}
async function loadKnowledge() {
    const tbody = document.getElementById('knowledgeListBody');
    const table = document.getElementById('knowledgeTable');
    const empty = document.getElementById('emptyDataState');
    if (!tbody) return;
    try {
        const token = localStorage.getItem('session_token') || "";
        const res = await fetch('/api/knowledge', { headers: { 'Authorization': token } });
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
function reqDeleteFile(id) { openConfirmModal(() => deleteItem(`/api/knowledge/${id}`, loadKnowledge)); }
async function deleteItem(url, reloadCallback) {
    try {
        const token = localStorage.getItem('session_token') || "";
        const res = await fetch(url, { method: 'DELETE', headers: { 'Authorization': token } });
        const data = await res.json();
        if (data.status === 'success') { 
            showToast("Deleted successfully!", "success"); 
            reloadCallback(); 
        } else { 
            showToast(data.message, "error"); 
        }
    } catch (e) { showToast("Error while deleting", "error"); }
}

/* ==========================================================================
   PART 5: CHAT FUNCTIONALITY (FULL UPDATE: HISTORY, MODEL DROPDOWN, TOOLBAR)
   ========================================================================== */

let currentModel = "gemini-2.5-flash"; // Global variable to store current model

// Function to get Bot name
// Function to get Bot name (Updated to support Group Bot)
async function fetchBotName(botId) {
    const badge = document.getElementById('botNameBadge');
    const nameText = document.getElementById('botNameText');
    if (!badge || !nameText) return;

    badge.classList.remove('hidden');
    nameText.innerText = "Loading...";

    try {
        const token = localStorage.getItem('session_token') || "";
        
        // [FIX] Call detailed bot API instead of fetching the whole list
        const res = await fetch(`/api/bots/${botId}`, { headers: { 'Authorization': token } });
        const data = await res.json();
        
        if (data.status === 'success' && data.data) {
            nameText.innerText = data.data.name;
        } else {
            nameText.innerText = "Unknown Bot";
        }
    } catch (e) {
        console.error("Error fetching bot name", e);
        nameText.innerText = "Bot Error";
    }
}

// Function to load chat history from Server
async function loadChatHistory(botId) {
    const welcomeState = document.getElementById('welcomeState');
    const chatWindow = document.getElementById('chatWindow');
    if(!chatWindow) return;

    // Clear old chat window immediately to prevent ghost messages
    chatWindow.innerHTML = "";

    try {
        const token = localStorage.getItem('session_token') || "";
        // Call History API created in backend
        const res = await fetch(`/api/chat/history?bot_id=${botId}`, {
            headers: { 'Authorization': token }
        });
        const data = await res.json();

        if (data.status === "success") {
            if (data.data.length > 0) {
                // Old messages exist => Hide welcome screen
                if(welcomeState) welcomeState.classList.add('hidden');
                
                // Display loop
                data.data.forEach(msg => {
                    // animate=false to load fast, no lag
                    displayChatBubble(msg.content, msg.role, false, false);
                });
                
                // Scroll to bottom
                const container = document.getElementById('chatContainer');
                if(container) container.scrollTop = container.scrollHeight;
            } else {
                // No messages => Show welcome screen
                if(welcomeState) welcomeState.classList.remove('hidden');
            }
        }
    } catch (err) {
        console.error("Error loading history:", err);
    }
}

function initChatPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const botId = urlParams.get('botId');
    const welcomeTitle = document.getElementById('welcomeTitle');
    const welcomeDesc = document.getElementById('welcomeDesc');
    
    // 1. CHECK BOT & LOAD DATA
    if (!botId) {
        welcomeTitle.innerText = "No Bot Selected!";
        welcomeDesc.innerText = "Please select a Bot from the list to start chatting.";
        showToast("⚠️ Please select a Bot to start!", "info");
    } else {
        welcomeTitle.innerText = "Ready to chat";
        welcomeDesc.innerText = "Your Bot is ready. Say something!";
        
        // Load name & history
        fetchBotName(botId);
        loadHistory(botId);
    }

    // 2. SETUP MODEL SELECT (Custom Dropdown)
    const modelBtn = document.getElementById('modelSelectBtn');
    const modelDropdown = document.getElementById('modelDropdown');
    const currentModelText = document.getElementById('currentModelText');
    
    // Lấy lại danh sách options vì HTML đã thay đổi
    const modelOptions = document.querySelectorAll('.model-option');

    if (modelBtn && modelDropdown) {
        modelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            modelDropdown.classList.toggle('hidden');
        });

        modelOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                currentModel = opt.getAttribute('data-value');
                // Update text, remove (Default) part if present
                currentModelText.textContent = opt.textContent.split('(')[0].trim();
                modelDropdown.classList.add('hidden');
                showToast(`Model selected: ${currentModel}`, "info");
            });
        });

        document.addEventListener('click', (e) => {
            if (!modelBtn.contains(e.target)) {
                modelDropdown.classList.add('hidden');
            }
        });
    }

    // 3. SETUP TOOLBAR BUTTONS
    const setupTool = (id, prefix, msg) => {
        const btn = document.getElementById(id);
        const inp = document.getElementById('chatInput');
        if(btn && inp) {
            btn.addEventListener('click', () => {
                if(!inp.value.includes(prefix)) {
                    inp.value = prefix + " " + inp.value;
                    inp.focus();
                    showToast(msg, "info");
                }
            });
        }
    };
    
    setupTool('btnWeb', '[WEB SEARCH]', 'Web search mode enabled');
    setupTool('btnImage', '[GENERATE IMAGE]', 'Image generation mode enabled');
    
    const btnIdea = document.getElementById('btnIdea');
    if(btnIdea) {
        btnIdea.addEventListener('click', () => {
            const ideas = ["Summarize this document...", "Write an email to a client...", "Explain Python code..."];
            const rand = ideas[Math.floor(Math.random() * ideas.length)];
            const inp = document.getElementById('chatInput');
            if(inp) { inp.value = rand; inp.focus(); }
        });
    }

    // 4. SEND MESSAGE
    const sendBtn = document.getElementById('sendBtn');
    const chatInput = document.getElementById('chatInput');
    const welcomeState = document.getElementById('welcomeState');

    const handleSend = async () => {
        const message = chatInput.value.trim();
        if (!message) return;

        if (!botId) {
            showToast("🚫 You haven't selected a Bot! Please go back to the Bot page to select one.", "error");
            return;
        }

        // UI: Show user message & Hide welcome
        displayChatBubble(message, 'user');
        chatInput.value = '';
        chatInput.style.height = 'auto'; 
        if(welcomeState) welcomeState.classList.add('hidden');

        // UI: Loading
        const loadingBubble = displayChatBubble('AI is thinking...', 'ai', true);

        try {
            const token = localStorage.getItem('session_token') || "";
            const res = await fetch('/api/chat/message', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': token 
                },
                body: JSON.stringify({ 
                    message: message, 
                    bot_id: botId,
                    model: currentModel // Send selected model
                })
            });
            const data = await res.json();

            if (data.status === 'success') {
                updateChatBubble(loadingBubble, data.response);
            } else {
                updateChatBubble(loadingBubble, "Error: " + data.message, true);
            }
        } catch (error) {
            updateChatBubble(loadingBubble, "Network connection error", true);
        }
    };

    if(sendBtn) sendBtn.onclick = handleSend;
    if(chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        });
        chatInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    }
}

// Function to display chat bubble
function displayChatBubble(text, sender, isLoading = false, animate = true) {
    const container = document.getElementById('chatWindow');
    const isUser = sender === 'user';
    const div = document.createElement('div');
    // Add class animate-fade-in if needed
    div.className = `flex w-full ${isUser ? 'justify-end' : 'justify-start'} ${animate ? 'animate-fade-in' : ''}`;
    
    div.innerHTML = `
        <div class="flex max-w-[85%] md:max-w-[75%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}">
            <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-gray-600' : 'bg-green-600'}">
                <i class="fas ${isUser ? 'fa-user' : 'fa-robot'} text-white text-xs"></i>
            </div>
            <div class="p-3.5 rounded-2xl shadow-sm text-sm leading-relaxed ${isUser ? 'bg-gptBlue text-white rounded-tr-none' : 'bg-gptInput text-gray-100 rounded-tl-none'}">
                <div class="message-content whitespace-pre-wrap">${text}</div>
                ${isLoading ? '<div class="loader-dots text-xs mt-1 opacity-70"></div>' : ''}
            </div>
        </div>
    `;
    container.appendChild(div);
    const scrollContainer = document.getElementById('chatContainer');
    if(scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
    return div;
}

// Function to update bubble content (used for loading)
function updateChatBubble(element, newText, isError = false) {
    const content = element.querySelector('.message-content');
    const loader = element.querySelector('.loader-dots');
    if (loader) loader.remove();
    content.innerText = newText;
    if(isError) content.classList.add('text-red-400');
    const scrollContainer = document.getElementById('chatContainer');
    if(scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
}

/* ==========================================================================
   PART 6: EMBED WIDGET LOGIC (NEW)
   ========================================================================== */

function showEmbedCode(botId) {
    const modal = document.getElementById('embedModal');
    const codeBlock = document.getElementById('embedCodeText');
    
    if (modal && codeBlock) {
        // Tự động lấy domain hiện tại (localhost hoặc web thật)
        const origin = window.location.origin; 
        
        // Tạo đoạn mã script nhúng
        const code = `<script src="${origin}/script/widget.js?bot_id=${botId}" defer><\/script>`;
        
        codeBlock.innerText = code;
        modal.classList.remove('hidden');
    } else {
        console.error("Embed Modal elements not found in HTML");
    }
}

function copyEmbedCode() {
    const codeBlock = document.getElementById('embedCodeText');
    if (codeBlock) {
        navigator.clipboard.writeText(codeBlock.innerText).then(() => {
            showToast("Code copied to clipboard!", "success");
        }).catch(() => {
            showToast("Failed to copy code", "error");
        });
    }
}