/**
 * Canvas 图表绘制工具
 */

/**
 * 绘制雷达图
 */
export function drawRadarChart(canvas, data, options = {}) {
    const {
        labels = ['计划能力', '注意过程', '同时性加工', '继时性加工'],
        maxValue = 100,
        size = 300,
        colors = ['#6C5CE7', '#E17055', '#00CEC9', '#FD79A8'],
        bgColor = '#F8F6FF',
        lineColor = '#E8E5F3',
        fillColor = 'rgba(108, 92, 231, 0.2)',
        strokeColor = '#6C5CE7'
    } = options;

    canvas.width = size * 2;
    canvas.height = size * 2;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    const center = size / 2;
    const radius = size / 2 - 50;
    const sides = data.length;
    const angleStep = (Math.PI * 2) / sides;
    const startAngle = -Math.PI / 2;

    // 绘制背景网格
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
    for (let ring = 1; ring <= 5; ring++) {
        const r = (radius * ring) / 5;
        ctx.beginPath();
        for (let i = 0; i <= sides; i++) {
            const angle = startAngle + i * angleStep;
            const x = center + r * Math.cos(angle);
            const y = center + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
    }

    // 绘制轴线
    for (let i = 0; i < sides; i++) {
        const angle = startAngle + i * angleStep;
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.lineTo(
            center + radius * Math.cos(angle),
            center + radius * Math.sin(angle)
        );
        ctx.stroke();
    }

    // 绘制数据区域
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
        const angle = startAngle + i * angleStep;
        const val = (data[i] / maxValue) * radius;
        const x = center + val * Math.cos(angle);
        const y = center + val * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 绘制数据点
    for (let i = 0; i < sides; i++) {
        const angle = startAngle + i * angleStep;
        const val = (data[i] / maxValue) * radius;
        const x = center + val * Math.cos(angle);
        const y = center + val * Math.sin(angle);

        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = colors[i] || strokeColor;
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // 绘制标签和分数
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < sides; i++) {
        const angle = startAngle + i * angleStep;
        const labelR = radius + 32;
        const x = center + labelR * Math.cos(angle);
        const y = center + labelR * Math.sin(angle);

        ctx.font = 'bold 13px "Noto Sans SC", sans-serif';
        ctx.fillStyle = '#2D3436';
        ctx.fillText(labels[i], x, y - 8);

        ctx.font = 'bold 14px "Nunito", sans-serif';
        ctx.fillStyle = colors[i] || strokeColor;
        ctx.fillText(data[i] + '分', x, y + 10);
    }

    // 刻度值
    ctx.font = '10px "Nunito", sans-serif';
    ctx.fillStyle = '#B2BEC3';
    ctx.textAlign = 'left';
    for (let ring = 1; ring <= 5; ring++) {
        const r = (radius * ring) / 5;
        ctx.fillText(
            Math.round((maxValue * ring) / 5).toString(),
            center + 4,
            center - r - 2
        );
    }
}

/**
 * 绘制柱状图
 */
export function drawBarChart(canvas, data, labels, options = {}) {
    const {
        width = 400,
        height = 200,
        colors = ['#6C5CE7', '#E17055', '#00CEC9', '#FD79A8'],
        maxValue = 100
    } = options;

    canvas.width = width * 2;
    canvas.height = height * 2;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    const padding = 40;
    const barWidth = (width - padding * 2) / data.length - 20;
    const chartHeight = height - padding * 2;

    // 背景线
    ctx.strokeStyle = '#E8E5F3';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding + (chartHeight * i) / 4;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }

    // 柱子
    data.forEach((val, i) => {
        const x = padding + i * (barWidth + 20) + 10;
        const barHeight = (val / maxValue) * chartHeight;
        const y = height - padding - barHeight;

        // 绘制圆角柱子
        const r = 6;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + barWidth - r, y);
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + r);
        ctx.lineTo(x + barWidth, height - padding);
        ctx.lineTo(x, height - padding);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();

        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();

        // 数值
        ctx.font = 'bold 12px "Nunito", sans-serif';
        ctx.fillStyle = colors[i % colors.length];
        ctx.textAlign = 'center';
        ctx.fillText(val.toString(), x + barWidth / 2, y - 8);

        // 标签
        ctx.font = '11px "Noto Sans SC", sans-serif';
        ctx.fillStyle = '#636E72';
        ctx.fillText(labels[i] || '', x + barWidth / 2, height - padding + 18);
    });
}

