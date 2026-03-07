import { router } from '../router.js';
import { store } from '../store.js';
import { userManager } from '../userManager.js';
import { exportUsersToExcel } from '../utils/dataExport.js';
import { generateClassReportPDF } from '../utils/pdfGenerator.js';
import { DIMENSIONS } from '../domain/dimensions.ts';

function formatDate(ts) {
  if (!ts) return '-';
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(
    d.getHours(),
  ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getProgressText(data) {
  if (!data || !data.testProgress) return '未开始';
  const count = Object.values(data.testProgress).filter(item => item?.completed).length;
  if (count === 0) return '未开始';
  if (count === DIMENSIONS.length) return '✓ 已完成';
  return `进行中 (${count}/${DIMENSIONS.length})`;
}

function getTotalScore(data) {
  if (!data || !data.testResults) return '-';
  const total = DIMENSIONS.reduce((sum, item) => sum + Number(data.testResults?.[item.key]?.totalScore || 0), 0);
  return total > 0 ? total.toFixed(1) : '-';
}

/** 创建并显示自定义信息弹窗 */
function showModal(title, content, onConfirm = null) {
  // 移除旧弹窗
  const old = document.getElementById('admin-modal-overlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'admin-modal-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;
    display:flex;align-items:center;justify-content:center;
    backdrop-filter:blur(4px);
  `;

  const confirmBtns = onConfirm
    ? `<button id="admin-modal-cancel" style="flex:1;padding:10px;border:1px solid #ccc;background:transparent;border-radius:8px;cursor:pointer;font-size:0.9rem;">取消</button>
       <button id="admin-modal-confirm" style="flex:1;padding:10px;border:none;background:#ef4444;color:#fff;border-radius:8px;cursor:pointer;font-size:0.9rem;font-weight:700;">确认删除</button>`
    : `<button id="admin-modal-close" style="flex:1;padding:10px;border:none;background:var(--primary,#6c47ff);color:#fff;border-radius:8px;cursor:pointer;font-size:0.9rem;font-weight:700;">关闭</button>`;

  overlay.innerHTML = `
    <div style="background:#1e1e2e;border-radius:16px;padding:28px 24px;max-width:520px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
      <h3 style="margin:0 0 16px;font-size:1.15rem;color:var(--text-primary,#fff);">${title}</h3>
      <div style="color:var(--text-secondary,#aaa);font-size:0.88rem;line-height:1.8;white-space:pre-wrap;word-break:break-all;">${content}</div>
      <div style="display:flex;gap:12px;margin-top:20px;">
        ${confirmBtns}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // 绑定按钮事件
  if (onConfirm) {
    document.getElementById('admin-modal-cancel').onclick = () => overlay.remove();
    document.getElementById('admin-modal-confirm').onclick = () => {
      overlay.remove();
      onConfirm();
    };
  } else {
    document.getElementById('admin-modal-close').onclick = () => overlay.remove();
  }

  // 点击遮罩关闭
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.remove();
  });
}

export function renderAdmin(app) {
  const users = userManager.getUsers();
  const usersWithData = users.map(user => {
    const data = userManager.getUserData(user.id);
    return {
      ...user,
      data,
      progress: getProgressText(data),
      totalScore: getTotalScore(data),
    };
  });

  app.innerHTML = `
    <div class="navbar">
      <a class="navbar-brand" href="#/login"><span class="navbar-brand-icon">🧠</span><span>智趣认知乐园</span></a>
      <div class="navbar-actions" style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:0.9rem; color:var(--text-secondary); margin-right:8px;">管理员模式</span>
        <button id="btn-question-bank" class="btn btn-secondary" style="padding:6px 14px; font-size:0.8rem;">📚 题库总览</button>
        <button id="btn-question-admin" class="btn btn-secondary" style="padding:6px 14px; font-size:0.8rem;">题库管理</button>
        <button id="btn-analytics" class="btn btn-secondary" style="padding:6px 14px; font-size:0.8rem;">数据分析</button>
        <button id="btn-export-excel" class="btn btn-secondary" style="padding:6px 14px; font-size:0.8rem;">导出Excel</button>
        <button id="btn-export-pdf" class="btn btn-secondary" style="padding:6px 14px; font-size:0.8rem;">导出PDF</button>
        <button id="btn-exit-admin" class="btn btn-secondary" style="padding:8px 20px; font-size:0.85rem;">退出管理</button>
      </div>
    </div>
    <div class="page has-navbar">
      <div class="container" style="max-width:1000px;">
        <div style="text-align:center; margin-bottom:20px;">
          <h1 style="font-family:var(--font-display); font-size:1.8rem; font-weight:900; color:var(--text-primary); margin-bottom:8px;">用户管理</h1>
          <p style="color:var(--text-secondary);">共 ${users.length} 位用户</p>
        </div>
        <div class="admin-table-wrapper">
          <table class="admin-table">
            <thead>
              <tr>
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
              ${usersWithData.length === 0
      ? `<tr><td colspan="8" style="text-align:center; color:var(--text-light); padding:24px;">暂无用户数据</td></tr>`
      : usersWithData
        .map(
          u => `
                    <tr>
                      <td><strong>${u.name}</strong></td>
                      <td>${u.age || '-'}</td>
                      <td>${u.gender || '-'}</td>
                      <td>${u.ageGroup || store.getAgeGroup(u.age)}</td>
                      <td>${u.progress}</td>
                      <td style="font-weight:700; color:var(--primary);">${u.totalScore}</td>
                      <td style="font-size:0.8rem; color:var(--text-light);">${formatDate(u.createdAt)}</td>
                      <td>
                        <div style="display:flex; gap:8px;">
                          <button class="btn-mini btn-mini-view" data-user-id="${u.id}">查看</button>
                          <button class="btn-mini btn-mini-delete" data-user-id="${u.id}" data-user-name="${u.name}">删除</button>
                        </div>
                      </td>
                    </tr>
                  `,
        )
        .join('')
    }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-exit-admin').addEventListener('click', () => {
    userManager.setAdmin(false);
    router.navigate('/login');
  });
  document.getElementById('btn-question-admin').addEventListener('click', () => router.navigate('/question-admin'));
  document.getElementById('btn-question-bank').addEventListener('click', () => router.navigate('/question-bank'));
  document.getElementById('btn-analytics').addEventListener('click', () => router.navigate('/admin/analytics'));

  document.getElementById('btn-export-excel').addEventListener('click', () => {
    const allData = users.map(item => userManager.getUserData(item.id) || {});
    exportUsersToExcel(allData);
  });
  document.getElementById('btn-export-pdf').addEventListener('click', () => {
    const allData = users.map(item => {
      const data = userManager.getUserData(item.id) || {};
      return { ...data, user: data.user || item };
    });
    generateClassReportPDF(allData);
  });

  // 查看详情
  document.querySelectorAll('.btn-mini-view').forEach(button => {
    button.addEventListener('click', () => {
      const userId = button.dataset.userId;
      const user = users.find(item => item.id === userId);
      const data = userManager.getUserData(userId) || {};
      const lines = DIMENSIONS.map(item => {
        const p = data.testProgress?.[item.key];
        const done = p?.subTests?.filter(Boolean).length || 0;
        const score = Number(data.testResults?.[item.key]?.totalScore || 0).toFixed(1);
        return `${item.icon} ${item.name}：${score} 分（${done}/${item.subTests.length} 子测试完成）`;
      }).join('\n');
      const info = `姓名：${user?.name || '-'}\n年龄：${user?.age || '-'} 岁\n性别：${user?.gender || '-'}\n分组：${user?.ageGroup || '-'}\n\n各维度得分\n${'─'.repeat(28)}\n${lines}`;
      showModal(`📊 ${user?.name || '用户'} 的测评详情`, info);
    });
  });

  // 删除用户
  document.querySelectorAll('.btn-mini-delete').forEach(button => {
    button.addEventListener('click', () => {
      const userId = button.dataset.userId;
      const userName = button.dataset.userName;
      showModal(
        `🗑️ 确认删除`,
        `即将删除用户「${userName}」及其所有测评数据，此操作不可撤销。`,
        () => {
          userManager.deleteUser(userId);
          renderAdmin(app);
        }
      );
    });
  });
}
