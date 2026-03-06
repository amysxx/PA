/**
 * 测试会话管理器
 * 功能：自动保存、暂停/恢复测评进度、断点续测
 */

const SESSION_KEY_PREFIX = 'pass_session_';
const AUTO_SAVE_INTERVAL = 10000; // 10秒自动保存一次

/**
 * 创建测试会话
 * 在每个子测试开始时调用，管理进度的自动保存和恢复
 */
export class TestSession {
    /**
     * @param {string} dimension - 维度标识 (planning/attention/simultaneous/successive)
     * @param {number} subIndex - 子测试索引 (0/1/2)
     * @param {object} initialState - 初始状态
     */
    constructor(dimension, subIndex, initialState = {}) {
        this.dimension = dimension;
        this.subIndex = subIndex;
        this.sessionKey = `${SESSION_KEY_PREFIX}${dimension}_${subIndex}`;
        this.state = {
            currentQuestion: 0,
            correct: 0,
            total: 0,
            answers: [],
            elapsedTime: 0,
            isPaused: false,
            startedAt: Date.now(),
            lastSavedAt: null,
            ...initialState
        };
        this._autoSaveTimer = null;
        this._pauseListeners = [];
        this._resumeListeners = [];
    }

    /**
     * 启动自动保存
     */
    startAutoSave() {
        this.stopAutoSave();
        this._autoSaveTimer = setInterval(() => {
            this.save();
        }, AUTO_SAVE_INTERVAL);
        // 页面隐藏时自动暂停
        this._visibilityHandler = () => {
            if (document.hidden) {
                this.pause();
            }
        };
        document.addEventListener('visibilitychange', this._visibilityHandler);
        // 即时保存一次
        this.save();
    }

    /**
     * 停止自动保存
     */
    stopAutoSave() {
        if (this._autoSaveTimer) {
            clearInterval(this._autoSaveTimer);
            this._autoSaveTimer = null;
        }
        if (this._visibilityHandler) {
            document.removeEventListener('visibilitychange', this._visibilityHandler);
            this._visibilityHandler = null;
        }
    }

    /**
     * 更新会话状态
     */
    update(updates) {
        Object.assign(this.state, updates);
    }

    /**
     * 记录答案
     */
    recordAnswer(questionIndex, isCorrect, reactionTime) {
        this.state.answers.push({
            index: questionIndex,
            correct: isCorrect,
            rt: reactionTime,
            timestamp: Date.now()
        });
        if (isCorrect) this.state.correct++;
        this.state.currentQuestion = questionIndex + 1;
    }

    /**
     * 暂停测评
     */
    pause() {
        if (this.state.isPaused) return;
        this.state.isPaused = true;
        this.state.pausedAt = Date.now();
        this.save();
        this._pauseListeners.forEach(fn => fn());
    }

    /**
     * 恢复测评
     */
    resume() {
        if (!this.state.isPaused) return;
        const pauseDuration = Date.now() - (this.state.pausedAt || Date.now());
        this.state.elapsedTime += pauseDuration;
        this.state.isPaused = false;
        this.state.pausedAt = null;
        this.save();
        this._resumeListeners.forEach(fn => fn());
    }

    /**
     * 注册暂停回调
     */
    onPause(fn) {
        this._pauseListeners.push(fn);
    }

    /**
     * 注册恢复回调
     */
    onResume(fn) {
        this._resumeListeners.push(fn);
    }

    /**
     * 保存到 localStorage
     */
    save() {
        try {
            this.state.lastSavedAt = Date.now();
            localStorage.setItem(this.sessionKey, JSON.stringify(this.state));
        } catch (e) {
            console.warn('测试会话保存失败:', e.message);
        }
    }

    /**
     * 从 localStorage 恢复
     * @returns {object|null} 已保存的状态，如果没有则返回 null
     */
    static restore(dimension, subIndex) {
        const key = `${SESSION_KEY_PREFIX}${dimension}_${subIndex}`;
        try {
            const data = localStorage.getItem(key);
            if (!data) return null;
            const state = JSON.parse(data);
            // 超过1小时的会话视为过期
            if (state.lastSavedAt && Date.now() - state.lastSavedAt > 3600000) {
                localStorage.removeItem(key);
                return null;
            }
            return state;
        } catch (e) {
            return null;
        }
    }

    /**
     * 清除已保存的会话
     */
    clear() {
        this.stopAutoSave();
        try {
            localStorage.removeItem(this.sessionKey);
        } catch (e) { /* ignore */ }
    }

