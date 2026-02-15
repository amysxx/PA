/**
 * 数据导出工具
 * 支持 CSV、Excel、JSON 格式导出
 */
import * as XLSX from 'xlsx';
import { DIMENSION_NAMES } from './normativeData.js';
import { getTestHistory } from './dataHistory.js';

/**
 * 导出单个用户数据为 CSV
 */
export function exportUserToCSV(userData, testResults) {
    const dims = ['planning', 'attention', 'simultaneous', 'successive'];
    const rows = [
        ['姓名', '年龄', '性别', '年龄组', '测评日期'],
        [userData.name, userData.age, userData.gender, userData.ageGroup, new Date().toLocaleDateString('zh-CN')],
        [],
        ['维度', '得分', '子测试1', '子测试2', '子测试3']
    ];

    dims.forEach(dim => {
        const r = testResults[dim] || {};
        const scores = r.scores || [];
        rows.push([
            DIMENSION_NAMES[dim],
            r.totalScore || 0,
            scores[0] || 0,
            scores[1] || 0,
            scores[2] || 0
        ]);
    });

    const totalScore = dims.reduce((sum, d) => sum + (testResults[d]?.totalScore || 0), 0);
    rows.push([]);
    rows.push(['总分', totalScore]);

    const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    downloadFile(csv, `测评数据_${userData.name}.csv`, 'text/csv;charset=utf-8');
}

/**
 * 导出多用户数据为 Excel（管理员用）
 */
export function exportUsersToExcel(usersData) {
    const dims = ['planning', 'attention', 'simultaneous', 'successive'];

    // 汇总 sheet
    const summaryData = [
        ['姓名', '年龄', '性别', '年龄组', '计划能力', '注意过程', '同时性加工', '继时性加工', '总分', '测评状态']
    ];

    usersData.forEach(u => {
        const results = u.testResults || {};
        const scores = dims.map(d => results[d]?.totalScore || 0);
        const total = scores.reduce((a, b) => a + b, 0);
        const allDone = dims.every(d => u.testProgress?.[d]?.completed);

        summaryData.push([
            u.user?.name || '未知',
            u.user?.age || '',
            u.user?.gender || '',
            u.user?.ageGroup || '',
            scores[0], scores[1], scores[2], scores[3],
            total,
            allDone ? '已完成' : '进行中'
        ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(summaryData);

    // 设置列宽
    ws['!cols'] = [
        { wch: 12 }, { wch: 6 }, { wch: 6 }, { wch: 14 },
        { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
        { wch: 8 }, { wch: 10 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, '汇总');

    // 每个用户详细数据 sheet
    usersData.forEach(u => {
        if (!u.user?.name) return;
        const results = u.testResults || {};
        const detailData = [
            ['维度', '得分', '子测试1', '子测试2', '子测试3']
        ];

        dims.forEach(d => {
            const r = results[d] || {};
            const scores = r.scores || [];
            detailData.push([
                DIMENSION_NAMES[d],
                r.totalScore || 0,
                scores[0] || 0,
                scores[1] || 0,
                scores[2] || 0
            ]);
        });

        const wsd = XLSX.utils.aoa_to_sheet(detailData);
        // 截断名字避免 Sheet 名太长
        const sheetName = (u.user.name || '未知').substring(0, 20);
        XLSX.utils.book_append_sheet(wb, wsd, sheetName);
    });

    XLSX.writeFile(wb, `测评数据汇总_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`);
}

/**
 * 导出用户历史数据为 Excel
 */
export function exportHistoryToExcel(userId, userName) {
    const history = getTestHistory(userId);
    if (history.length === 0) return;

    const dims = ['planning', 'attention', 'simultaneous', 'successive'];
    const headerRow = ['序号', '日期', '计划能力', '注意过程', '同时性加工', '继时性加工', '总分', '综合百分位'];
    const data = [headerRow];

    history.forEach((record, i) => {
        const date = new Date(record.timestamp).toLocaleDateString('zh-CN');
        const total = record.scores.raw.reduce((a, b) => a + b, 0);
        data.push([
            i + 1,
            date,
            record.scores.raw[0],
            record.scores.raw[1],
            record.scores.raw[2],
            record.scores.raw[3],
            total,
            record.scores.overall?.avgPercentile ? Math.round(record.scores.overall.avgPercentile) + '%' : '-'
        ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
        { wch: 6 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
        { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, '历史记录');
    XLSX.writeFile(wb, `测评历史_${userName || '用户'}.xlsx`);
}

/**
 * 导出原始 JSON 数据
 */
export function exportToJSON(data, fileName) {
    const json = JSON.stringify(data, null, 2);
    downloadFile(json, fileName || 'data.json', 'application/json');
}

// ---- 辅助函数 ----

function downloadFile(content, fileName, mimeType) {
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: `${mimeType}` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
