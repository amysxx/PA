/**
 * PDF 报告生成器
 * 使用 html2canvas + jsPDF 生成所见即所得的报告
 */
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ANTI_COUNTERFEIT_LINES, APP_VERSION } from '../constants/appInfo.js';

function getRowInkScore(pixelData, width, y, sampleStep) {
    let ink = 0;
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x += sampleStep) {
        const idx = rowOffset + x * 4;
        const alpha = pixelData[idx + 3];
        if (alpha < 16) continue;
        const brightness = (pixelData[idx] + pixelData[idx + 1] + pixelData[idx + 2]) / 3;
        if (brightness < 247) ink++;
    }
    return ink;
}

function findNaturalBreakY(pixelData, width, height, currentTop, idealBottom, searchRange) {
    const minY = Math.max(currentTop + 80, Math.floor(idealBottom - searchRange));
    const maxY = Math.min(height - 1, Math.floor(idealBottom + searchRange));
    if (minY >= maxY) return Math.min(height, Math.max(currentTop + 1, Math.floor(idealBottom)));

    const sampleStep = Math.max(6, Math.floor(width / 120));
    let bestY = Math.floor(idealBottom);
    let bestScore = Number.POSITIVE_INFINITY;

    for (let y = minY; y <= maxY; y++) {
        const ink = getRowInkScore(pixelData, width, y, sampleStep);
        const distancePenalty = Math.abs(y - idealBottom) * 0.045;
        const totalScore = ink + distancePenalty;
        if (totalScore < bestScore) {
            bestScore = totalScore;
            bestY = y;
        }
    }

    return bestY;
}

/**
 * 生成单个用户的测评报告 PDF
 * @param {HTMLElement} elementToPrint - 需要导出的 DOM 元素
 * @param {string} userName - 用户名
 */
export async function generateUserReportPDF(elementToPrint, userName) {
    if (!elementToPrint) {
        console.error('未找到报告元素');
        return;
    }

    try {
        // 显示加载提示
        document.body.style.cursor = 'wait';
        // 等字体加载完成，避免首屏文字丢失或空白
        if (document.fonts?.ready) {
            await document.fonts.ready;
        }

        const canvas = await html2canvas(elementToPrint, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            windowWidth: elementToPrint.scrollWidth,
            windowHeight: elementToPrint.scrollHeight,
            scrollX: 0,
            scrollY: -window.scrollY,
            onclone: clonedDocument => {
                const clonedBody = clonedDocument.body;
                clonedBody.classList.add('pdf-export-mode');
            },
        });

        const pdfWidth = 210;
        const pdfHeight = 297;
        const margin = 10;
        const contentWidthMm = pdfWidth - margin * 2;
        const contentHeightMm = pdfHeight - margin * 2;

        const pxPerMm = canvas.width / contentWidthMm;
        const pageHeightPx = Math.max(1, contentHeightMm * pxPerMm);
        const seamOverlapPx = 1;
        const searchRangePx = Math.min(260, Math.floor(pageHeightPx * 0.24));
        const canvasCtx = canvas.getContext('2d');
        const pixelData = canvasCtx ? canvasCtx.getImageData(0, 0, canvas.width, canvas.height).data : null;

        const doc = new jsPDF('p', 'mm', 'a4');
        let renderedPx = 0;
        let pageIndex = 0;

        while (renderedPx < canvas.height - 0.5) {
            const idealBottom = renderedPx + pageHeightPx;
            let cutBottom = Math.min(canvas.height, Math.ceil(idealBottom));

            if (pixelData && idealBottom < canvas.height - 10) {
                cutBottom = findNaturalBreakY(pixelData, canvas.width, canvas.height, Math.floor(renderedPx), idealBottom, searchRangePx);
            }
            cutBottom = Math.max(Math.floor(renderedPx + pageHeightPx * 0.62), cutBottom);
            cutBottom = Math.min(canvas.height, cutBottom);

            const sliceTop = Math.max(0, Math.floor(renderedPx - (pageIndex > 0 ? seamOverlapPx : 0)));
            const sliceBottom = Math.max(sliceTop + 1, Math.ceil(cutBottom));
            const sliceHeight = Math.max(1, sliceBottom - sliceTop);
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = canvas.width;
            pageCanvas.height = sliceHeight;

            const pageCtx = pageCanvas.getContext('2d');
            if (!pageCtx) break;

            pageCtx.fillStyle = '#ffffff';
            pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            pageCtx.drawImage(
                canvas,
                0,
                sliceTop,
                canvas.width,
                sliceHeight,
                0,
                0,
                canvas.width,
                sliceHeight,
            );

            const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95);
            const sliceHeightMm = sliceHeight / pxPerMm;

            if (pageIndex > 0) {
                doc.addPage();
            }
            doc.addImage(pageImgData, 'JPEG', margin, margin, contentWidthMm, sliceHeightMm);

            renderedPx = cutBottom;
            pageIndex += 1;
        }

        const fileName = `认知测评报告_${userName}_${APP_VERSION}_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.pdf`;
        doc.save(fileName);

    } catch (error) {
        console.error('PDF 生成失败:', error);
        alert('PDF 生成失败，请重试');
    } finally {
        document.body.style.cursor = 'default';
        // 再次确保恢复（防止出错中断导致样式未恢复）
        // 实际应用中可能需要更健壮的恢复机制
    }
}

