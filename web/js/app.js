const API_BASE = 'http://localhost:8000/api';
let currentToken = localStorage.getItem('token');
let currentPage = {};

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    if (currentToken) {
        verifyToken();
    } else {
        showLogin();
    }

    setupEventListeners();
});

// Обработчики событий
function setupEventListeners() {
    // Навигация
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            switchSection(section);
            
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    // Выход
    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });

    // Авторизация
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        login();
    });
}

// Логин
function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            currentToken = data.token;
            localStorage.setItem('token', currentToken);
            showAdminPanel();
            document.getElementById('admin-name').textContent = username;
            loadDashboard();
        } else {
            showError(document.getElementById('login-error'), data.error);
        }
    })
    .catch(err => showError(document.getElementById('login-error'), 'Ошибка подключения'));
}

// Проверка токена
function verifyToken() {
    fetch(`${API_BASE}/auth/verify`, {
        headers: { 'Authorization': `Bearer ${currentToken}` }
    })
    .then(res => res.json())
    .then(data => {
        if (data.valid) {
            showAdminPanel();
            loadDashboard();
        } else {
            logout();
        }
    })
    .catch(() => logout());
}

// Выход
function logout() {
    if (currentToken) {
        fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
    }
    localStorage.removeItem('token');
    currentToken = null;
    showLogin();
}

// Отображение окна входа
function showLogin() {
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('admin-panel').style.display = 'none';
}

// Отображение админ панели
function showAdminPanel() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
}

// Переключение разделов
function switchSection(section) {
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    document.getElementById(section).classList.add('active');

    if (section === 'dashboard') {
        loadDashboard();
    } else if (section === 'banned-users') {
        loadBannedUsers(1);
    } else if (section === 'kicked-users') {
        loadKickedUsers(1);
    } else if (section === 'chat') {
        loadChatMessages(1);
    } else if (section === 'logs') {
        loadLogs(1);
    }
}

// Загрузка главной страницы
function loadDashboard() {
    Promise.all([
        fetchAPI('/banned-users?limit=1'),
        fetchAPI('/kicked-users?limit=1'),
        fetchAPI('/chat?limit=1'),
        fetchAPI('/logs?limit=1')
    ])
    .then(([banned, kicked, chat, logs]) => {
        document.getElementById('stat-banned').textContent = banned.pagination.total;
        document.getElementById('stat-kicked').textContent = kicked.pagination.total;
        document.getElementById('stat-messages').textContent = chat.pagination.total;
        document.getElementById('stat-logs').textContent = logs.pagination.total;
    });
}

// Загрузка забаненных пользователей
function loadBannedUsers(page = 1) {
    fetchAPI(`/banned-users?page=${page}&limit=20`)
    .then(data => {
        const tbody = document.getElementById('banned-users-table');
        tbody.innerHTML = '';

        if (data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Нет забаненных пользователей</td></tr>';
        } else {
            data.data.forEach(user => {
                const row = `
                    <tr>
                        <td>${user.id}</td>
                        <td>${user.username}</td>
                        <td>${user.email}</td>
                        <td>${user.ban_reason}</td>
                        <td>${formatDate(user.ban_date)}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-sm btn-success" onclick="unbanUser(${user.id}, '${user.username}')">
                                    <i class="fas fa-check"></i> Разбан
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
                tbody.innerHTML += row;
            });
        }

        createPagination('banned-pagination', data.pagination, 'loadBannedUsers');
    });
}

// Загрузка кикнутых пользователей
function loadKickedUsers(page = 1) {
    fetchAPI(`/kicked-users?page=${page}&limit=20`)
    .then(data => {
        const tbody = document.getElementById('kicked-users-table');
        tbody.innerHTML = '';

        if (data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Нет кикнутых ��ользователей</td></tr>';
        } else {
            data.data.forEach(user => {
                const row = `
                    <tr>
                        <td>${user.id}</td>
                        <td>${user.username}</td>
                        <td>${user.email}</td>
                        <td>${user.kick_reason}</td>
                        <td>${formatDate(user.kick_date)}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-sm btn-success" onclick="unkickUser(${user.id}, '${user.username}')">
                                    <i class="fas fa-check"></i> Вернуть
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
                tbody.innerHTML += row;
            });
        }

        createPagination('kicked-pagination', data.pagination, 'loadKickedUsers');
    });
}

