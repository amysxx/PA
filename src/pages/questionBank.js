import { router } from '../router.js';
import { store } from '../store.js';
import { questionManager } from '../utils/questionManager.js';
import { DIMENSIONS } from '../domain/dimensions.ts';
import { builtinQuestions } from '../data/questionPool.js';
import { userManager } from '../userManager.js';

export async function renderQuestionBank(app) {
  try {
    // 检查权限
    if (!userManager.isAdmin || !userManager.isAdmin()) {
      router.navigate('/login');
      return;
    }

    app.innerHTML = `
      <div class="page page-admin">
        <div class="container" style="max-width: 1000px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
            <div>
              <h1 style="margin: 0; display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 2rem;">📚</span> 题库总览
              </h1>
              <p style="color: var(--text-secondary); margin: 8px 0 0;">查看系统所有题目及分级配置</p>
            </div>
            <button class="btn btn-secondary" id="btn-back">返回管理后台</button>
          </div>

          <div style="display: flex; gap: 16px; margin-bottom: 24px;">
            <select id="filter-category" class="input" style="flex: 1;">
              <option value="">全部维度</option>
              ${DIMENSIONS.map(d => `<option value="${d.key}">${d.name}</option>`).join('')}
            </select>
            <select id="filter-age" class="input" style="flex: 1;">
              <option value="">全部年龄段</option>
              <option value="5-7岁组">5-7岁组 (幼儿园/小学低)</option>
              <option value="8-11岁组">8-11岁组 (小学中高)</option>
              <option value="12-14岁组">12-14岁组 (初中)</option>
              <option value="15-18岁组">15-18岁组 (高中)</option>
            </select>
          </div>

          <div id="loading" style="text-align: center; padding: 40px; color: var(--text-secondary);">
            <div style="animation: spin 1s linear infinite; font-size: 2rem; margin-bottom: 12px;">⏳</div>
            加载题库中...
          </div>

          <div id="questions-list" style="columns: 320px; column-gap: 16px;">
          </div>
        </div>
      </div>

      <!-- 题目详情弹窗 -->
      <div id="qb-modal-overlay" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:9999; align-items:center; justify-content:center; backdrop-filter:blur(4px);">
        <div style="background:var(--bg-main); border-radius:16px; padding:28px 24px; max-width:600px; width:90%; max-height:85vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,0.5); position:relative;">
          <button id="qb-modal-close" style="position:absolute; top:16px; right:16px; background:transparent; border:none; font-size:1.5rem; color:var(--text-light); cursor:pointer;">×</button>
          <h3 id="qb-modal-title" style="margin:0 0 16px; font-size:1.2rem; color:var(--text-primary); padding-right:30px;">题目详情</h3>
          <div id="qb-modal-content" style="color:var(--text-secondary); font-size:0.95rem; line-height:1.6; display:flex; flex-direction:column; gap:16px;">
          </div>
          <div style="margin-top:24px; text-align:right;">
            <button id="qb-modal-ok" class="btn btn-primary">关闭</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-back').addEventListener('click', () => {
      router.navigate('/admin');
    });

    const modalOverlay = document.getElementById('qb-modal-overlay');
    document.getElementById('qb-modal-close').addEventListener('click', () => modalOverlay.style.display = 'none');
    document.getElementById('qb-modal-ok').addEventListener('click', () => modalOverlay.style.display = 'none');
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) modalOverlay.style.display = 'none';
    });

    const categoryFilter = document.getElementById('filter-category');
    const ageFilter = document.getElementById('filter-age');
    const listEl = document.getElementById('questions-list');
    const loadingEl = document.getElementById('loading');

    let allQuestions = [];

    // 1. 获取动态题库 (IndexedDB)
    const dbQuestions = await questionManager.getAllQuestions();

    // 2. 梳理内置题库 (从代码里提取结构化展示很难，这里我们提供一个梳理好的结构)
    const builtInQuestions = getBuiltInQuestions();

    allQuestions = [...dbQuestions, ...builtInQuestions];
    loadingEl.style.display = 'none';

    function renderList() {
      const selectedCategory = categoryFilter.value;
      const selectedAge = ageFilter.value;

      const filtered = allQuestions.filter(q => {
        const matchCat = !selectedCategory || q.category === selectedCategory;
        const matchAge = !selectedAge || q.ageGroup === 'all' || q.ageGroup === selectedAge || (Array.isArray(q.ageGroup) && q.ageGroup.includes(selectedAge));
        return matchCat && matchAge;
      });

      if (filtered.length === 0) {
        listEl.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; background: var(--bg-card); border-radius: 12px; color: var(--text-secondary);">无符合条件的题目</div>`;
        return;
      }

      listEl.innerHTML = filtered.map(q => {
        const ageLabels = Array.isArray(q.ageGroup) ? q.ageGroup.join(', ') : q.ageGroup;
        const tBg = q.isBuiltIn ? 'rgba(46, 204, 113, 0.1)' : 'rgba(108, 92, 231, 0.1)';
        const tColor = q.isBuiltIn ? '#2ecc71' : '#6c5ce7';
        const tLabel = q.isBuiltIn ? '内置' : '自定义';

        return `
          <div class="qb-card" data-idx="${filtered.indexOf(q)}" style="background: var(--bg-card); border-radius: 12px; padding: 16px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; break-inside: avoid; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
              <span style="font-size: 0.75rem; padding: 4px 8px; border-radius: 4px; background: ${tBg}; color: ${tColor}; font-weight: 700;">
                ${tLabel} | ${q.subCategory || q.category}
              </span>
              <span style="font-size: 0.75rem; color: var(--text-light);">${ageLabels}</span>
            </div>
            <div style="font-size: 1.05rem; font-weight: 600; margin-bottom: 12px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
              ${q.prompt || q.title || q.q || '（无题干）'}
            </div>
            ${q.options ? `
              <div style="font-size: 0.85rem; color: var(--text-secondary); background: var(--bg-main); padding: 8px; border-radius: 8px;">
                ${q.options.slice(0, 2).map((opt, i) => `
                  <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; ${i === q.answer || i === q.correctAnswer ? 'color: var(--accent-green); font-weight: bold;' : ''}">
                    ${String.fromCharCode(65 + i)}. ${opt} ${i === q.answer || i === q.correctAnswer ? '✓' : ''}
                  </div>
                `).join('')}
                ${q.options.length > 2 ? `<div style="color: var(--text-light); font-size: 0.75rem; margin-top: 4px;">... 等 ${q.options.length} 个选项</div>` : ''}
              </div>
            ` : ''}
          </div>
        `;
      }).join('');

      // 绑定点击事件展示详情
      listEl.querySelectorAll('.qb-card').forEach(card => {
        card.addEventListener('click', async () => {
          const q = filtered[Number(card.dataset.idx)];
          showQuestionDetails(q);
        });
        // 增加悬浮效果
        card.addEventListener('mouseenter', () => card.style.transform = 'translateY(-2px)');
        card.addEventListener('mouseleave', () => card.style.transform = 'none');
      });
    }

    async function showQuestionDetails(q) {
      const titleEl = document.getElementById('qb-modal-title');
      const contentEl = document.getElementById('qb-modal-content');

      titleEl.textContent = `题目详情 - ${q.subCategory || q.category}`;

      let imageHtml = '';
      if (q.imageId) {
        const imgData = await questionManager.getImage(q.imageId);
        if (imgData) {
          imageHtml = `<div style="margin: 10px 0; text-align: center; background: #fff; padding: 10px; border-radius: 8px;"><img src="${imgData}" style="max-width: 100%; max-height: 200px; object-fit: contain;" /></div>`;
        }
      }

      let optImagesHtml = '';
      if (q.optionImageIds && q.optionImageIds.length > 0) {
        const imgPromises = q.optionImageIds.map(id => id ? questionManager.getImage(id) : Promise.resolve(null));
        const imgs = await Promise.all(imgPromises);
        optImagesHtml = '<div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:8px;">';
        imgs.forEach((img, i) => {
          if (img) {
            const isCorrect = (i === q.answer || i === q.correctAnswer);
            optImagesHtml += `
              <div style="border: 2px solid ${isCorrect ? 'var(--accent-green)' : 'var(--border-color)'}; border-radius: 8px; padding: 4px; position: relative;">
                <div style="position:absolute; top:2px; left:4px; font-weight:bold; font-size:0.7rem; color:var(--text-light); z-index:10; background:rgba(255,255,255,0.8); padding:0 4px; border-radius:4px;">${String.fromCharCode(65 + i)}</div>
                <img src="${img}" style="width: 80px; height: 80px; object-fit: contain; background: #fff;" />
                ${isCorrect ? `<div style="text-align:center; color:var(--accent-green); font-size:0.7rem; font-weight:bold;">正确</div>` : ''}
              </div>
            `;
          }
        });
        optImagesHtml += '</div>';
      }

      let optionsHtml = '';
      if (q.options?.length > 0) {
        optionsHtml = `
          <div style="background: var(--bg-body); padding: 12px; border-radius: 8px;">
            <div style="font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">选项：</div>
            ${q.options.map((opt, i) => {
          const isCorrect = (i === q.answer || i === q.correctAnswer);
          return `
                <div style="padding: 6px; margin-bottom: 4px; border-radius: 4px; background: ${isCorrect ? 'rgba(46, 204, 113, 0.1)' : 'transparent'}; color: ${isCorrect ? 'var(--accent-green)' : 'inherit'}; border: 1px solid ${isCorrect ? 'rgba(46, 204, 113, 0.3)' : 'transparent'};">
                  <span style="font-weight: ${isCorrect ? 'bold' : 'normal'}; display:inline-block; width:24px;">${String.fromCharCode(65 + i)}.</span> 
                  ${opt} 
                  ${isCorrect ? '<span style="float:right;">✓ 正确答案</span>' : ''}
                </div>
              `;
        }).join('')}
          </div>
        `;
      }

      contentEl.innerHTML = `
        <div>
          <span style="display:inline-block; width:80px; color:var(--text-light);">题目来源：</span>
          <span style="fontWeight:600; color:${q.isBuiltIn ? '#2ecc71' : '#6c5ce7'};">${q.isBuiltIn ? '系统内置' : '自定义题库'}</span>
        </div>
        <div>
          <span style="display:inline-block; width:80px; color:var(--text-light);">适用年龄：</span>
          <span>${Array.isArray(q.ageGroup) ? q.ageGroup.join(', ') : (q.ageGroup || '全部年龄')}</span>
        </div>
        ${q.timeLimit ? `
        <div>
          <span style="display:inline-block; width:80px; color:var(--text-light);">时间限制：</span>
          <span>${q.timeLimit} 秒</span>
        </div>` : ''}
        <hr style="border:0; border-top:1px solid var(--border-color); margin:8px 0;" />
        
        <div>
          <div style="font-weight:600; color:var(--text-primary); margin-bottom:8px; font-size:1.1rem;">题干描述：</div>
          <div style="background:var(--bg-body); padding:16px; border-radius:8px; font-size:1.05rem; border-left:4px solid var(--primary);">
            ${q.prompt || q.title || q.q || '（无文本描述）'}
          </div>
        </div>
        
        ${imageHtml}
        ${optionsHtml}
        ${optImagesHtml}
      `;

      modalOverlay.style.display = 'flex';
    }

    categoryFilter.addEventListener('change', renderList);
    ageFilter.addEventListener('change', renderList);

    renderList();
  } catch (err) {
    console.error('Render Question Bank Error:', err);
    alert('渲染题库时发生严重错误: ' + err.message);
    app.innerHTML = `<div style="padding: 20px; color: red;">渲染发生错误: ${err.message}</div>`;
  }
}

