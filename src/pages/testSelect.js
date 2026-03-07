import { router } from '../router.js';
import { store } from '../store.js';
import { userManager } from '../userManager.js';
import {
  DIMENSIONS,
  FINE_GRAINED_IMPLEMENTED_INDICATORS,
  FINE_GRAINED_TOTAL_INDICATORS,
} from '../domain/dimensions.ts';
import { FINE_GRAINED_FRAMEWORK } from '../domain/fineGrainedFramework.ts';

function getMappedFrameworkNames(dimension) {
  return FINE_GRAINED_FRAMEWORK.filter(item => dimension.frameworkRefs.includes(item.key)).map(item => item.name);
}

/** 显示管理员密码弹窗，成功后回调 onSuccess */
function showAdminPasswordModal(onSuccess) {
  const old = document.getElementById('admin-modal-overlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'admin-modal-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;
    display:flex;align-items:center;justify-content:center;
    backdrop-filter:blur(6px);
  `;
  overlay.innerHTML = `
    <div style="background:#1e1e2e;border-radius:16px;padding:28px 24px;max-width:420px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
      <div style="font-size:2.2rem;margin-bottom:10px;">🔑</div>
      <h3 style="color:#fff;margin:0 0 6px;font-size:1.1rem;">管理员验证</h3>
      <p style="color:#888;font-size:0.85rem;margin:0 0 18px;">输入管理员密码以查看实时测评报告</p>
      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <input id="ap-pwd" type="password" placeholder="管理员密码" autocomplete="off"
          style="flex:1;padding:10px 12px;border-radius:8px;border:1px solid #444;background:#111;color:#fff;font-size:0.9rem;outline:none;">
        <button id="ap-confirm" style="padding:10px 16px;border:none;background:var(--primary,#6c47ff);color:#fff;border-radius:8px;cursor:pointer;font-weight:700;white-space:nowrap;">确认</button>
      </div>
      <div id="ap-error" style="color:#ef4444;font-size:0.82rem;display:none;margin-bottom:4px;">密码错误，请重试</div>
      <button id="ap-cancel" style="margin-top:4px;background:transparent;border:none;color:#888;cursor:pointer;font-size:0.85rem;">取消</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const pwdInput = overlay.querySelector('#ap-pwd');
  const errorTip = overlay.querySelector('#ap-error');
  pwdInput.focus();

  const tryUnlock = () => {
    errorTip.style.display = 'none';
    if (userManager.verifyAdmin(pwdInput.value.trim())) {
      overlay.remove();
      onSuccess();
    } else {
      errorTip.style.display = 'block';
      pwdInput.value = '';
      pwdInput.focus();
    }
  };

  overlay.querySelector('#ap-confirm').addEventListener('click', tryUnlock);
  pwdInput.addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlock(); });
  overlay.querySelector('#ap-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

export function renderTestSelect(app) {
  const user = store.get('user');
  if (!user.name || !userManager.isLoggedIn()) {
    router.navigate('/login');
    return;
  }

  const progress = store.get('testProgress');
  const completedCount = store.getCompletedSubTestCount();
  const totalCount = store.getTotalSubTestCount();
  const allDone = store.isAllCompleted();
  const pct = Math.round((completedCount / Math.max(totalCount, 1)) * 100);

  app.innerHTML = `
    <div class="navbar">
      <a class="navbar-brand" href="#/">
        <span class="navbar-brand-icon">🧠</span>
        <span>智趣认知乐园</span>
      </a>
      <div class="navbar-actions" style="display:flex; align-items:center; gap:12px;">
        <span style="font-size:0.9rem; color:var(--text-secondary);">
          ${user.name} · ${user.ageGroup}
        </span>
        <button id="btn-switch-user" class="btn btn-secondary" style="padding:6px 16px; font-size:0.8rem;">切换</button>
        <button id="btn-logout" class="btn btn-secondary" style="padding:6px 16px; font-size:0.8rem;">退出</button>
      </div>
    </div>

    <div class="page has-navbar" style="position:relative;">
      <div class="container">
        <div style="text-align:center; margin-bottom:24px;">
          <h1 style="font-family:var(--font-display); font-size:1.8rem; font-weight:900; color:var(--text-primary); margin-bottom:8px;">
            选择测评项目
          </h1>
          <p style="color:var(--text-secondary);">按精细化认知力框架展示当前可测指标</p>

          <div style="max-width:420px; margin:20px auto 0;">
            <div style="display:flex;justify-content:space-between;font-size:0.85rem;color:var(--text-secondary);margin-bottom:6px;">
              <span>总体进度</span>
              <span><strong style="color:var(--primary);">${completedCount}</strong> / ${totalCount} 个子测评已完成（${pct}%）</span>
            </div>
            <div class="progress-bar" style="background:rgba(108,92,231,0.1);">
              <div class="progress-bar-inner" style="width:${pct}%;"></div>
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom:20px; padding:16px 20px;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
            <div>
              <div style="font-weight:800; margin-bottom:4px;">精细化框架总览</div>
              <div style="font-size:0.88rem; color:var(--text-secondary);">
                ${FINE_GRAINED_FRAMEWORK.length} 大能力 × ${FINE_GRAINED_TOTAL_INDICATORS} 子成分，当前已上线 ${FINE_GRAINED_IMPLEMENTED_INDICATORS} 项
              </div>
            </div>
          </div>
          <div style="margin-top:12px; display:flex; flex-wrap:wrap; gap:8px;">
            ${FINE_GRAINED_FRAMEWORK.map(item => `
              <span style="font-size:0.78rem; padding:4px 10px; border-radius:999px; background:var(--bg-main); color:var(--text-secondary);">
                ${item.icon} ${item.name}（${item.indicators.length}）
              </span>
            `).join('')}
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;" id="test-cards">
          ${DIMENSIONS.map((dimension, idx) => {
    const itemProgress = progress[dimension.key] || { completed: false, subTests: [] };
    const completedSubs = itemProgress.subTests.filter(Boolean).length;
    const totalSubs = dimension.subTests.length;
    const dimPct = Math.round((completedSubs / Math.max(totalSubs, 1)) * 100);
    const mappedNames = getMappedFrameworkNames(dimension);

    return `
              <div class="card card-gradient ${dimension.cardClass}"
                   data-test="${dimension.key}"
                   style="cursor:pointer; animation:bounceIn 0.5s ease forwards; animation-delay:${0.2 + idx * 0.12}s; opacity:0; position:relative;">

                ${itemProgress.completed ? `
                  <div style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.3);border-radius:var(--radius-full);padding:4px 12px;font-size:0.8rem;font-weight:700;">
                    ✓ 已完成
                  </div>
                ` : `
                  <div style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.25);border-radius:var(--radius-full);padding:4px 12px;font-size:0.82rem;font-weight:700;">
                    ${completedSubs}/${totalSubs} 题
                  </div>
                `}

                <div class="card-icon">${dimension.icon}</div>
                <div class="card-title">${dimension.name}</div>
                <div class="card-desc">${dimension.desc}</div>

                <div style="margin-top:14px; display:flex; gap:6px; flex-wrap:wrap;">
                  ${dimension.subTests.map((subTest, subIndex) => `
                    <span style="
                      font-size:0.75rem;
                      padding:3px 10px;
                      border-radius:var(--radius-full);
                      background:${itemProgress.subTests[subIndex] ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)'};
                      font-weight:600;
                    ">${itemProgress.subTests[subIndex] ? '✓ ' : ''}${subTest.name}</span>
                  `).join('')}
                </div>

                <div style="margin-top:10px; font-size:0.74rem; color:rgba(255,255,255,0.85);">
                  对应框架：${mappedNames.join(' / ')}
                </div>

                <div style="margin-top:12px;">
                  <div style="display:flex;justify-content:space-between;font-size:0.72rem;color:rgba(255,255,255,0.8);margin-bottom:4px;">
                    <span>子测评进度</span><span>${completedSubs}/${totalSubs}（${dimPct}%）</span>
                  </div>
                  <div class="progress-bar" style="height:6px;">
                    <div class="progress-bar-inner" style="width:${dimPct}%; background:rgba(255,255,255,0.65);"></div>
                  </div>
                </div>
              </div>
            `;
  }).join('')}
        </div>

        <!-- 底部入口区 -->
        <div style="text-align:center; margin-top:36px; display:flex; gap:16px; justify-content:center; flex-wrap:wrap; animation:bounceIn 0.5s ease forwards; animation-delay:1s; opacity:0;">
          ${allDone
      ? `<button id="btn-report" class="btn btn-primary btn-large">查看完整测评报告</button>`
      : `<button id="btn-admin-report" class="btn btn-secondary" style="padding:12px 28px;">
                🔑 管理员查看实时报告
              </button>`
    }
        </div>
      </div>
    </div>

    <style>
      @media (max-width: 600px) {
        #test-cards { grid-template-columns: 1fr !important; }
      }
    </style>
  `;

  document.querySelectorAll('[data-test]').forEach(card => {
    card.addEventListener('click', () => {
      router.navigate(`/test/${card.dataset.test}`);
    });
  });

  if (allDone) {
    document.getElementById('btn-report').addEventListener('click', () => router.navigate('/report'));
  } else {
    document.getElementById('btn-admin-report').addEventListener('click', () => {
      showAdminPasswordModal(() => {
        sessionStorage.setItem('admin_report_unlock', 'true');
        router.navigate('/report');
      });
    });

  }

  document.getElementById('btn-switch-user').addEventListener('click', () => router.navigate('/login'));
  document.getElementById('btn-logout').addEventListener('click', () => {
    store.logout();
    router.navigate('/login');
  });
}
