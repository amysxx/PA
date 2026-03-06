/**
 * 用户信息录入页
 */
import { router } from '../router.js';
import { store } from '../store.js';
import { userManager } from '../userManager.js';

export function renderUserInfo(app) {
  const user = store.get('user');

  app.innerHTML = `
    <div class="bg-decoration">
      <div class="bg-blob bg-blob-1"></div>
      <div class="bg-blob bg-blob-2"></div>
    </div>
    <div class="page page-center" style="position:relative; z-index:1;">
      <div class="container" style="max-width:520px;">
        <div style="text-align:center; margin-bottom:32px;">
          <div style="font-size:3.5rem; margin-bottom:12px; animation: bounceIn 0.5s ease;">📝</div>
          <h1 style="
            font-family: var(--font-display);
            font-size: 1.8rem;
            font-weight: 900;
            color: var(--text-primary);
            margin-bottom:8px;
          ">告诉我们关于你的信息</h1>
          <p style="color: var(--text-secondary); font-size:0.95rem;">让我们来更好地了解你 ✨</p>
        </div>

        <div class="card" style="padding:36px;">
          <div class="form-group">
            <label class="form-label">👋 你的名字</label>
            <input type="text" class="form-input" id="input-name" placeholder="请输入你的名字" value="${user.name || ''}" maxlength="20" />
          </div>

          <div class="form-group">
            <label class="form-label">🎂 出生年月日</label>
            <input type="date" class="form-input" id="input-birthdate" value="${user.birthDate || ''}" />
            <div id="age-display" style="
              margin-top: 8px;
              font-size: 0.9rem;
              font-weight: 700;
              color: var(--primary);
              display: none;
            "></div>
            <div id="age-group-display" style="
              margin-top: 4px;
              font-size: 0.85rem;
              font-weight: 600;
              color: var(--secondary);
              display: none;
            "></div>
            <div id="age-error" class="form-error" style="display:none;"></div>
          </div>

          <div class="form-group">
            <label class="form-label">😊 你的性别</label>
            <div class="gender-select">
              <div class="gender-option ${user.gender === '男' ? 'active' : ''}" data-gender="男">
                <span class="emoji">👦</span>
                <span class="label">男孩</span>
              </div>
              <div class="gender-option ${user.gender === '女' ? 'active' : ''}" data-gender="女">
                <span class="emoji">👧</span>
                <span class="label">女孩</span>
              </div>
            </div>
          </div>

          <div id="form-error" class="form-error" style="display:none; text-align:center; margin-bottom:16px;"></div>

          <button id="btn-submit" class="btn btn-primary btn-large" style="width:100%; margin-top:8px;">
            🎮 开始测评之旅
          </button>
        </div>

        <div style="text-align:center; margin-top:20px;">
          <a href="#/" style="color:var(--text-secondary); font-size:0.9rem; text-decoration:none;">
            ← 返回首页
          </a>
        </div>
      </div>
    </div>
  `;

  let selectedGender = user.gender || '';

  // 性别选择
  document.querySelectorAll('.gender-option').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.gender-option').forEach(o => o.classList.remove('active'));
      el.classList.add('active');
      selectedGender = el.dataset.gender;
    });
  });

  // 出生日期输入 - 自动计算年龄和分组
  const birthInput = document.getElementById('input-birthdate');
  const ageDisplay = document.getElementById('age-display');
  const ageGroupDisplay = document.getElementById('age-group-display');
  const ageError = document.getElementById('age-error');

  function updateAgeFromBirth() {
    const birthDate = birthInput.value;
    if (!birthDate) {
      ageDisplay.style.display = 'none';
      ageGroupDisplay.style.display = 'none';
      ageError.style.display = 'none';
      return;
    }

    const age = store.calculateAge(birthDate);
    if (age >= 5 && age <= 18) {
      const group = store.getAgeGroup(age);
      ageDisplay.textContent = '🎈 年龄：' + age + '岁';
      ageDisplay.style.display = 'block';
      ageGroupDisplay.textContent = '📌 你属于：' + group;
      ageGroupDisplay.style.display = 'block';
      ageError.style.display = 'none';
    } else if (age !== null) {
      ageDisplay.textContent = '🎈 年龄：' + age + '岁';
      ageDisplay.style.display = 'block';
      ageGroupDisplay.style.display = 'none';
      ageError.textContent = '⚠️ 本测评适用于5-18岁';
      ageError.style.display = 'block';
    }
  }

  birthInput.addEventListener('input', updateAgeFromBirth);
  // 初始化显示
  if (user.birthDate) {
    updateAgeFromBirth();
  }

  // 提交表单
  document.getElementById('btn-submit').addEventListener('click', () => {
    const name = document.getElementById('input-name').value.trim();
    const birthDate = birthInput.value;
    const formError = document.getElementById('form-error');

    if (!name) {
      formError.textContent = '⚠️ 请输入你的名字';
      formError.style.display = 'block';
      return;
    }
    if (!birthDate) {
      formError.textContent = '⚠️ 请选择出生年月日';
      formError.style.display = 'block';
      return;
    }

    const age = store.calculateAge(birthDate);
    if (!age || age < 5 || age > 18) {
      formError.textContent = '⚠️ 本测评适用于5-18岁';
      formError.style.display = 'block';
      return;
    }
    if (!selectedGender) {
      formError.textContent = '⚠️ 请选择你的性别';
      formError.style.display = 'block';
      return;
    }

    const ageGroup = store.getAgeGroup(age);
    // 通过 userManager 创建新用户并登录
    userManager.createUser({ name, age, gender: selectedGender, birthDate, ageGroup });
    // 将 store 关联到新用户
    store.setUser({ name, age, gender: selectedGender, birthDate });
    store.set('startTime', Date.now());
    router.navigate('/test-select');
  });
}
