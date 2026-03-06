import { router } from '../router.js';
import { store } from '../store.js';
import { userManager } from '../userManager.js';
import { exportUsersToExcel, exportToJSON } from '../utils/dataExport.js';
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
        <button id="btn-question-admin" class="btn btn-secondary" style="padding:6px 14px; font-size:0.8rem;">题库管理</button>
        <button id="btn-analytics" class="btn btn-secondary" style="padding:6px 14px; font-size:0.8rem;">数据分析</button>
        <button id="btn-export-excel" class="btn btn-secondary" style="padding:6px 14px; font-size:0.8rem;">导出Excel</button>
        <button id="btn-export-pdf" class="btn btn-secondary" style="padding:6px 14px; font-size:0.8rem;">导出PDF</button>
        <button id="btn-export-json" class="btn btn-secondary" style="padding:6px 14px; font-size:0.8rem;">导出JSON</button>
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
              ${
                usersWithData.length === 0
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
  document.getElementById('btn-export-json').addEventListener('click', () => {
    const allData = users.map(item => ({ user: item, ...(userManager.getUserData(item.id) || {}) }));
    exportToJSON(allData, `assessment_data_${new Date().toISOString().slice(0, 10)}.json`);
  });

  document.querySelectorAll('.btn-mini-view').forEach(button => {
    button.addEventListener('click', () => {
      const userId = button.dataset.userId;
      const user = users.find(item => item.id === userId);
      const data = userManager.getUserData(userId) || {};
      const detail = DIMENSIONS.map(item => {
        const p = data.testProgress?.[item.key];
        const done = p?.subTests?.filter(Boolean).length || 0;
        const score = Number(data.testResults?.[item.key]?.totalScore || 0).toFixed(1);
        return `${item.icon} ${item.name}: ${score} (${done}/${item.subTests.length})`;
      }).join('\n');
      alert(`用户: ${user?.name || '-'}\n年龄: ${user?.age || '-'}\n\n${detail}`);
    });
  });

  document.querySelectorAll('.btn-mini-delete').forEach(button => {
    button.addEventListener('click', () => {
      const userId = button.dataset.userId;
      const userName = button.dataset.userName;
      if (confirm(`确定删除用户 ${userName} 吗？`)) {
        userManager.deleteUser(userId);
        renderAdmin(app);
      }
    });
  });
}

