/**
 * 管理员页面 - 查看/管理所有用户
 */
import { router } from '../router.js';
import { store } from '../store.js';
import { userManager } from '../userManager.js';

export function renderAdmin(app) {
    const users = userManager.getUsers();

    const avatarEmojis = ['🦊', '🐱', '🐶', '🐼', '🐨', '🦁', '🐸', '🐵', '🐰', '🐻', '🦄', '🐯', '🐷', '🐮', '🐲'];
    function getAvatar(index) {
        return avatarEmojis[index % avatarEmojis.length];
    }

    function formatDate(ts) {
        if (!ts) return '-';
        const d = new Date(ts);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }

    function getProgressText(data) {
        if (!data || !data.testProgress) return '未开始';
        const count = Object.values(data.testProgress).filter(p => p.completed).length;
        if (count === 0) return '未开始';
        if (count === 4) return '✅ 已完成';
        return `进行中 (${count}/4)`;
    }

    function getTotalScore(data) {
        if (!data || !data.testResults) return '-';
        const dims = ['planning', 'attention', 'simultaneous', 'successive'];
        const scores = dims.map(d => data.testResults[d]?.totalScore || 0);
        const total = scores.reduce((a, b) => a + b, 0);
        return total > 0 ? total : '-';
    }

    // 准备用户数据详情
    const usersWithData = users.map((u, i) => {
        const data = userManager.getUserData(u.id);
        return {
            ...u,
            avatar: getAvatar(i),
            data,
            progress: getProgressText(data),
            totalScore: getTotalScore(data)
        };
    });

    app.innerHTML = `
    <div class="navbar">
      <a class="navbar-brand" href="#/login">
        <span class="navbar-brand-icon">🧠</span>
        <span>智趣认知乐园</span>
      </a>
      <div class="navbar-actions">
        <span style="font-size:0.9rem; color:var(--text-secondary); margin-right:8px;">
          🔒 管理员模式
        </span>
        <button id="btn-exit-admin" class="btn btn-secondary" style="padding:8px 20px; font-size:0.85rem;">
          退出管理
        </button>
      </div>
    </div>

    <div class="page has-navbar" style="position:relative;">
      <div class="container" style="max-width:1000px;">
        <div style="text-align:center; margin-bottom:28px;">
          <h1 style="
            font-family: var(--font-display);
            font-size: 1.8rem;
            font-weight: 900;
            color: var(--text-primary);
            margin-bottom:8px;
          ">用户管理</h1>
          <p style="color: var(--text-secondary);">共 ${users.length} 位用户</p>
        </div>

        ${users.length === 0 ? `
          <div style="text-align:center; padding:60px 20px; background:var(--bg-card); border-radius:var(--radius-lg); box-shadow:var(--shadow-sm);">
            <div style="font-size:3rem; margin-bottom:12px;">📭</div>
            <p style="color:var(--text-secondary);">暂无用户数据</p>
          </div>
        ` : `
          <div class="admin-table-wrapper">
            <table class="admin-table">
              <thead>
                <tr>
                  <th style="width:50px;"></th>
                  <th>姓名</th>
                  <th>年龄</th>
                  <th>性别</th>
                  <th>分组</th>
                  <th>测评进度</th>
                  <th>总分</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                ${usersWithData.map((u, idx) => `
                  <tr style="animation: fadeSlideIn 0.4s ease forwards; animation-delay: ${idx * 0.05}s; opacity:0;">
                    <td><span style="font-size:1.5rem;">${u.avatar}</span></td>
                    <td><strong>${u.name}</strong></td>
                    <td>${u.age}岁</td>
                    <td>${u.gender === '男' ? '👦 男' : '👧 女'}</td>
                    <td><span class="admin-badge">${u.ageGroup || store.getAgeGroup(u.age)}</span></td>
                    <td>${u.progress}</td>
                    <td style="font-weight:700; color:var(--primary);">${u.totalScore}</td>
                    <td style="font-size:0.8rem; color:var(--text-light);">${formatDate(u.createdAt)}</td>
                    <td>
                      <div style="display:flex; gap:6px;">
                        <button class="btn-mini btn-mini-view" data-view-id="${u.id}" title="查看详情">📊</button>
                        <button class="btn-mini btn-mini-delete" data-delete-id="${u.id}" data-delete-name="${u.name}" title="删除用户">🗑️</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    </div>

    <!-- 用户详情弹窗 -->
    <div id="detail-modal" class="modal-overlay" style="display:none;">
      <div class="modal-content" style="max-width:560px;" id="detail-body"></div>
    </div>

    <!-- 删除确认弹窗 -->
    <div id="delete-modal" class="modal-overlay" style="display:none;">
      <div class="modal-content" style="max-width:380px; text-align:center;">
        <div style="font-size:2.5rem; margin-bottom:12px;">⚠️</div>
        <h3 style="font-weight:800; margin-bottom:8px; color:var(--text-primary);">确认删除</h3>
        <p style="color:var(--text-secondary); margin-bottom:20px;">
          确定要删除用户 <strong id="delete-name"></strong> 的所有数据吗？<br/>此操作不可恢复！
        </p>
        <div style="display:flex; gap:12px;">
          <button id="btn-delete-cancel" class="btn btn-secondary" style="flex:1;">取消</button>
          <button id="btn-delete-confirm" class="btn btn-danger" style="flex:1;">删除</button>
        </div>
      </div>
    </div>
  `;

    // 退出管理员
    document.getElementById('btn-exit-admin').addEventListener('click', () => {
        router.navigate('/login');
    });

    // 查看详情
    let currentDetailUserId = null;
    document.querySelectorAll('.btn-mini-view').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const userId = btn.dataset.viewId;
            currentDetailUserId = userId;
            showDetail(userId);
        });
    });

    function showDetail(userId) {
        const user = users.find(u => u.id === userId);
        const data = userManager.getUserData(userId);
        const detailBody = document.getElementById('detail-body');

        if (!user) return;

        const dims = [
            { key: 'planning', name: '计划能力', icon: '🎯', color: '#6C5CE7' },
            { key: 'attention', name: '注意过程', icon: '👁️', color: '#E17055' },
            { key: 'simultaneous', name: '同时性加工', icon: '🧩', color: '#00CEC9' },
            { key: 'successive', name: '继时性加工', icon: '🔗', color: '#FD79A8' }
        ];

        detailBody.innerHTML = `
      <div style="text-align:center; margin-bottom:20px;">
        <div style="font-size:2.5rem; margin-bottom:8px;">${getAvatar(users.indexOf(user))}</div>
        <h3 style="font-weight:800; color:var(--text-primary);">${user.name}</h3>
        <p style="color:var(--text-secondary); font-size:0.9rem;">${user.age}岁 · ${user.gender} · ${user.ageGroup || store.getAgeGroup(user.age)}</p>
      </div>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
        ${dims.map(dim => {
            const prog = data?.testProgress?.[dim.key];
            const result = data?.testResults?.[dim.key];
            const completedSubs = prog ? prog.subTests.filter(Boolean).length : 0;
            const score = result ? result.totalScore : 0;
            return `
            <div style="
              background: ${dim.color}10;
              border: 2px solid ${dim.color}30;
              border-radius: var(--radius-md);
              padding: 16px;
              text-align: center;
            ">
              <div style="font-size:1.5rem; margin-bottom:4px;">${dim.icon}</div>
              <div style="font-weight:700; font-size:0.9rem; color:${dim.color}; margin-bottom:4px;">${dim.name}</div>
              <div style="font-size:1.4rem; font-weight:800; color:var(--text-primary);">${score}</div>
              <div style="font-size:0.75rem; color:var(--text-light);">子测试 ${completedSubs}/3</div>
            </div>
          `;
        }).join('')}
      </div>
      <div style="text-align:center; margin-top:20px;">
        <button id="btn-detail-close" class="btn btn-secondary" style="min-width:120px;">关闭</button>
      </div>
    `;

        document.getElementById('detail-modal').style.display = 'flex';
        document.getElementById('btn-detail-close').addEventListener('click', () => {
            document.getElementById('detail-modal').style.display = 'none';
        });
    }

    // 删除用户
    let deleteUserId = null;
    const deleteModal = document.getElementById('delete-modal');

    document.querySelectorAll('.btn-mini-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteUserId = btn.dataset.deleteId;
            document.getElementById('delete-name').textContent = btn.dataset.deleteName;
            deleteModal.style.display = 'flex';
        });
    });

    document.getElementById('btn-delete-cancel').addEventListener('click', () => {
        deleteModal.style.display = 'none';
        deleteUserId = null;
    });

    document.getElementById('btn-delete-confirm').addEventListener('click', () => {
        if (deleteUserId) {
            userManager.deleteUser(deleteUserId);
            deleteModal.style.display = 'none';
            // 重新渲染页面
            renderAdmin(app);
        }
    });

    // 点击遮罩关闭弹窗
    document.getElementById('detail-modal').addEventListener('click', (e) => {
        if (e.target.id === 'detail-modal') {
            e.target.style.display = 'none';
        }
    });

    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) {
            deleteModal.style.display = 'none';
            deleteUserId = null;
        }
    });
}
