import { router } from '../router.js';
import { userManager } from '../userManager.js';
import { FINE_GRAINED_TOTAL_DIMENSIONS, FINE_GRAINED_TOTAL_INDICATORS } from '../domain/fineGrainedFramework.ts';
import { DIMENSIONS } from '../domain/dimensions.ts';

const HOME_MODULES = [
  { icon: '👁️', label: '注意力模块', color: 'var(--primary)' },
  { icon: '🧠', label: '记忆力模块', color: 'var(--accent-orange)' },
  { icon: '📐', label: '理解与推理模块', color: 'var(--secondary)' },
  { icon: '⚡', label: '执行功能模块', color: 'var(--accent-pink)' },
  { icon: '🧭', label: '空间智能模块', color: '#0984E3' },
  { icon: '⏱️', label: '处理速度模块', color: '#F39C12' },
];

export function renderHome(app) {
  const currentUser = userManager.getCurrentUser();
  const onlineModules = DIMENSIONS.length;

  app.innerHTML = `
    <div class="bg-decoration">
      <div class="bg-blob bg-blob-1"></div>
      <div class="bg-blob bg-blob-2"></div>
      <div class="bg-blob bg-blob-3"></div>
    </div>

    <div class="page page-center" style="min-height:100vh; position:relative; z-index:1;">
      <div class="home-content" style="text-align:center; max-width:860px;">
        <div class="home-mascot" style="font-size:5rem; margin-bottom:16px; animation:float 3s ease-in-out infinite;">🧠</div>

        <h1 class="home-title" style="
          font-family:var(--font-display);
          font-size:3rem;
          font-weight:900;
          background:var(--bg-gradient);
          -webkit-background-clip:text;
          -webkit-text-fill-color:transparent;
          background-clip:text;
          margin-bottom:12px;
          animation:scaleIn 0.6s ease forwards;
        ">智趣认知乐园</h1>

        <p class="home-subtitle" style="
          font-size:1.1rem;
          color:var(--text-secondary);
          margin-bottom:10px;
          line-height:1.7;
          animation:fadeSlideIn 0.7s ease forwards;
        ">基于精细化认知力测评框架，覆盖 ${FINE_GRAINED_TOTAL_DIMENSIONS} 大能力、${FINE_GRAINED_TOTAL_INDICATORS} 个认知加工指标。</p>

        <p style="
          font-size:0.95rem;
          color:var(--text-light);
          margin-bottom:34px;
          line-height:1.6;
          animation:fadeSlideIn 0.8s ease forwards;
        ">当前版本已上线 ${onlineModules} 个核心测评模块，并按框架维度输出可追踪报告。</p>

        <div class="home-features" style="
          display:grid;
          grid-template-columns:repeat(3, 1fr);
          gap:14px;
          margin-bottom:30px;
        ">
          ${HOME_MODULES.map(
            (item, index) => `
              <div class="home-feature-card" style="animation:bounceIn 0.5s ease forwards; animation-delay:${0.25 + index * 0.08}s; opacity:0;">
                <div style="font-size:2rem; margin-bottom:8px;">${item.icon}</div>
                <div style="font-weight:700; font-size:0.88rem; color:${item.color};">${item.label}</div>
              </div>
            `,
          ).join('')}
        </div>

        <div style="
          margin-bottom:34px;
          padding:16px 20px;
          border-radius:var(--radius-lg);
          background:var(--bg-card);
          box-shadow:var(--shadow-sm);
          text-align:left;
          animation:fadeSlideIn 0.9s ease forwards;
        ">
          <div style="font-weight:800; margin-bottom:8px; color:var(--text-primary);">精细化框架目标能力</div>
          <div style="font-size:0.9rem; color:var(--text-secondary); line-height:1.7;">
            注意力、记忆力、逻辑思维、空间智能、执行功能、处理速度
          </div>
        </div>

        <button id="btn-start" class="btn btn-primary btn-large" style="
          animation:bounceIn 0.6s ease forwards;
          animation-delay:1.05s;
          opacity:0;
          min-width:220px;
        ">开始测评</button>

        ${
          userManager.isLoggedIn() && currentUser
            ? `
          <p style="margin-top:20px; font-size:0.9rem; color:var(--text-secondary); animation:fadeIn 1s ease forwards; animation-delay:1.2s; opacity:0;">
            欢迎回来：<strong>${currentUser.name}</strong>
            <a href="#/test-select" style="color:var(--primary); text-decoration:underline; margin-left:8px;">继续测评 →</a>
          </p>
        `
            : ''
        }

        <div style="
          margin-top:52px;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:24px;
          font-size:0.8rem;
          color:var(--text-light);
          animation:fadeIn 1s ease forwards;
          animation-delay:1.4s;
          opacity:0;
          flex-wrap:wrap;
        ">
          <span>适用年龄：5-18岁</span>
          <span>测评时长：20-40分钟</span>
          <span>指标覆盖：${FINE_GRAINED_TOTAL_INDICATORS}项</span>
        </div>
      </div>
    </div>

    <style>
      .home-feature-card {
        background:var(--bg-card);
        border-radius:var(--radius-lg);
        padding:18px 10px;
        box-shadow:var(--shadow-sm);
        transition:all var(--transition-normal);
        cursor:default;
      }
      .home-feature-card:hover {
        transform:translateY(-6px);
        box-shadow:var(--shadow-lg);
      }
      @media (max-width: 700px) {
        .home-features { grid-template-columns: repeat(2, 1fr) !important; }
        .home-title { font-size:2.2rem !important; }
      }
      @media (max-width: 430px) {
        .home-features { grid-template-columns: 1fr !important; }
      }
    </style>
  `;

  document.getElementById('btn-start').addEventListener('click', () => {
    router.navigate('/login');
  });
}

