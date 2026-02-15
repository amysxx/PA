/**
 * 测评选择页 - 四大认知维度
 */
import { router } from '../router.js';
import { store } from '../store.js';
import { userManager } from '../userManager.js';

export function renderTestSelect(app) {
  const user = store.get('user');
  if (!user.name || !userManager.isLoggedIn()) {
    router.navigate('/login');
    return;
  }

  const progress = store.get('testProgress');
  const completedCount = store.getCompletedCount();
  const allDone = store.isAllCompleted();

  const dimensions = [
    {
      key: 'planning',
      name: '计划能力',
      icon: '🎯',
      cardClass: 'card-planning',
      desc: '评估认知控制、策略制定、自我监控和问题解决能力',
      subTests: ['视觉搜索', '数字连接', '路径规划']
    },
    {
      key: 'attention',
      name: '注意过程',
      icon: '👁️',
      cardClass: 'card-attention',
      desc: '评估选择性注意、维持性注意和注意转换能力',
      subTests: ['选择性注意', '持续性注意', '注意转换']
    },
    {
      key: 'simultaneous',
      name: '同时性加工',
      icon: '🧩',
      cardClass: 'card-simultaneous',
      desc: '评估信息整合、空间关系理解和整体加工能力',
      subTests: ['图形矩阵', '空间关系', '词语关系']
    },
    {
      key: 'successive',
      name: '继时性加工',
      icon: '🔗',
      cardClass: 'card-successive',
      desc: '评估顺序处理信息、线性关系和序列理解能力',
      subTests: ['数字序列', '词序记忆', '句子理解']
    }
  ];

  app.innerHTML = `
    <div class="navbar">
      <a class="navbar-brand" href="#/">
        <span class="navbar-brand-icon">🧠</span>
        <span>智趣认知乐园</span>
      </a>
      <div class="navbar-actions" style="display:flex; align-items:center; gap:12px;">
        <span style="font-size:0.9rem; color:var(--text-secondary);">
          ${user.name}（${user.ageGroup}）
        </span>
        <button id="btn-switch-user" class="btn btn-secondary" style="padding:6px 16px; font-size:0.8rem;" title="切换用户">
          🔄 切换
        </button>
        <button id="btn-logout" class="btn btn-secondary" style="padding:6px 16px; font-size:0.8rem;" title="退出登录">
          🚪 退出
        </button>
      </div>
    </div>

    <div class="page has-navbar" style="position:relative;">
      <div class="container">
        <div style="text-align:center; margin-bottom:32px;">
          <h1 style="
            font-family: var(--font-display);
            font-size: 1.8rem;
            font-weight: 900;
            color: var(--text-primary);
            margin-bottom:8px;
          ">选择测评项目</h1>
          <p style="color: var(--text-secondary);">完成四个维度的测评，获取完整认知报告</p>

          <div style="max-width:400px; margin:20px auto 0;">
            <div class="progress-bar" style="background:rgba(108,92,231,0.1);">
              <div class="progress-bar-inner" style="width:${(completedCount / 4) * 100}%;"></div>
            </div>
            <div class="progress-text">完成 ${completedCount}/4 项测评</div>
          </div>
        </div>

        <div style="
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        " id="test-cards">
          ${dimensions.map((dim, idx) => {
    const prog = progress[dim.key];
    const completedSubs = prog.subTests.filter(Boolean).length;
    return `
              <div class="card card-gradient ${dim.cardClass}" 
                   data-test="${dim.key}"
                   style="cursor:pointer; animation: bounceIn 0.5s ease forwards; animation-delay: ${0.2 + idx * 0.15}s; opacity:0; position:relative;">
                
                ${prog.completed ? `
                  <div style="position:absolute; top:16px; right:16px; background:rgba(255,255,255,0.3); border-radius:var(--radius-full); padding:4px 12px; font-size:0.8rem; font-weight:700;">
                    ✅ 已完成
                  </div>
                ` : completedSubs > 0 ? `
                  <div style="position:absolute; top:16px; right:16px; background:rgba(255,255,255,0.3); border-radius:var(--radius-full); padding:4px 12px; font-size:0.8rem; font-weight:700;">
                    ${completedSubs}/3
                  </div>
                ` : ''}

                <div class="card-icon">${dim.icon}</div>
                <div class="card-title">${dim.name}</div>
                <div class="card-desc">${dim.desc}</div>
                
                <div style="margin-top:16px; display:flex; gap:6px; flex-wrap:wrap;">
                  ${dim.subTests.map((st, si) => `
                    <span style="
                      font-size:0.75rem;
                      padding:3px 10px;
                      border-radius:var(--radius-full);
                      background:${prog.subTests[si] ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)'};
                      font-weight:600;
                    ">${prog.subTests[si] ? '✓ ' : ''}${st}</span>
                  `).join('')}
                </div>

                <div style="margin-top:12px;">
                  <div class="progress-bar" style="height:6px;">
                    <div class="progress-bar-inner" style="width:${(completedSubs / 3) * 100}%; background:rgba(255,255,255,0.6);"></div>
                  </div>
                </div>
              </div>
            `;
  }).join('')}
        </div>

        ${allDone ? `
          <div style="text-align:center; margin-top:32px; animation: bounceIn 0.5s ease forwards;">
            <button id="btn-report" class="btn btn-primary btn-large">
              📊 查看测评报告
            </button>
          </div>
        ` : ''}
      </div>
    </div>

    <style>
      @media (max-width: 600px) {
        #test-cards { grid-template-columns: 1fr !important; }
      }
    </style>
  `;

  // 测试卡片点击
  document.querySelectorAll('[data-test]').forEach(card => {
    card.addEventListener('click', () => {
      const testKey = card.dataset.test;
      router.navigate(`/test/${testKey}`);
    });
  });

  // 查看报告
  if (allDone) {
    document.getElementById('btn-report').addEventListener('click', () => {
      router.navigate('/report');
    });
  }

  // 切换用户
  document.getElementById('btn-switch-user').addEventListener('click', () => {
    router.navigate('/login');
  });

  // 退出登录
  document.getElementById('btn-logout').addEventListener('click', () => {
    store.logout();
    router.navigate('/login');
  });
}