    /**
     * 检查是否有可恢复的会话
     */
    static hasSession(dimension, subIndex) {
        return TestSession.restore(dimension, subIndex) !== null;
    }

    /**
     * 清除指定维度的所有会话
     */
    static clearDimension(dimension) {
        for (let i = 0; i < 3; i++) {
            const key = `${SESSION_KEY_PREFIX}${dimension}_${i}`;
            try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
        }
    }

    /**
     * 清除所有会话
     */
    static clearAll() {
        const dims = ['attention', 'memory', 'comprehension', 'execution'];
        dims.forEach(d => TestSession.clearDimension(d));
    }

    /**
     * 销毁会话（完成测试时调用）
     */
    destroy() {
        this.clear();
    }
}

/**
 * 暂停遮罩 UI 组件
 * 在测试暂停时显示恢复按钮
 */
export function showPauseOverlay(session, onResume) {
    // 移除已有遮罩
    const existing = document.getElementById('pause-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'pause-overlay';
    overlay.innerHTML = `
        <div style="
            position: fixed; inset: 0;
            background: rgba(0,0,0,0.7);
            display: flex; align-items: center; justify-content: center;
            z-index: 9999;
            backdrop-filter: blur(8px);
        ">
            <div style="
                background: var(--bg-card, #fff);
                border-radius: 24px;
                padding: 48px 40px;
                text-align: center;
                max-width: 400px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                animation: scaleIn 0.3s ease;
            ">
                <div style="font-size: 3.5rem; margin-bottom: 16px;">⏸️</div>
                <div style="font-size: 1.3rem; font-weight: 800; margin-bottom: 8px; font-family: var(--font-display, inherit);">
                    测评已暂停
                </div>
                <div style="font-size: 0.9rem; color: var(--text-secondary, #666); margin-bottom: 24px; line-height: 1.6;">
                    你的进度已自动保存<br/>
                    点击下方按钮继续测评
                </div>
                <button id="btn-resume-test" style="
                    background: linear-gradient(135deg, #6C5CE7, #A29BFE);
                    color: white;
                    border: none;
                    padding: 14px 40px;
                    border-radius: 14px;
                    font-size: 1rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: transform 0.2s;
                ">
                    ▶️ 继续测评
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('btn-resume-test').addEventListener('click', () => {
        overlay.remove();
        session.resume();
        if (onResume) onResume();
    });
}

/**
 * 恢复确认弹窗
 * 询问是否从上次中断处继续
 */
export function showResumeConfirm(savedState) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.id = 'resume-confirm';
        const savedTime = new Date(savedState.lastSavedAt).toLocaleString('zh-CN');
        const progress = `${savedState.currentQuestion}/${savedState.total || '?'}`;

        overlay.innerHTML = `
            <div style="
                position: fixed; inset: 0;
                background: rgba(0,0,0,0.6);
                display: flex; align-items: center; justify-content: center;
                z-index: 9999;
                backdrop-filter: blur(6px);
            ">
                <div style="
                    background: var(--bg-card, #fff);
                    border-radius: 24px;
                    padding: 40px 36px;
                    text-align: center;
                    max-width: 420px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    animation: scaleIn 0.3s ease;
                ">
                    <div style="font-size: 3rem; margin-bottom: 12px;">💾</div>
                    <div style="font-size: 1.2rem; font-weight: 800; margin-bottom: 8px; font-family: var(--font-display, inherit);">
                        检测到未完成的测评
                    </div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary, #666); margin-bottom: 20px; line-height: 1.7;">
                        上次进度：第 ${progress} 题<br/>
                        保存时间：${savedTime}
                    </div>
                    <div style="display: flex; gap: 12px; justify-content: center;">
                        <button id="btn-resume-yes" style="
                            background: linear-gradient(135deg, #6C5CE7, #A29BFE);
                            color: white; border: none; padding: 12px 28px;
                            border-radius: 12px; font-weight: 700; cursor: pointer;
                        ">继续上次</button>
                        <button id="btn-resume-no" style="
                            background: var(--bg-main, #f5f5f5);
                            color: var(--text, #333); border: none; padding: 12px 28px;
                            border-radius: 12px; font-weight: 700; cursor: pointer;
                        ">重新开始</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('btn-resume-yes').addEventListener('click', () => {
            overlay.remove();
            resolve(true);
        });
        document.getElementById('btn-resume-no').addEventListener('click', () => {
            overlay.remove();
            resolve(false);
        });
    });
}