/** 
 * 提取系统中关键的内置题库数据结构用于展示
 * （注意仅用于查看功能，修改题目仍在代码或自定义题库中进行）
 */
function getBuiltInQuestions() {
  const list = [];

  // 1. 理解力 - 语言理解
  const langPoolMap = builtinQuestions.langPoolMap;

  Object.entries(langPoolMap).forEach(([ageGroup, questions]) => {
    questions.forEach(q => {
      list.push({ ...q, category: 'comprehension', subCategory: '语言理解', ageGroup, isBuiltIn: true });
    });
  });

  // 2. 理解力 - 逻辑推理
  const logicPoolMap = builtinQuestions.logicPoolMap;

  Object.entries(logicPoolMap).forEach(([ageGroup, questions]) => {
    questions.forEach(q => {
      list.push({ ...q, category: 'comprehension', subCategory: '逻辑推理', ageGroup, isBuiltIn: true });
    });
  });

  // 3. 理解力 - 类比推理
  const analogyPool = builtinQuestions.analogyPool;

  analogyPool.forEach(q => {
    list.push({ prompt: `${q.a} : ${q.b} = ${q.c} : ?`, options: q.options, answer: q.answer, category: 'comprehension', subCategory: '类比推理', ageGroup: 'all', isBuiltIn: true });
  });

  // 4. 理解力 - 关系推理
  const relationPool = builtinQuestions.relationPool;

  relationPool.forEach(q => {
    list.push({ ...q, category: 'comprehension', subCategory: '关系推理', ageGroup: 'all', isBuiltIn: true });
  });

  // 读取刚才在 questionPool.js 里统一生成的各类非理解/推理维度的题库
  if (builtinQuestions.spatialPool) {
    builtinQuestions.spatialPool.forEach(q => list.push({ ...q, isBuiltIn: true }));
  }
  if (builtinQuestions.memoryPool) {
    builtinQuestions.memoryPool.forEach(q => list.push({ ...q, isBuiltIn: true }));
  }
  if (builtinQuestions.attentionPool) {
    builtinQuestions.attentionPool.forEach(q => list.push({ ...q, isBuiltIn: true }));
  }
  if (builtinQuestions.executionPool) {
    builtinQuestions.executionPool.forEach(q => list.push({ ...q, isBuiltIn: true }));
  }
  if (builtinQuestions.processingPool) {
    builtinQuestions.processingPool.forEach(q => list.push({ ...q, isBuiltIn: true }));
  }

  return list;
}
