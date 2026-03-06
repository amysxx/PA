/**
 * PDF 报告生成器
 * 使用 html2canvas + jsPDF 生成所见即所得的报告
 */
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

        // 1. 智能分页处理
        // A4 纸比例，假设宽度为 1, 高度约为 1.414
        // 在 html2canvas 中，我们需要模拟 A4 纸的高度
        // 这里的 strategy 不是预先计算 pixel，而是根据当前宽度的比例计算

        const originalWidth = elementToPrint.scrollWidth;
        // jsPDF A4 width is 210mm. We use this to calculate the equivalent height in pixels
        // based on the element's width.
        const a4Ratio = 297 / 210;
        const pageHeightInPixels = originalWidth * a4Ratio;

        // 备份原始样式，以便恢复
        const originalStyles = [];
        const spacers = [];

        // 遍历一级子元素，计算累积高度
        const children = Array.from(elementToPrint.children);
        let accumulatedHeight = 0;

        // 顶部 padding 也要算入
        const computedStyle = window.getComputedStyle(elementToPrint);
        accumulatedHeight += parseFloat(computedStyle.paddingTop) || 0;

        children.forEach(child => {
            // 跳过忽略的元素 (如 navbar 等，如果有 data-html2canvas-ignore)
            if (child.hasAttribute('data-html2canvas-ignore') || child.style.display === 'none') return;

            const childHeight = child.offsetHeight;
            const childStyle = window.getComputedStyle(child);
            const marginTop = parseFloat(childStyle.marginTop) || 0;
            const marginBottom = parseFloat(childStyle.marginBottom) || 0;
            const totalChildHeight = childHeight + marginTop + marginBottom;

            // 检查当前元素是否跨越分页线
            // 当前元素的起始位置
            const currentStart = accumulatedHeight;
            // 当前元素的结束位置
            const currentEnd = accumulatedHeight + totalChildHeight;

            // 所在的页码 (0-indexed)
            const startPage = Math.floor(currentStart / pageHeightInPixels);
            const endPage = Math.floor(currentEnd / pageHeightInPixels);

            // 如果跨页了，且元素本身高度小于一页（避免大元素无限循环），则强制推到下一页
            if (startPage !== endPage && totalChildHeight < pageHeightInPixels) {
                // 计算需要增加的 margin-top
                // 目标位置是下一页的起始位置
                const nextPageStart = (startPage + 1) * pageHeightInPixels;
                const spacerHeight = nextPageStart - currentStart;

                // 记录原始样式以便恢复
                originalStyles.push({ element: child, originalMarginTop: child.style.marginTop });

                // 设置新的 margin-top (叠加原有的)
                child.style.marginTop = `${marginTop + spacerHeight}px`;

                // 更新累积高度：加上 spacer 和 元素高度
                accumulatedHeight += spacerHeight + totalChildHeight;
            } else {
                accumulatedHeight += totalChildHeight;
            }
        });

        // 2. 生成 Canvas
        const canvas = await html2canvas(elementToPrint, {
            scale: 2, // 提高清晰度
            useCORS: true,
            logging: false,
            windowWidth: elementToPrint.scrollWidth,
            windowHeight: elementToPrint.scrollHeight // 使用新的高度
        });

        // 3. 恢复样式
        originalStyles.forEach(item => {
            item.element.style.marginTop = item.originalMarginTop;
        });

        const contentWidth = canvas.width;
        const contentHeight = canvas.height;

        // A4 尺寸 (mm)
        const pdfWidth = 210;
        const pdfHeight = 297;

        const margin = 10; // PDF 页边距
        const imgWidth = pdfWidth - (margin * 2);
        const imgHeight = (contentHeight * imgWidth) / contentWidth;

        const doc = new jsPDF('p', 'mm', 'a4');

        let heightLeft = imgHeight;
        let position = 0;

        const pageData = canvas.toDataURL('image/jpeg', 0.95);

        // 第一页
        doc.addImage(pageData, 'JPEG', margin, margin, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - margin * 2);

        // 后续页
        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            doc.addPage();
            // 调整 position 以显示图片的下一部分
            // 注意：addImage 的 y 参数如果是负数，相当于把图片向上移动，从而露出下面的部分
            // 我们需要计算准确的偏移量。
            // 每一页显示的图片高度由 PDF 页面高度决定 (减去 margin)
            const pageContentHeight = pdfHeight - margin * 2;

            // 当前页应该显示的图片区域的顶部在整个图片中的位置
            // 第一页显示了 0 ~ pageContentHeight
            // 第二页应该显示 pageContentHeight ~ 2 * pageContentHeight
            // addImage 的 y 坐标应该是: margin - (当前页数 * pageContentHeight)

            const currentPage = doc.internal.getNumberOfPages();
            const yOffset = margin - ((currentPage - 1) * pageContentHeight);

            doc.addImage(pageData, 'JPEG', margin, yOffset, imgWidth, imgHeight);
            heightLeft -= pageContentHeight;
        }

        const fileName = `认知测评报告_${userName}_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.pdf`;
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

