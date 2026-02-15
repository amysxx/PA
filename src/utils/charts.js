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