/**
 * 生成班级统计报告 PDF（管理员用）
 * 动态创建表格 DOM，渲染后截图
 */
export async function generateClassReportPDF(usersData) {
    // 1. 动态创建隐藏的容器和表格
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '800px'; // A4 宽度适中
    container.style.background = '#fff';
    container.style.padding = '40px';
    container.style.fontFamily = 'Helvetica, Arial, sans-serif'; // 使用通用字体，浏览器会渲染中文

    const dateStr = new Date().toLocaleDateString('zh-CN');

    let tableHtml = `
        <h1 style="text-align:center; margin-bottom:10px;">班级认知测评统计报告</h1>
        <p style="text-align:center; color:#666; margin-bottom:30px;">生成日期：${dateStr} · 参与人数：${usersData.length}</p>
        <div style="margin:0 0 18px; padding:10px 14px; border:1px solid #d9d9d9; border-radius:8px; color:#4a4a4a; line-height:1.5;">
          ${ANTI_COUNTERFEIT_LINES.map(line => `<div style="font-size:12px;">${line}</div>`).join('')}
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:12px;">
            <thead>
                <tr style="background:#6C5CE7; color:#fff;">
                    <th style="padding:10px; border:1px solid #ccc;">姓名</th>
                    <th style="padding:10px; border:1px solid #ccc;">年龄</th>
                    <th style="padding:10px; border:1px solid #ccc;">性别</th>
                    <th style="padding:10px; border:1px solid #ccc;">计划</th>
                    <th style="padding:10px; border:1px solid #ccc;">注意</th>
                    <th style="padding:10px; border:1px solid #ccc;">同时</th>
                    <th style="padding:10px; border:1px solid #ccc;">继时</th>
                    <th style="padding:10px; border:1px solid #ccc;">总分</th>
                </tr>
            </thead>
            <tbody>
    `;

    usersData.forEach((u, index) => {
        const results = u.testResults || {};
        const dims = ['attention', 'memory', 'comprehension', 'execution'];
        const scores = dims.map(d => results[d]?.totalScore || 0);
        const total = scores.reduce((a, b) => a + b, 0);

        tableHtml += `
            <tr style="background:${index % 2 === 0 ? '#fff' : '#f9f9f9'};">
                <td style="padding:8px; border:1px solid #ccc; text-align:center;">${u.user?.name || '未知'}</td>
                <td style="padding:8px; border:1px solid #ccc; text-align:center;">${u.user?.age || '-'}</td>
                <td style="padding:8px; border:1px solid #ccc; text-align:center;">${u.user?.gender || '-'}</td>
                <td style="padding:8px; border:1px solid #ccc; text-align:center;">${scores[0]}</td>
                <td style="padding:8px; border:1px solid #ccc; text-align:center;">${scores[1]}</td>
                <td style="padding:8px; border:1px solid #ccc; text-align:center;">${scores[2]}</td>
                <td style="padding:8px; border:1px solid #ccc; text-align:center;">${scores[3]}</td>
                <td style="padding:8px; border:1px solid #ccc; text-align:center; font-weight:bold;">${total}</td>
            </tr>
        `;
    });

    tableHtml += `
            </tbody>
        </table>
    `;

    container.innerHTML = tableHtml;
    document.body.appendChild(container);

    try {
        await generateUserReportPDF(container, `班级统计_${dateStr.replace(/\//g, '-')}`);
    } finally {
        document.body.removeChild(container);
    }
}