/**
 * 绘制折线图（用于趋势追踪）
 */
export function drawLineChart(canvas, datasets, options = {}) {
    const {
        width = 400,
        height = 200,
        maxValue = 100,
        showDots = true,
        showLabels = true
    } = options;

    canvas.width = width * 2;
    canvas.height = height * 2;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    const padding = { top: 20, right: 20, bottom: 35, left: 40 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // 背景网格线
    ctx.strokeStyle = '#E8E5F3';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartH * i) / 4;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        ctx.font = '9px "Nunito", sans-serif';
        ctx.fillStyle = '#B2BEC3';
        ctx.textAlign = 'right';
        ctx.fillText(Math.round(maxValue - (maxValue * i) / 4).toString(), padding.left - 5, y + 3);
    }

    // 绘制每条数据线
    datasets.forEach(ds => {
        const { data, color = '#6C5CE7', labels: lbs = [] } = ds;
        if (data.length < 2) return;

        const step = chartW / (data.length - 1);

        // 绘制线
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        data.forEach((val, i) => {
            const x = padding.left + i * step;
            const y = padding.top + chartH - (val / maxValue) * chartH;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // 绘制填充渐变
        ctx.beginPath();
        data.forEach((val, i) => {
            const x = padding.left + i * step;
            const y = padding.top + chartH - (val / maxValue) * chartH;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.lineTo(padding.left + (data.length - 1) * step, padding.top + chartH);
        ctx.lineTo(padding.left, padding.top + chartH);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
        grad.addColorStop(0, color + '30');
        grad.addColorStop(1, color + '05');
        ctx.fillStyle = grad;
        ctx.fill();

        // 绘制数据点
        if (showDots) {
            data.forEach((val, i) => {
                const x = padding.left + i * step;
                const y = padding.top + chartH - (val / maxValue) * chartH;
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
            });
        }

        // X轴标签
        if (showLabels && lbs.length > 0) {
            ctx.font = '9px "Noto Sans SC", sans-serif';
            ctx.fillStyle = '#636E72';
            ctx.textAlign = 'center';
            lbs.forEach((label, i) => {
                const x = padding.left + i * step;
                ctx.fillText(label, x, height - 8);
            });
        }
    });
}

/**
 * 绘制饼图（用于维度占比）
 */
export function drawPieChart(canvas, data, labels, options = {}) {
    const {
        size = 200,
        colors = ['#6C5CE7', '#E17055', '#00CEC9', '#FD79A8'],
        showLabels = true,
        showPercentage = true
    } = options;

    canvas.width = size * 2;
    canvas.height = size * 2;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    const center = size / 2;
    const radius = size / 2 - 30;
    const total = data.reduce((a, b) => a + b, 0);
    if (total === 0) return;

    let startAngle = -Math.PI / 2;

    data.forEach((val, i) => {
        const sliceAngle = (val / total) * Math.PI * 2;

        // 绘制扇区
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, radius, startAngle, startAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 绘制标签
        if (showLabels && labels && labels[i]) {
            const midAngle = startAngle + sliceAngle / 2;
            const labelR = radius * 0.65;
            const lx = center + labelR * Math.cos(midAngle);
            const ly = center + labelR * Math.sin(midAngle);

            ctx.font = 'bold 10px "Noto Sans SC", sans-serif';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (showPercentage) {
                const pct = Math.round((val / total) * 100);
                ctx.fillText(`${pct}%`, lx, ly);
            }
        }

        startAngle += sliceAngle;
    });

    // 外部标签
    if (showLabels && labels) {
        startAngle = -Math.PI / 2;
        data.forEach((val, i) => {
            const sliceAngle = (val / total) * Math.PI * 2;
            const midAngle = startAngle + sliceAngle / 2;
            const outerR = radius + 18;
            const ox = center + outerR * Math.cos(midAngle);
            const oy = center + outerR * Math.sin(midAngle);

            ctx.font = '10px "Noto Sans SC", sans-serif';
            ctx.fillStyle = colors[i % colors.length];
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(labels[i] || '', ox, oy);
            startAngle += sliceAngle;
        });
    }
}
