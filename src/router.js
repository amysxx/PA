/**
 * 简易 SPA 路由管理器
 */
class Router {
    constructor() {
        this.routes = {};
        this.currentPage = null;
        window.addEventListener('hashchange', () => this.handleRoute());
    }

    register(path, handler) {
        this.routes[path] = handler;
        return this;
    }

    navigate(path) {
        window.location.hash = path;
    }

    handleRoute() {
        const hash = window.location.hash.replace('#', '') || '/';
        const handler = this.routes[hash];
        if (handler) {
            this.currentPage = hash;
            const app = document.getElementById('app');
            app.innerHTML = '';
            handler(app);
        }
    }

    start() {
        this.handleRoute();
    }
}

export const router = new Router();
