const API = ''; // cùng origin
let currentUser = null;
let token = null;

// ===== KHỞI TẠO =====
window.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('sammToken');
    if (saved) {
        token = saved;
        loadProfile();
    }
});

// ===== CHUYỂN TAB AUTH =====
function switchTab(type) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('loginForm').style.display = type === 'login' ? 'block' : 'none';
    document.getElementById('registerForm').style.display = type === 'register' ? 'block' : 'none';
}

// ===== ĐĂNG KÝ =====
async function handleRegister(e) {
    e.preventDefault();
    const fullName = document.getElementById('regFullName').value;
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;

    try {
        const res = await fetch(API + '/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, username, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        showToast('✅ Đăng ký thành công! Hãy đăng nhập', 'success');
        switchTab('login');
        document.getElementById('loginUsername').value = username;
    } catch (err) {
        showToast('❌ ' + err.message, 'error');
    }
}

// ===== ĐĂNG NHẬP =====
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const res = await fetch(API + '/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        token = data.token;
        currentUser = data.user;
        localStorage.setItem('sammToken', token);

        document.getElementById('authScreen').style.display = 'none';
        document.getElementById('mainScreen').style.display = 'block';
        document.getElementById('welcomeName').textContent = currentUser.fullName;
        document.getElementById('profileUsername').textContent = currentUser.username;
        document.getElementById('profileFullName').textContent = currentUser.fullName;

        // Thông báo chào mừng
        showToast(`🎉 CHÀO BẠN LẾN VỚI SAMM NECTOJ🧩\nMONG MỌI NGƯỜI ${currentUser.fullName}`, 'success', 5000);

        loadHistory();
        loadOrders();
    } catch (err) {
        showToast('❌ ' + err.message, 'error');
    }
}

// ===== LOAD PROFILE TỪ TOKEN =====
async function loadProfile() {
    try {
        const res = await fetch(API + '/api/profile', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) throw new Error('Token hết hạn');
        const user = await res.json();
        currentUser = user;
        document.getElementById('authScreen').style.display = 'none';
        document.getElementById('mainScreen').style.display = 'block';
        document.getElementById('welcomeName').textContent = user.fullName;
        document.getElementById('profileUsername').textContent = user.username;
        document.getElementById('profileFullName').textContent = user.fullName;
        loadHistory();
        loadOrders();
    } catch {
        localStorage.removeItem('sammToken');
        location.reload();
    }
}

// ===== ĐĂNG XUẤT =====
function logout() {
    localStorage.removeItem('sammToken');
    location.reload();
}

// ===== ĐIỀU HƯỚNG =====
function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(page).classList.add('active');
    event.target.classList.add('active');

    if (page === 'history') loadHistory();
    if (page === 'orders') loadOrders();
}

// ===== TẢI FILE =====
async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    document.getElementById('uploadResult').innerHTML = '<p style="color:white">⏳ Đang tải lên...</p>';

    try {
        const res = await fetch(API + '/api/upload', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        document.getElementById('uploadResult').innerHTML =
            `<div class="list-item"><div class="info"><strong>✅ ${data.file.originalName}</strong>
            <small>${(data.file.size / 1024).toFixed(1)} KB - ${new Date(data.file.date).toLocaleString('vi')}</small></div></div>`;

        showToast('✅ Tải file thành công!', 'success');
        loadHistory();
        e.target.value = '';
    } catch (err) {
        document.getElementById('uploadResult').innerHTML = '';
        showToast('❌ ' + err.message, 'error');
    }
}

// ===== LỊCH SỬ TẢI =====
async function loadHistory() {
    try {
        const res = await fetch(API + '/api/history', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const files = await res.json();
        document.getElementById('statFiles').textContent = files.length;

        const list = document.getElementById('historyList');
        if (files.length === 0) {
            list.innerHTML = '<div class="empty">📭 Chưa có file nào được tải lên</div>';
            return;
        }
        list.innerHTML = files.slice().reverse().map(f => `
            <div class="list-item">
                <div class="info">
                    <strong>📄 ${f.originalName}</strong>
                    <small>${(f.size / 1024).toFixed(1)} KB • ${new Date(f.date).toLocaleString('vi')}</small>
                </div>
                <button onclick="downloadFile('${f.filename}')">⬇️ Tải xuống</button>
            </div>
        `).join('');
    } catch (err) {
        showToast('Lỗi tải lịch sử: ' + err.message, 'error');
    }
}

async function downloadFile(filename) {
    try {
        const res = await fetch(API + '/api/download/' + filename, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) throw new Error('Không tải được file');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    } catch (err) {
        showToast('❌ ' + err.message, 'error');
    }
}

// ===== ĐƠN HÀNG =====
async function loadOrders() {
    try {
        const res = await fetch(API + '/api/orders', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const orders = await res.json();
        document.getElementById('statOrders').textContent = orders.length;

        const list = document.getElementById('ordersList');
        if (orders.length === 0) {
            list.innerHTML = '<div class="empty">📦 Chưa có đơn hàng nào</div>';
            return;
        }
        list.innerHTML = orders.slice().reverse().map(o => `
            <div class="list-item">
                <div class="info">
                    <strong>📦 ${o.product}</strong>
                    <small>${o.price.toLocaleString('vi')}đ • ${new Date(o.date).toLocaleString('vi')}</small>
                </div>
                <span class="badge">${o.status}</span>
            </div>
        `).join('');
    } catch (err) {
        showToast('Lỗi tải đơn hàng: ' + err.message, 'error');
    }
}

async function createDemoOrder() {
    try {
        const res = await fetch(API + '/api/orders/demo', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) throw new Error('Lỗi tạo đơn');
        showToast('✅ Đã tạo đơn hàng demo', 'success');
        loadOrders();
    } catch (err) {
        showToast('❌ ' + err.message, 'error');
    }
}

// ===== ĐỔI MẬT KHẨU =====
async function handleChangePassword(e) {
    e.preventDefault();
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;

    try {
        const res = await fetch(API + '/api/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ oldPassword, newPassword })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        showToast('✅ Đổi mật khẩu thành công!', 'success');
        e.target.reset();
    } catch (err) {
        showToast('❌ ' + err.message, 'error');
    }
}

// ===== TOAST THÔNG BÁO =====
function showToast(msg, type = 'info', duration = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = 'toast show ' + type;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
}