// Загрузка сообщений чата
function loadChatMessages(page = 1) {
    fetchAPI(`/chat?page=${page}&limit=50`)
    .then(data => {
        const container = document.getElementById('chat-messages');
        container.innerHTML = '';

        if (data.data.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">Нет сообщений</p>';
        } else {
            data.data.forEach(msg => {
                const msgDiv = `
                    <div class="chat-message">
                        <div>
                            <span class="chat-username">${msg.username}</span>
                            <span class="chat-time">${formatDate(msg.created_at)}</span>
                            <button class="btn btn-sm btn-outline-danger float-end" onclick="deleteMessage(${msg.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        <div style="margin-top: 5px;">${escapeHtml(msg.message)}</div>
                        <div style="font-size: 11px; color: #94a3b8; margin-top: 5px;">IP: ${msg.ip_address}</div>
                    </div>
                `;
                container.innerHTML += msgDiv;
            });
        }

        createPagination('chat-pagination', data.pagination, 'loadChatMessages');
    });
}

// Загрузка логов
function loadLogs(page = 1) {
    const severity = document.getElementById('logs-severity')?.value || '';
    const date = document.getElementById('logs-date')?.value || '';
    let query = `/logs?page=${page}&limit=100`;
    
    if (severity) query += `&severity=${severity}`;
    if (date) query += `&start_date=${date}`;

    fetchAPI(query)
    .then(data => {
        const tbody = document.getElementById('logs-table');
        tbody.innerHTML = '';

        if (data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Нет записей в логах</td></tr>';
        } else {
            data.data.forEach(log => {
                const severityColor = {
                    'info': '#3b82f6',
                    'warning': '#f59e0b',
                    'error': '#ef4444',
                    'critical': '#dc2626'
                }[log.severity] || '#6b7280';

                const row = `
                    <tr>
                        <td>${log.id}</td>
                        <td>${log.action}</td>
                        <td>${log.description}</td>
                        <td><span style="color: ${severityColor}; font-weight: bold;">${log.severity.toUpperCase()}</span></td>
                        <td>${log.ip_address}</td>
                        <td>${formatDate(log.created_at)}</td>
                    </tr>
                `;
                tbody.innerHTML += row;
            });
        }

        createPagination('logs-pagination', data.pagination, 'loadLogs');
    });
}

// Разбан пользователя
function unbanUser(userId, username) {
    if (confirm(`Разбанить пользователя ${username}?`)) {
        fetchAPI(`/banned-users/${userId}`, 'PUT')
        .then(data => {
            if (data.success) {
                alert('Пользователь разбанен');
                loadBannedUsers(1);
            }
        });
    }
}

// Вернуть кикнутого пользователя
function unkickUser(userId, username) {
    if (confirm(`Вернуть пользователя ${username}?`)) {
        fetchAPI(`/kicked-users/${userId}`, 'PUT')
        .then(data => {
            if (data.success) {
                alert('Пользователь восстановлен');
                loadKickedUsers(1);
            }
        });
    }
}

// Удалить сообщение из чата
function deleteMessage(messageId) {
    if (confirm('Удалить это сообщение?')) {
        fetchAPI(`/chat/${messageId}`, 'DELETE')
        .then(data => {
            if (data.success) {
                loadChatMessages(1);
            }
        });
    }
}

// API запрос
function fetchAPI(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentToken}`
        }
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    return fetch(`${API_BASE}${endpoint}`, options)
        .then(res => res.json())
        .catch(err => ({ error: 'Ошибка подключения' }));
}

// Создание пагинации
function createPagination(elementId, pagination, funcName) {
    const nav = document.getElementById(elementId);
    nav.innerHTML = '';

    if (pagination.pages <= 1) return;

    const ul = document.createElement('ul');
    ul.className = 'pagination';

    for (let i = 1; i <= pagination.pages; i++) {
        const li = document.createElement('li');
        li.className = 'page-item' + (i === pagination.page ? ' active' : '');
        li.innerHTML = `<a class="page-link" href="#" onclick="event.preventDefault(); ${funcName}(${i})">${i}</a>`;
        ul.appendChild(li);
    }

    nav.appendChild(ul);
}

// Форматирование даты
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU');
}

// Экранирование HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Отображение ошибки
function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}