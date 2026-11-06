const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'samm-nectoj-secret-key-2024';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Tạo thư mục uploads nếu chưa có
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// Cấu hình Multer để lưu file
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// Cơ sở dữ liệu giả lập (lưu trong bộ nhớ)
const users = []; // { id, username, password, fullName }
const fileHistory = []; // { id, userId, filename, originalName, size, date }
const orders = []; // { id, userId, product, price, status, date }

// Middleware xác thực token
const authMiddleware = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Chưa đăng nhập' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch {
        res.status(401).json({ error: 'Token không hợp lệ' });
    }
};

// ===== API AUTH =====
app.post('/api/register', async (req, res) => {
    const { username, password, fullName } = req.body;
    if (!username || !password || !fullName)
        return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin' });
    if (users.find(u => u.username === username))
        return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
    
    const hashed = await bcrypt.hash(password, 10);
    const user = { id: Date.now(), username, password: hashed, fullName };
    users.push(user);
    res.json({ message: 'Đăng ký thành công' });
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    if (!user) return res.status(400).json({ error: 'Tài khoản không tồn tại' });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Mật khẩu sai' });
    
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ 
        token, 
        user: { id: user.id, username: user.username, fullName: user.fullName } 
    });
});

// ===== API FILE =====
app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Không có file' });
    const record = {
        id: Date.now(),
        userId: req.userId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        date: new Date().toISOString()
    };
    fileHistory.push(record);
    res.json({ message: 'Tải file thành công', file: record });
});

app.get('/api/history', authMiddleware, (req, res) => {
    const userFiles = fileHistory.filter(f => f.userId === req.userId);
    res.json(userFiles);
});

app.get('/api/download/:filename', authMiddleware, (req, res) => {
    const file = fileHistory.find(f => f.filename === req.params.filename && f.userId === req.userId);
    if (!file) return res.status(404).json({ error: 'Không tìm thấy file' });
    res.download(path.join(__dirname, 'uploads', file.filename), file.originalName);
});

// ===== API PROFILE =====
app.get('/api/profile', authMiddleware, (req, res) => {
    const user = users.find(u => u.id === req.userId);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy user' });
    res.json({ id: user.id, username: user.username, fullName: user.fullName });
});

app.post('/api/change-password', authMiddleware, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const user = users.find(u => u.id === req.userId);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy user' });
    
    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) return res.status(400).json({ error: 'Mật khẩu cũ sai' });
    
    user.password = await bcrypt.hash(newPassword, 10);
    res.json({ message: 'Đổi mật khẩu thành công' });
});

// ===== API ORDERS =====
app.get('/api/orders', authMiddleware, (req, res) => {
    const userOrders = orders.filter(o => o.userId === req.userId);
    res.json(userOrders);
});

// Tạo đơn hàng mẫu khi đăng ký (demo)
app.post('/api/orders/demo', authMiddleware, (req, res) => {
    const demo = {
        id: Date.now(),
        userId: req.userId,
        product: 'Gói Premium SAMM NECTOJ🧩',
        price: 99000,
        status: 'Đã thanh toán',
        date: new Date().toISOString()
    };
    orders.push(demo);
    res.json(demo);
});

app.listen(PORT, () => {
    console.log(`🚀 SAMM NECTOJ🧩 server chạy tại http://localhost:${PORT}`);
});
