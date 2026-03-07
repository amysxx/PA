/**
 * 应用入口 - 初始化路由
 */
import { router } from './router.js';
import { userManager } from './userManager.js';
import { storage } from './utils/storageAdapter.js';
import { store } from './store.js';
import { renderHome } from './pages/home.js';
import { renderLogin } from './pages/login.js';
import { renderAdmin } from './pages/admin.js';
import { renderUserInfo } from './pages/userInfo.js';
import { renderTestSelect } from './pages/testSelect.js';
import { renderAttention } from './pages/tests/attention.js';
import { renderMemory } from './pages/tests/memory.js';
import { renderComprehension } from './pages/tests/comprehension.js';
import { renderExecution } from './pages/tests/execution.js';
import { renderSpatial } from './pages/tests/spatial.js';
import { renderProcessing } from './pages/tests/processing.js';
import { renderReport } from './pages/report.js';
import { renderHistory } from './pages/history.js';
import { renderAdminAnalytics } from './pages/adminAnalytics.js';
import { renderQuestionAdmin } from './pages/questionAdmin.js';
import { renderQuestionBank } from './pages/questionBank.js';

// 注册路由
router
    .register('/', renderHome)
    .register('/login', renderLogin)
    .register('/admin', renderAdmin)
    .register('/user-info', renderUserInfo)
    .register('/test-select', renderTestSelect)
    .register('/test/attention', renderAttention)
    .register('/test/memory', renderMemory)
    .register('/test/comprehension', renderComprehension)
    .register('/test/execution', renderExecution)
    .register('/test/spatial', renderSpatial)
    .register('/test/processing', renderProcessing)
    .register('/report', renderReport)
    .register('/history', renderHistory)
    .register('/admin/analytics', renderAdminAnalytics)
    .register('/question-admin', renderQuestionAdmin)
    .register('/question-bank', renderQuestionBank);

// 等待 IndexedDB 就绪后再启动，避免首屏加载需要手动刷新
storage.ready().then(() => {
    // 迁移旧版单用户数据
    userManager.migrateOldData();
    // 重新加载当前用户数据（此时 IndexedDB 已就绪）
    const loaded = store.load();
    if (loaded) store.state = store.normalizeState(loaded);
    router.start();
    console.log('🧠 智趣认知乐园 - 已启动');
}).catch(() => {
    // 降级：直接启动
    userManager.migrateOldData();
    router.start();
    console.log('🧠 智趣认知乐园 - 已启动（localStorage模式）');
});
