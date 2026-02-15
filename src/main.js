/**
 * 应用入口 - 初始化路由
 */
import { router } from './router.js';
import { userManager } from './userManager.js';
import { renderHome } from './pages/home.js';
import { renderLogin } from './pages/login.js';
import { renderAdmin } from './pages/admin.js';
import { renderUserInfo } from './pages/userInfo.js';
import { renderTestSelect } from './pages/testSelect.js';
import { renderPlanning } from './pages/tests/planning.js';
import { renderAttention } from './pages/tests/attention.js';
import { renderSimultaneous } from './pages/tests/simultaneous.js';
import { renderSuccessive } from './pages/tests/successive.js';
import { renderReport } from './pages/report.js';
import { renderHistory } from './pages/history.js';
import { renderAdminAnalytics } from './pages/adminAnalytics.js';

// 迁移旧版单用户数据
userManager.migrateOldData();

// 注册路由
router
    .register('/', renderHome)
    .register('/login', renderLogin)
    .register('/admin', renderAdmin)
    .register('/user-info', renderUserInfo)
    .register('/test-select', renderTestSelect)
    .register('/test/planning', renderPlanning)
    .register('/test/attention', renderAttention)
    .register('/test/simultaneous', renderSimultaneous)
    .register('/test/successive', renderSuccessive)
    .register('/report', renderReport)
    .register('/history', renderHistory)
    .register('/admin/analytics', renderAdminAnalytics);

// 启动
router.start();

console.log('🧠 智趣认知乐园 - 已启动');
