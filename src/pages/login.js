/**
 * 登录/选择用户页
 */
import { router } from '../router.js';
import { store } from '../store.js';
import { userManager } from '../userManager.js';

export function renderLogin(app) {
  const users = userManager.getUsers();

  const avatarEmojis = ['🦊', '🐱', '🐶', '🐼', '🐨', '🦁', '🐸', '🐵', '🐰', '🐻', '🦄', '🐯', '🐷', '🐮', '🐲'];

  function getAvatar(index) {
    return avatarEmojis[index % avatarEmojis.length];
  }

  app.innerHTML = `
    <div class="bg-decoration">
      <div class="bg-blob bg-blob-1"></div>
      <div class="bg-blob bg-blob-2"></div>
      <div class="bg-blob bg-blob-3"></div>
    </div>
    <div class="page page-center" style="min-height:100vh; position:relative; z-index:1;">
      <div style="text-align:center; max-width:720px; width:100%;">
        <div style="font-size:4rem; margin-bottom:12px; animation: float 3s ease-in-out infinite;">🧠</div>
        <h1 style="
          font-family: var(--font-display);
          font-size: 2.4rem;
          font-weight: 900;
          background: var(--bg-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 8px;
        ">智趣认知乐园</h1>
        <p style="color: var(--text-secondary); margin-bottom: 36px; font-size: 1rem;">选择你的账号，开始认知探险之旅！</p>

        ${users.length > 0 ? `
          <div class="user-grid" id="user-list">
            ${users.map((u, i) => `
              <div class="user-avatar-card" data-user-id="${u.id}" style="animation: bounceIn 0.5s ease forwards; animation-delay: ${0.1 + i * 0.1}s; opacity:0;">
                <div class="user-avatar-emoji">${getAvatar(i)}</div>
                <div class="user-avatar-name">${u.name}</div>
                <div class="user-avatar-meta">${u.ageGroup || store.getAgeGroup(u.age)} · ${u.gender === '男' ? '👦' : '👧'}</div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div style="
            padding: 48px 24px;
            background: var(--bg-card);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-sm);
            margin-bottom: 24px;
            animation: fadeSlideIn 0.5s ease;
          ">
            <div style="font-size: 3rem; margin-bottom: 12px;">👋</div>
            <p style="color: var(--text-secondary); font-size: 1.05rem;">还没有用户，创建一个开始吧！</p>
          </div>
        `}

        <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap; margin-top:28px;">
          <button id="btn-create" class="btn btn-primary btn-large" style="animation: bounceIn 0.6s ease forwards; animation-delay: ${0.2 + users.length * 0.1}s; opacity:0;">
            ✨ 创建新用户
          </button>
        </div>

        <div style="margin-top:36px; animation: fadeIn 1s ease forwards; animation-delay: 0.8s; opacity:0;">
          <button id="btn-admin" class="btn-text" style="
            background: none;
            border: none;
            color: var(--text-light);
            font-size: 0.85rem;
            cursor: pointer;
            padding: 8px 16px;
            font-family: var(--font-main);
            transition: color var(--transition-fast);
          ">
            🔒 管理员入口
          </button>
        </div>
      </div>
    </div>

    <!-- 管理员密码弹窗 -->
    <div id="admin-modal" class="modal-overlay" style="display:none;">
      <div class="modal-content" style="max-width:380px;">
        <div style="text-align:center;">
          <div style="font-size:2.5rem; margin-bottom:12px;">🔐</div>
          <h3 style="font-weight:800; margin-bottom:16px; color:var(--text-primary);">管理员验证</h3>
          <div class="form-group" style="margin-bottom:16px;">
            <input type="password" id="admin-password" class="form-input" placeholder="请输入管理员密码" style="text-align:center;" />
          </div>
          <div id="admin-error" class="form-error" style="display:none; margin-bottom:12px;"></div>
          <div style="display:flex; gap:12px;">
            <button id="btn-admin-cancel" class="btn btn-secondary" style="flex:1;">取消</button>
            <button id="btn-admin-confirm" class="btn btn-primary" style="flex:1;">确认</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // 用户卡片点击 → 登录
  document.querySelectorAll('.user-avatar-card').forEach(card => {
    card.addEventListener('click', () => {
      const userId = card.dataset.userId;
      store.switchUser(userId);
      router.navigate('/test-select');
    });
  });

  // 创建新用户
  document.getElementById('btn-create').addEventListener('click', () => {
    router.navigate('/user-info');
  });

  // 管理员入口
  const adminModal = document.getElementById('admin-modal');
  document.getElementById('btn-admin').addEventListener('click', () => {
    adminModal.style.display = 'flex';
    document.getElementById('admin-password').focus();
  });

  document.getElementById('btn-admin-cancel').addEventListener('click', () => {
    adminModal.style.display = 'none';
    document.getElementById('admin-password').value = '';
    document.getElementById('admin-error').style.display = 'none';
  });

  document.getElementById('btn-admin-confirm').addEventListener('click', () => {
    const pwd = document.getElementById('admin-password').value;
    if (userManager.verifyAdmin(pwd)) {
      userManager.setAdmin(true);
      router.navigate('/admin');
    } else {
      const errEl = document.getElementById('admin-error');
      errEl.textContent = '❌ 密码错误，请重试';
      errEl.style.display = 'block';
    }
  });

  // 回车提交密码
  document.getElementById('admin-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('btn-admin-confirm').click();
    }
  });

  // 点击遮罩关闭弹窗
  adminModal.addEventListener('click', (e) => {
    if (e.target === adminModal) {
      document.getElementById('btn-admin-cancel').click();
    }
  });
}
