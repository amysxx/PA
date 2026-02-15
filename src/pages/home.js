/**
 * 首页/欢迎页
 */
import { router } from '../router.js';
import { store } from '../store.js';
import { userManager } from '../userManager.js';

export function renderHome(app) {
  app.innerHTML = `
    <div class="bg-decoration">
      <div class="bg-blob bg-blob-1"></div>
      <div class="bg-blob bg-blob-2"></div>
      <div class="bg-blob bg-blob-3"></div>
    </div>
    <div class="page page-center" style="min-height:100vh; position:relative; z-index:1;">
      <div class="home-content" style="text-align:center; max-width:680px;">
        <div class="home-mascot" style="font-size:5rem; margin-bottom:16px; animation: float 3s ease-in-out infinite;">
          🧠
        </div>
        <h1 class="home-title" style="
          font-family: var(--font-display);
          font-size: 3rem;
          font-weight: 900;
          background: var(--bg-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 12px;
          animation: scaleIn 0.6s ease forwards;
        ">智趣认知乐园</h1>
        <p class="home-subtitle" style="
          font-size: 1.15rem;
          color: var(--text-secondary);
          margin-bottom: 8px;
          animation: fadeSlideIn 0.7s ease forwards;
          line-height: 1.7;
        ">基于 PASS 理论的儿童青少年认知力测评系统</p>
        <p style="
          font-size: 0.95rem;
          color: var(--text-light);
          margin-bottom: 40px;
          animation: fadeSlideIn 0.8s ease forwards;
          line-height: 1.6;
        ">计划 · 注意 · 同时性加工 · 继时性加工<br/>全方位评估认知发展水平</p>

        <div class="home-features" style="
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 40px;
        ">
          <div class="home-feature-card" style="animation: bounceIn 0.5s ease forwards; animation-delay: 0.3s; opacity: 0;">
            <div style="font-size:2rem; margin-bottom:8px;">🎯</div>
            <div style="font-weight:700; font-size:0.85rem; color:var(--primary);">计划能力</div>
          </div>
          <div class="home-feature-card" style="animation: bounceIn 0.5s ease forwards; animation-delay: 0.5s; opacity: 0;">
            <div style="font-size:2rem; margin-bottom:8px;">👁️</div>
            <div style="font-weight:700; font-size:0.85rem; color:var(--accent-orange);">注意过程</div>
          </div>
          <div class="home-feature-card" style="animation: bounceIn 0.5s ease forwards; animation-delay: 0.7s; opacity: 0;">
            <div style="font-size:2rem; margin-bottom:8px;">🧩</div>
            <div style="font-weight:700; font-size:0.85rem; color:var(--secondary);">同时性加工</div>
          </div>
          <div class="home-feature-card" style="animation: bounceIn 0.5s ease forwards; animation-delay: 0.9s; opacity: 0;">
            <div style="font-size:2rem; margin-bottom:8px;">🔗</div>
            <div style="font-weight:700; font-size:0.85rem; color:var(--accent-pink);">继时性加工</div>
          </div>
        </div>

        <button id="btn-start" class="btn btn-primary btn-large" style="
          animation: bounceIn 0.6s ease forwards;
          animation-delay: 1.1s;
          opacity: 0;
          min-width: 220px;
        ">
          🚀 开始测评
        </button>

        ${userManager.isLoggedIn() && userManager.getCurrentUser() ? `
          <p style="margin-top: 20px; font-size:0.9rem; color:var(--text-secondary); animation: fadeIn 1s ease forwards; animation-delay: 1.3s; opacity:0;">
            欢迎回来，<strong>${userManager.getCurrentUser().name}</strong>！
            <a href="#/test-select" style="color:var(--primary); text-decoration:underline; margin-left:8px;">继续测评 →</a>
          </p>
        ` : ''}

        <div style="
          margin-top: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 24px;
          font-size: 0.8rem;
          color: var(--text-light);
          animation: fadeIn 1s ease forwards;
          animation-delay: 1.5s;
          opacity: 0;
        ">
          <span>👶 适用年龄：5-17岁</span>
          <span>⏱️ 约 20-30 分钟</span>
          <span>📊 四维度评估</span>
        </div>
      </div>
    </div>

    <style>
      .home-feature-card {
        background: var(--bg-card);
        border-radius: var(--radius-lg);
        padding: 20px 12px;
        box-shadow: var(--shadow-sm);
        transition: all var(--transition-normal);
        cursor: default;
      }
      .home-feature-card:hover {
        transform: translateY(-6px);
        box-shadow: var(--shadow-lg);
      }
      @media (max-width: 600px) {
        .home-features { grid-template-columns: repeat(2, 1fr) !important; }
        .home-title { font-size: 2.2rem !important; }
      }
    </style>
  `;

  document.getElementById('btn-start').addEventListener('click', () => {
    router.navigate('/login');
  });
}
