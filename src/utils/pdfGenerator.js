/**
 * PDF 报告生成器
 * 使用 jsPDF 生成专业的测评报告 PDF
 */
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { DIMENSION_NAMES } from './normativeData.js';
import { getScoreLevel, getDimensionLevel, getSuggestions } from './scoring.js';

/**
 * 生成单个用户的测评报告 PDF
 */
export function generateUserReportPDF(userData, testResults, standardizedScores) {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // 注册中文字体支持（使用内置字体）
    doc.setFont('helvetica');

    // ===== 标题 =====
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('认知力测评报告', pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('智趣认知乐园 - 基于 PASS 理论', pageWidth / 2, y, { align: 'center' });
    y += 15;

    // ===== 基本信息 =====
    doc.setFontSize(10);
    const userInfo = [
        `姓名：${userData.name}`,
        `年龄：${userData.age}岁`,
        `性别：${userData.gender}`,
        `年龄组：${userData.ageGroup}`,
        `测评日期：${new Date().toLocaleDateString('zh-CN')}`
    ];
    userInfo.forEach(info => {
        doc.text(info, 20, y);
        y += 6;
    });
    y += 5;

    // ===== 分割线 =====
    doc.setLineWidth(0.5);
    doc.setDrawColor(108, 92, 231);
    doc.line(20, y, pageWidth - 20, y);
    y += 10;

    // ===== 各维度得分表格 =====
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('四维度认知评估', 20, y);
    y += 8;

    const dims = ['planning', 'attention', 'simultaneous', 'successive'];
    const scores = dims.map(d => testResults[d]?.totalScore || 0);
    const totalScore = scores.reduce((a, b) => a + b, 0);
    const avgScore = Math.round(totalScore / 4);

    const tableData = dims.map((dim, i) => {
        const s = standardizedScores?.[dim];
        return [
            DIMENSION_NAMES[dim],
            scores[i].toString(),
            s ? `${Math.round(s.percentile)}%` : '-',
            s ? s.t.toString() : '-',
            s ? `${s.rating.label}` : '-'
        ];
    });

    doc.autoTable({
        startY: y,
        head: [['维度', '原始分', '百分位', 'T分数', '评级']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [108, 92, 231], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
            0: { fontStyle: 'bold' },
            1: { halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'center' },
            4: { halign: 'center' }
        }
    });

    y = doc.lastAutoTable.finalY + 10;

    // ===== 综合评分 =====
    const overallLevel = getScoreLevel(avgScore);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`综合评分：${avgScore}分 （${overallLevel.level}）`, 20, y);
    y += 8;

    if (standardizedScores?.overall) {
        doc.setFont('helvetica', 'normal');
        doc.text(`综合百分位：${Math.round(standardizedScores.overall.avgPercentile)}% （${standardizedScores.overall.rating.label}）`, 20, y);
        y += 10;
    }

    // ===== 建议 =====
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('个性化指导建议', 20, y);
    y += 8;

    dims.forEach((dim, i) => {
        const suggestions = getSuggestions(dim, scores[i]);
        if (suggestions.length > 0) {
            if (y > 260) {
                doc.addPage();
                y = 20;
            }
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(`${DIMENSION_NAMES[dim]}：`, 20, y);
            y += 6;

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            suggestions.forEach(s => {
                if (y > 270) {
                    doc.addPage();
                    y = 20;
                }
                const lines = doc.splitTextToSize(`• ${s}`, pageWidth - 50);
                doc.text(lines, 25, y);
                y += lines.length * 5;
            });
            y += 3;
        }
    });

    // ===== 底部声明 =====
    if (y > 260) {
        doc.addPage();
        y = 20;
    }
    y += 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150);
    doc.text('本测评基于 PASS 认知理论，结果仅供参考。如有进一步需求，建议咨询专业心理咨询师。', pageWidth / 2, y, { align: 'center' });

    // 保存
    const fileName = `认知测评报告_${userData.name}_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
    return fileName;
}

/**
 * 生成班级统计报告 PDF（管理员用）
 */
export function generateClassReportPDF(usersData) {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('班级认知测评统计报告', pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`生成日期：${new Date().toLocaleDateString('zh-CN')}`, pageWidth / 2, y, { align: 'center' });
    doc.text(`参与人数：${usersData.length}`, pageWidth / 2, y + 6, { align: 'center' });
    y += 20;

    // 汇总表格
    const tableData = usersData.map(u => {
        const results = u.testResults || {};
        const dims = ['planning', 'attention', 'simultaneous', 'successive'];
        const scores = dims.map(d => results[d]?.totalScore || 0);
        const total = scores.reduce((a, b) => a + b, 0);
        return [
            u.user?.name || '未知',
            u.user?.age?.toString() || '-',
            u.user?.gender || '-',
            scores[0].toString(),
            scores[1].toString(),
            scores[2].toString(),
            scores[3].toString(),
            total.toString()
        ];
    });

    doc.autoTable({
        startY: y,
        head: [['姓名', '年龄', '性别', '计划', '注意', '同时', '继时', '总分']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [108, 92, 231], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
            3: { halign: 'center' },
            4: { halign: 'center' },
            5: { halign: 'center' },
            6: { halign: 'center' },
            7: { halign: 'center', fontStyle: 'bold' }
        }
    });

    const fileName = `班级测评统计_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
    return fileName;
}
