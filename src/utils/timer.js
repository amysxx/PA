/**
 * 计时器工具类
 */
export class Timer {
    constructor(duration, onTick, onEnd) {
        this.duration = duration;
        this.remaining = duration;
        this.onTick = onTick;
        this.onEnd = onEnd;
        this.interval = null;
        this.running = false;
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.interval = setInterval(() => {
            this.remaining--;
            if (this.onTick) this.onTick(this.remaining);
            if (this.remaining <= 0) {
                this.stop();
                if (this.onEnd) this.onEnd();
            }
        }, 1000);
    }

    stop() {
        this.running = false;
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    reset() {
        this.stop();
        this.remaining = this.duration;
    }

    getFormatted() {
        const m = Math.floor(this.remaining / 60);
        const s = this.remaining % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
}

/**
 * 反应时间记录器
 */
export class ReactionTimer {
    constructor() {
        this.startTime = null;
        this.reactions = [];
    }

    start() {
        this.startTime = performance.now();
    }

    record() {
        if (!this.startTime) return 0;
        const rt = performance.now() - this.startTime;
        this.reactions.push(rt);
        this.startTime = performance.now();
        return rt;
    }

    getAverage() {
        if (this.reactions.length === 0) return 0;
        return this.reactions.reduce((a, b) => a + b, 0) / this.reactions.length;
    }

    reset() {
        this.startTime = null;
        this.reactions = [];
    }
}
