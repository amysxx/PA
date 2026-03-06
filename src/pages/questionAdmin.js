/**
 * 题目管理后台页面
 * 允许管理员上传图片、添加、编辑、删除题目
 */
import { router } from '../router.js';
import { userManager } from '../userManager.js';
import { questionManager } from '../utils/questionManager.js';
import { DIMENSIONS } from '../domain/dimensions.ts';
import { FINE_GRAINED_FRAMEWORK_MAP } from '../domain/fineGrainedFramework.ts';

export function renderQuestionAdmin(app) {
    if (!userManager.isAdmin || !userManager.isAdmin()) {
        router.navigate('/login');
        return;
    }

    app.innerHTML = `
        <div class="navbar">
            <a class="navbar-brand" href="#/admin">
                <span class="navbar-brand-icon">⚙️</span>
                <span>返回管理后台</span>
            </a>
            <div class="navbar-actions">
                <button id="btn-add-question" class="btn btn-primary">➕ 添加新题目</button>
            </div>
        </div>
        <div class="page has-navbar">
            <div class="container" style="max-width:1000px; position:relative;">
                
                <!-- 列表视图 -->
                <div id="view-list">
                    <h1 style="font-family: var(--font-display); font-size: 2rem; margin-bottom: 24px;">题目管理系统</h1>
                    
                    <!-- 筛选区 -->
                    <div class="card" style="margin-bottom: 24px; display:flex; gap:16px; align-items:center;">
                        <strong style="margin-right:8px;">筛选：</strong>
                        <select id="filter-category" class="form-input" style="width:200px; margin-bottom:0;">
                            <option value="">所有维度</option>
                            ${DIMENSIONS.map(d => `<option value="${d.key}">${d.name}</option>`).join('')}
                        </select>
                        <select id="filter-age" class="form-input" style="width:200px; margin-bottom:0;">
                            <option value="">所有年龄组</option>
                            <option value="all">通用 (均适用)</option>
                            <option value="5-7岁组">5-7岁组</option>
                            <option value="8-14岁组">8-14岁组</option>
                            <option value="15-18岁组">15-18岁组</option>
                        </select>
                    </div>

                    <!-- 统计区 -->
                    <div id="stats-container" style="display:flex; gap:16px; margin-bottom:24px;">
                        <!-- 动态渲染 -->
                    </div>
                    <div id="framework-coverage" class="card" style="margin-bottom:24px; display:none;"></div>

                    <!-- 题目列表 -->
                    <div class="card" style="padding:0;">
                        <div style="padding:16px; border-bottom:1px solid rgba(0,0,0,0.05);">
                            <h3 style="margin:0;">题目列表 (<span id="question-count">0</span>)</h3>
                        </div>
                        <div id="question-list" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:16px; padding:16px;">
                            <!-- 动态渲染 -->
                        </div>
                    </div>
                </div>

                <!-- 表单视图 -->
                <div id="view-form" style="display:none;">
                    <button class="btn btn-secondary" id="btn-back-to-list" style="margin-bottom:24px;">⬅️ 返回列表</button>
                    <div class="card" style="width:100%; padding:32px;">
                        <h2 id="form-title" style="margin-top:0; margin-bottom:24px; font-family:var(--font-display);">添加新题目</h2>
                        
                        <form id="question-form" onsubmit="return false;">
                            <input type="hidden" id="q-id" />
                            <input type="hidden" id="q-imageId" />
                            
                            <div class="form-group">
                                <label class="form-label">所属维度 *</label>
                                <select id="q-category" class="form-input" required>
                                    <option value="">-- 请选择 --</option>
                                    ${DIMENSIONS.map(d => `<option value="${d.key}">${d.name}</option>`).join('')}
                                </select>
                            </div>

                            <div class="form-group">
                                <label class="form-label">子测试类型 *</label>
                                <select id="q-subCategory" class="form-input" required>
                                    <option value="">-- 先选择维度 --</option>
                                </select>
                                <div id="q-subCategory-hint" style="display:none; margin-top:8px; font-size:0.8rem; line-height:1.5; color:var(--text-secondary); background:var(--bg-main); border-radius:8px; padding:8px 10px;"></div>
                            </div>

                            <div class="form-group">
                                <label class="form-label">适用年龄段 *</label>
                                <select id="q-ageGroup" class="form-input" required>
                                    <option value="all">通用 (均适用)</option>
                                    <option value="5-7岁组">5-7岁组</option>
                                    <option value="8-14岁组">8-14岁组</option>
                                    <option value="15-18岁组">15-18岁组</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label class="form-label">题目描述/指导语 *</label>
                                <input type="text" id="q-title" class="form-input" placeholder="例如：观察图形，选择正确答案" required />
                            </div>

                            <div class="form-group">
                                <label class="form-label">题目图片 *</label>
                                <div id="image-preview" style="width:100%; min-height:100px; border:2px dashed #e2e8f0; border-radius:8px; display:flex; align-items:center; justify-content:center; margin-bottom:8px; cursor:pointer; overflow:hidden;">
                                    <span style="color:var(--text-light);">点击上传题目图片</span>
                                </div>
                                <input type="file" id="q-image-upload" accept="image/*" style="display:none;" />
                            </div>

                            <div class="form-group">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                    <label class="form-label" style="margin-bottom:0;">选项图片与答案设置选项 *</label>
                                    <div>
                                        <button type="button" class="btn btn-secondary" id="btn-add-option" style="padding:4px 8px; font-size:0.8rem;">+ 添加选项</button>
                                        <button type="button" class="btn btn-secondary" id="btn-remove-option" style="padding:4px 8px; font-size:0.8rem;">- 移除选项</button>
                                    </div>
                                </div>
                                <div id="options-container" style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
                                    <!-- 动态渲染选项区 -->
                                </div>
                                <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:8px;">注: 请直接选中其中一个作为正确答案</div>
                            </div>

                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-top:24px;">
                                <div class="form-group">
                                    <label class="form-label">难度 (1-5)</label>
                                    <input type="number" id="q-difficulty" class="form-input" min="1" max="5" value="3" />
                                </div>
                                <div class="form-group">
                                    <label class="form-label">排序</label>
                                    <input type="number" id="q-order" class="form-input" value="0" />
                                </div>
                            </div>

                            <div id="form-error" class="form-error" style="display:none; margin-bottom:16px;"></div>

                            <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
                                <button type="submit" id="btn-save" class="btn btn-primary">保存题目</button>
                            </div>
                        </form>
                    </div>
                </div>

            </div>
        </div>


    `;

    // 二级联动数据
    const subCategories = {};
    const indicatorMetaByName = {};
    DIMENSIONS.forEach(d => {
        const names = [];
        d.subTests.forEach(sub => {
            const frameworkIndicators = d.frameworkRefs
                .flatMap(key => FINE_GRAINED_FRAMEWORK_MAP[key]?.indicators || []);
            const indicator =
                frameworkIndicators.find(item => item.key === sub.indicatorKey) ||
                frameworkIndicators.find(item => item.name === sub.indicatorName) ||
                null;

            const primaryName = indicator?.name || sub.indicatorName || sub.name;
            names.push(primaryName);
            indicatorMetaByName[primaryName] = indicator || {
                name: primaryName,
                definition: '',
                suggestedLoad: '',
                ageRange: ''
            };

            (sub.categoryAliases || []).forEach(alias => {
                names.push(alias);
                indicatorMetaByName[alias] = indicatorMetaByName[primaryName];
            });
        });

        subCategories[d.key] = Array.from(new Set(names));
    });

    const catSelect = document.getElementById('q-category');
    const subCatSelect = document.getElementById('q-subCategory');
    const subCatHint = document.getElementById('q-subCategory-hint');

    function updateSubCategoryHint() {
        if (!subCatHint) return;
        const selectedName = subCatSelect.value;
        const meta = indicatorMetaByName[selectedName];
        if (!meta) {
            subCatHint.style.display = 'none';
            subCatHint.innerHTML = '';
            return;
        }

        subCatHint.innerHTML = `
            <strong>${meta.name}</strong><br/>
            <span>定义：${meta.definition}</span><br/>
            <span>建议任务量：${meta.suggestedLoad} ｜ 适用年龄：${meta.ageRange}</span>
        `;
        subCatHint.style.display = 'block';
    }

    catSelect.addEventListener('change', () => {
        const cat = catSelect.value;
        subCatSelect.innerHTML = '<option value="">-- 请选择 --</option>';
        if (subCatHint) {
            subCatHint.style.display = 'none';
            subCatHint.innerHTML = '';
        }
        if (cat && subCategories[cat]) {
            subCategories[cat].forEach(sub => {
                const opt = document.createElement('option');
                opt.value = sub;
                opt.textContent = sub;
                subCatSelect.appendChild(opt);
            });
        }
    });
    subCatSelect.addEventListener('change', updateSubCategoryHint);

    // 图片上传处理
    const imgPreview = document.getElementById('image-preview');
    const imgUpload = document.getElementById('q-image-upload');
    let currentImageBlob = null;
    let previewUrl = null;

    imgPreview.addEventListener('click', () => imgUpload.click());

    imgUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        currentImageBlob = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            previewUrl = e.target.result;
            imgPreview.innerHTML = `<img src="${previewUrl}" style="max-width:100%; max-height:200px; object-fit:contain;" />`;
        };
        reader.readAsDataURL(file);
    });

    // 动态选项状态管理
    const MAX_OPTIONS = 10;
    const MIN_OPTIONS = 2;
    let currentOptionCount = 4;
    let optBlobs = []; // 0-based array for blob storage
    let optImageIds = []; // 0-based array for image id storage

    function renderOptions() {
        const container = document.getElementById('options-container');
        container.innerHTML = '';

        for (let i = 0; i < currentOptionCount; i++) {
            const letter = String.fromCharCode(65 + i); // A, B, C...
            const idx = i + 1; // 1-based index used historically

            const div = document.createElement('div');
            div.style.cssText = 'border:1px solid #e2e8f0; border-radius:8px; padding:12px; position:relative;';
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <div style="font-weight:bold; color:var(--text-secondary);">选项 ${letter}</div>
                    <label style="display:flex; align-items:center; gap:4px; font-size:0.85rem; cursor:pointer;">
                        <input type="radio" name="correct_answer" value="${idx}" />
                        正确答案
                    </label>
                </div>
                <div id="opt-image-preview-${idx}" class="opt-preview" data-idx="${idx}" style="width:100%; height:80px; border:2px dashed #e2e8f0; border-radius:8px; display:flex; align-items:center; justify-content:center; cursor:pointer; overflow:hidden; background:var(--bg-main);">
                    <span style="color:var(--text-light); font-size:0.85rem;">上传图片</span>
                </div>
                <input type="file" id="q-opt-upload-${idx}" accept="image/*" style="display:none;" />
            `;
            container.appendChild(div);

            // 绑定事件
            const previewEl = div.querySelector('.opt-preview');
            const uploader = div.querySelector(`#q-opt-upload-${idx}`);

            // 恢复预览图片内容
            if (optBlobs[i]) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    previewEl.innerHTML = `<img src="${ev.target.result}" style="max-width:100%; max-height:100%; object-fit:cover;" />`;
                };
                reader.readAsDataURL(optBlobs[i]);
            } else if (optImageIds[i]) {
                questionManager.getImage(optImageIds[i]).then(data => {
                    if (data) {
                        previewEl.innerHTML = `<img src="${data}" style="max-width:100%; max-height:100%; object-fit:cover;" />`;
                    }
                });
            }

            previewEl.addEventListener('click', () => uploader.click());

            uploader.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                optBlobs[i] = file;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    previewEl.innerHTML = `<img src="${ev.target.result}" style="max-width:100%; max-height:100%; object-fit:cover;" />`;
                };
                reader.readAsDataURL(file);
            });
        }
    }

    document.getElementById('btn-add-option').addEventListener('click', () => {
        if (currentOptionCount < MAX_OPTIONS) {
            currentOptionCount++;
            renderOptions();
        }
    });

    document.getElementById('btn-remove-option').addEventListener('click', () => {
        if (currentOptionCount > MIN_OPTIONS) {
            optBlobs.pop(); // 移除最后上传的内容
            optImageIds.pop();
            currentOptionCount--;
            renderOptions();
        }
    });

    // 加载统计和列表
    async function loadData() {
        const catFilter = document.getElementById('filter-category').value;
        const ageFilter = document.getElementById('filter-age').value;

        // 统计
        const stats = await questionManager.getStats();
        const statsHtml = DIMENSIONS.map(d => {
            const count = stats[d.key]?.total || 0;
            return `
                <div style="flex:1; background:var(--bg-card); padding:16px; border-radius:8px; box-shadow:var(--shadow-sm); text-align:center;">
                    <div style="font-size:1.5rem; margin-bottom:4px;">${d.icon}</div>
                    <div style="font-size:0.9rem; color:var(--text-secondary);">${d.name}</div>
                    <div style="font-size:1.5rem; font-weight:700; color:${count > 0 ? 'var(--primary)' : 'var(--text-light)'}">${count}</div>
                </div>
            `;
        }).join('');
        document.getElementById('stats-container').innerHTML = statsHtml;

        const coverageEl = document.getElementById('framework-coverage');
        if (coverageEl) {
            const coverageRows = [];
            DIMENSIONS.forEach(d => {
                const indicators = d.frameworkRefs.flatMap(key => FINE_GRAINED_FRAMEWORK_MAP[key]?.indicators || []);
                indicators.forEach(ind => {
                    const count = stats[d.key]?.subs?.[ind.name] || 0;
                    coverageRows.push({
                        dimIcon: d.icon,
                        dimName: d.name,
                        name: ind.name,
                        count,
                        suggestedLoad: ind.suggestedLoad,
                        ageRange: ind.ageRange,
                    });
                });
            });

            const missingCount = coverageRows.filter(row => row.count === 0).length;
            const lowCount = coverageRows.filter(row => row.count > 0 && row.count < 3).length;

            coverageEl.style.display = 'block';
            coverageEl.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <strong>需求框架覆盖检查（按21子成分）</strong>
                    <span style="font-size:0.82rem; color:var(--text-secondary);">缺题 ${missingCount} 项 · 低覆盖 ${lowCount} 项</span>
                </div>
                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:8px;">
                    ${coverageRows.map(row => `
                        <div style="border:1px solid ${row.count === 0 ? '#FF7675' : row.count < 3 ? '#FDCB6E' : '#00B894'}55; border-radius:8px; padding:8px 10px; background:${row.count === 0 ? '#FF767510' : row.count < 3 ? '#FDCB6E10' : '#00B89410'};">
                            <div style="font-weight:700; font-size:0.84rem;">${row.dimIcon} ${row.dimName} · ${row.name}</div>
                            <div style="font-size:0.78rem; color:var(--text-secondary); margin-top:2px;">现有 ${row.count} 题｜建议 ${row.suggestedLoad}｜${row.ageRange}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // 列表
        let questions = [];
        if (catFilter) {
            questions = await questionManager.getQuestionsByCategory(catFilter, '', ageFilter || undefined);
        } else {
            const allQ = await questionManager.getAllQuestions();
            questions = ageFilter ? allQ.filter(q => q.ageGroup === 'all' || q.ageGroup === ageFilter) : allQ;
        }

        document.getElementById('question-count').textContent = questions.length;

        const listEl = document.getElementById('question-list');
        listEl.innerHTML = '';

        if (questions.length === 0) {
            listEl.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:32px; color:var(--text-light);">暂无题目，点击右上角添加</div>';
            return;
        }

        for (const q of questions) {
            const imgDataUrl = await questionManager.getImage(q.imageId);
            const dimName = DIMENSIONS.find(d => d.key === q.category)?.name || q.category;

            const card = document.createElement('div');
            card.style.cssText = 'border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; background:white; display:flex; flex-direction:column; position:relative; padding-bottom:48px;';
            card.innerHTML = `
                <div style="height:150px; background:#f8fafc; display:flex; align-items:center; justify-content:center; border-bottom:1px solid #e2e8f0;">
                    ${imgDataUrl ? `<img src="${imgDataUrl}" style="max-width:100%; max-height:100%; object-fit:contain;" />` : '<span style="color:#cbd5e1;">无图片</span>'}
                </div>
                <div style="padding:12px; flex:1;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                        <span style="font-size:0.75rem; background:#e0e7ff; color:#4338ca; padding:2px 6px; border-radius:4px; font-weight:600;">${dimName} - ${q.subCategory}</span>
                        <span style="font-size:0.75rem; background:#f1f5f9; color:#64748b; padding:2px 6px; border-radius:4px;">${q.ageGroup === 'all' ? '通用' : q.ageGroup}</span>
                    </div>
                    <div style="font-size:0.9rem; font-weight:600; color:var(--text-primary); margin-bottom:8px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
                        ${q.title}
                    </div>
                    ${q.optionImageIds && q.optionImageIds.length > 0 ? `<div style="font-size:0.75rem; color:#10b981; margin-bottom:4px; font-weight:bold;">🖼️ 包含 ${q.optionImageIds.length} 个选项图片</div>` : ''}
                    <div style="font-size:0.8rem; color:var(--text-secondary);">
                        正确答案: 选项 ${String.fromCharCode(65 + q.correctAnswer - 1)}
                    </div>
                </div>
                <div style="position:absolute; bottom:0; left:0; width:100%; display:flex; border-top:1px solid #e2e8f0;">
                    <button class="btn btn-edit" data-id="${q.id}" style="flex:1; border-radius:0; background:transparent; color:#3b82f6; font-size:0.85rem; padding:8px 0; border:none; border-right:1px solid #e2e8f0; cursor:pointer;">编辑</button>
                    <button class="btn btn-delete" data-id="${q.id}" style="flex:1; border-radius:0; background:transparent; color:#ef4444; font-size:0.85rem; padding:8px 0; border:none; cursor:pointer;">删除</button>
                </div>
            `;
            listEl.appendChild(card);
        }

        // 绑定编辑删除事件
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => { window.scrollTo(0, 0); openForm(btn.dataset.id); });
        });
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('确定要删除这个题目吗？这会导致对应的图片也被删除。')) {
                    await questionManager.deleteQuestion(btn.dataset.id);
                    loadData();
                }
            });
        });
    }

    // 筛选事件
    document.getElementById('filter-category').addEventListener('change', loadData);
    document.getElementById('filter-age').addEventListener('change', loadData);

    // 列表与表单视图控制
    const viewList = document.getElementById('view-list');
    const viewForm = document.getElementById('view-form');
    const form = document.getElementById('question-form');

    function showView(view) {
        if (view === 'list') {
            viewList.style.display = 'block';
            viewForm.style.display = 'none';
        } else {
            viewList.style.display = 'none';
            viewForm.style.display = 'block';
        }
    }

    async function openForm(id = null) {
        form.reset();
        document.getElementById('q-id').value = '';
        document.getElementById('q-imageId').value = '';
        document.getElementById('form-error').style.display = 'none';

        currentImageBlob = null;
        previewUrl = null;
        imgPreview.innerHTML = '<span style="color:var(--text-light);">点击上传图片</span>';
        document.getElementById('form-title').textContent = id ? '编辑题目' : '添加新题目';

        // 重置选项状态
        currentOptionCount = 4;
        optBlobs = [];
        optImageIds = [];

        if (id) {
            const q = await questionManager.getQuestion(id);
            if (q) {
                document.getElementById('q-id').value = q.id;
                document.getElementById('q-category').value = q.category;

                // 手动触发分类变更以加载子分类
                catSelect.dispatchEvent(new Event('change'));
                document.getElementById('q-subCategory').value = q.subCategory;
                updateSubCategoryHint();

                document.getElementById('q-ageGroup').value = q.ageGroup;
                document.getElementById('q-title').value = q.title;
                document.getElementById('q-difficulty').value = q.difficulty || 3;
                document.getElementById('q-order').value = q.order || 0;
                document.getElementById('q-imageId').value = q.imageId || '';

                if (q.imageId) {
                    const imgData = await questionManager.getImage(q.imageId);
                    if (imgData) {
                        imgPreview.innerHTML = `<img src="${imgData}" style="max-width:100%; max-height:200px; object-fit:contain;" />`;
                    }
                }

                // 加载原有的选项数据
                if (q.optionImageIds && q.optionImageIds.length > 0) {
                    currentOptionCount = Math.max(2, q.optionImageIds.length);
                    optImageIds = [...q.optionImageIds];
                }

                renderOptions();

                // 设置选中的 correctAnswer
                if (q.correctAnswer) {
                    const radio = document.querySelector(`input[name="correct_answer"][value="${q.correctAnswer}"]`);
                    if (radio) radio.checked = true;
                }
            }
        } else {
            renderOptions();
        }

        showView('form');
    }

    document.getElementById('btn-add-question').addEventListener('click', () => openForm());
    document.getElementById('btn-back-to-list').addEventListener('click', () => showView('list'));

    // 保存题目
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errEl = document.getElementById('form-error');

        const id = document.getElementById('q-id').value;
        const oldImageId = document.getElementById('q-imageId').value;
        const category = document.getElementById('q-category').value;
        const subCategory = document.getElementById('q-subCategory').value;

        if (!category || !subCategory) {
            errEl.textContent = '请选择完整的维度分类';
            errEl.style.display = 'block';
            return;
        }

        if (!currentImageBlob && !oldImageId && !id) {
            errEl.textContent = '请上传题目图片';
            errEl.style.display = 'block';
            return;
        }

        const checkedRadio = document.querySelector('input[name="correct_answer"]:checked');
        if (!checkedRadio) {
            errEl.textContent = '请选中一个正确答案，并在题库管理界面操作!';
            errEl.style.display = 'block';
            return;
        }

        const btnSave = document.getElementById('btn-save');
        btnSave.disabled = true;
        btnSave.textContent = '保存中...';

        try {
            let imageId = oldImageId;
            if (currentImageBlob) {
                imageId = await questionManager.saveImage(currentImageBlob);
            }

            // 处理动态选项图片
            const newOptionImageIds = [];
            for (let i = 0; i < currentOptionCount; i++) {
                if (optBlobs[i]) {
                    const savedOptId = await questionManager.saveImage(optBlobs[i]);
                    newOptionImageIds.push(savedOptId);
                } else if (optImageIds[i]) {
                    newOptionImageIds.push(optImageIds[i]);
                } else {
                    newOptionImageIds.push('');
                }
            }

            const questionData = {
                category,
                subCategory,
                ageGroup: document.getElementById('q-ageGroup').value,
                type: 'image-choice',
                title: document.getElementById('q-title').value.trim(),
                imageId: imageId,
                optionImageIds: newOptionImageIds,
                options: currentOptionCount,
                correctAnswer: parseInt(checkedRadio.value),
                difficulty: parseInt(document.getElementById('q-difficulty').value),
                order: parseInt(document.getElementById('q-order').value)
            };

            if (id) {
                await questionManager.updateQuestion(id, questionData);
            } else {
                await questionManager.addQuestion(questionData);
            }

            showView('list');
            loadData();

        } catch (err) {
            console.error(err);
            errEl.textContent = '保存失败: ' + err.message;
            errEl.style.display = 'block';
        } finally {
            btnSave.disabled = false;
            btnSave.textContent = '保存题目';
        }
    });

    // 初始加载
    loadData();
}
