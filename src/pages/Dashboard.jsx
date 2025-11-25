import React, { useEffect, useRef, useState } from 'react';
import { Chart } from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { fetchData, doughnutColors, getReportingMonth, sumFCost, getAnnualClaimTotals, getAnnualConq, getAnnualSupplierTotals } from '../utils/dataProcessing';

Chart.register(ChartDataLabels);

const Dashboard = () => {
    const chartRefs = useRef({});
    const [data, setData] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const fetchedData = await fetchData();
                setData(fetchedData);
            } catch (error) {
                console.error("Failed to load data", error);
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        if (!data) return;
        renderCharts(data);
    }, [data]);

    const createOrUpdateChart = (canvasId, type, data, options) => {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (chartRefs.current[canvasId]) {
            chartRefs.current[canvasId].destroy();
        }

        chartRefs.current[canvasId] = new Chart(ctx, { type, data, options });
    };

    const renderCharts = ({ data23y, data24y, data25y }) => {
        const yearMonthLabels = ['2023', '2024', '2025', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // ==== 1. Total number of inspection ====
        const monthlyInspections = Array(15).fill(0);
        monthlyInspections[0] = data23y.filter(r => r['구분'] === '검사').length;
        monthlyInspections[1] = data24y.filter(r => r['구분'] === '검사').length;
        data25y.filter(r => r['구분'] === '검사').forEach(item => {
            const month = getReportingMonth(item['Issue 일자']);
            if (month !== -1) monthlyInspections[month + 3]++;
        });
        monthlyInspections[2] = monthlyInspections.slice(3).reduce((s, c) => s + c, 0);
        const maxInspectionValue = Math.max(...monthlyInspections);

        createOrUpdateChart('totalInspectionsChart', 'bar',
            { labels: yearMonthLabels, datasets: [{ label: '월별 검사 건수', data: monthlyInspections, backgroundColor: '#4C7080' }] },
            { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: maxInspectionValue * 1.15 } }, plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'top', formatter: (v) => v > 0 ? v : null } } }
        );

        // ==== 2. Total number of nonconformities ====
        const monthlyNonconformities = Array(15).fill(0);
        monthlyNonconformities[0] = data23y.filter(r => r['구분'] === '부적합').length;
        monthlyNonconformities[1] = data24y.filter(r => r['구분'] === '부적합').length;
        data25y.filter(r => r['구분'] === '부적합').forEach(item => {
            const month = getReportingMonth(item['Issue 일자']);
            if (month !== -1) monthlyNonconformities[month + 3]++;
        });
        monthlyNonconformities[2] = monthlyNonconformities.slice(3).reduce((s, c) => s + c, 0);
        const maxNonconformityValue = Math.max(...monthlyNonconformities);

        createOrUpdateChart('totalNonconformitiesChart', 'bar',
            { labels: yearMonthLabels, datasets: [{ label: '월별 부적합 건수', data: monthlyNonconformities, backgroundColor: '#F15A22' }] },
            { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: maxNonconformityValue * 1.15 } }, plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'top', formatter: (v) => v > 0 ? v : null } } }
        );

        // ... (Implement other charts similarly)
        // For brevity, I will implement the rest in subsequent steps or full file write.
        // I will write the full file now to be efficient.

        // Customer Claim - GS
        const gsClaimAll = Array(15).fill(0);
        const gsClaimOfficial = Array(15).fill(0);
        const gsClaimUnofficial = Array(15).fill(0);

        const gsTotals23 = getAnnualClaimTotals(data23y, 'GS');
        gsClaimAll[0] = gsTotals23.all; gsClaimOfficial[0] = gsTotals23.official; gsClaimUnofficial[0] = gsTotals23.unofficial;
        const gsTotals24 = getAnnualClaimTotals(data24y, 'GS');
        gsClaimAll[1] = gsTotals24.all; gsClaimOfficial[1] = gsTotals24.official; gsClaimUnofficial[1] = gsTotals24.unofficial;

        data25y.filter(r => r['구분'] === '부적합' && r['제품군'] === 'GS' && r['집계분류(대)'] === '고객').forEach(item => {
            const month = getReportingMonth(item['Issue 일자']);
            if (month !== -1) {
                gsClaimAll[month + 3]++;
                if (item['집계여부'] === 'YES') gsClaimOfficial[month + 3]++;
                else if (item['집계여부'] === 'NO') gsClaimUnofficial[month + 3]++;
            }
        });
        gsClaimAll[2] = gsClaimAll.slice(3).reduce((s, c) => s + c, 0);
        gsClaimOfficial[2] = gsClaimOfficial.slice(3).reduce((s, c) => s + c, 0);
        gsClaimUnofficial[2] = gsClaimUnofficial.slice(3).reduce((s, c) => s + c, 0);

        const maxGSValue = Math.max(...gsClaimAll);
        createOrUpdateChart('customerClaimGSChart', 'bar', {
            labels: yearMonthLabels,
            datasets: [{ label: 'All', data: gsClaimAll, backgroundColor: '#F15A22' }, { label: 'Official', data: gsClaimOfficial, backgroundColor: '#6c757d' }, { label: 'Unofficial', data: gsClaimUnofficial, backgroundColor: '#adb5bd' }]
        }, { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: maxGSValue + Math.ceil(maxGSValue * 0.1) + 1, ticks: { stepSize: 1 } } }, plugins: { legend: { position: 'bottom' }, datalabels: { anchor: 'end', align: 'top', formatter: (v) => v > 0 ? v : null } } });

        // Customer Claim - PTT
        const pttClaimAll = Array(15).fill(0);
        const pttClaimOfficial = Array(15).fill(0);
        const pttClaimUnofficial = Array(15).fill(0);

        const pttTotals23 = getAnnualClaimTotals(data23y, 'PTT');
        pttClaimAll[0] = pttTotals23.all; pttClaimOfficial[0] = pttTotals23.official; pttClaimUnofficial[0] = pttTotals23.unofficial;
        const pttTotals24 = getAnnualClaimTotals(data24y, 'PTT');
        pttClaimAll[1] = pttTotals24.all; pttClaimOfficial[1] = pttTotals24.official; pttClaimUnofficial[1] = pttTotals24.unofficial;

        data25y.filter(r => r['구분'] === '부적합' && r['제품군'] === 'PTT' && r['집계분류(대)'] === '고객').forEach(item => {
            const month = getReportingMonth(item['Issue 일자']);
            if (month !== -1) {
                pttClaimAll[month + 3]++;
                if (item['집계여부'] === 'YES') pttClaimOfficial[month + 3]++;
                else if (item['집계여부'] === 'NO') pttClaimUnofficial[month + 3]++;
            }
        });
        pttClaimAll[2] = pttClaimAll.slice(3).reduce((s, c) => s + c, 0);
        pttClaimOfficial[2] = pttClaimOfficial.slice(3).reduce((s, c) => s + c, 0);
        pttClaimUnofficial[2] = pttClaimUnofficial.slice(3).reduce((s, c) => s + c, 0);

        const maxPTTValue = Math.max(...pttClaimAll);
        createOrUpdateChart('customerClaimPTTChart', 'bar', {
            labels: yearMonthLabels,
            datasets: [{ label: 'All', data: pttClaimAll, backgroundColor: '#F15A22' }, { label: 'Official', data: pttClaimOfficial, backgroundColor: '#6c757d' }, { label: 'Unofficial', data: pttClaimUnofficial, backgroundColor: '#adb5bd' }]
        }, { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: maxPTTValue + 2, ticks: { stepSize: 1 } } }, plugins: { legend: { position: 'bottom' }, datalabels: { anchor: 'end', align: 'top', formatter: (v) => v > 0 ? v : null } } });

        // Analysis Current
        const customerDefects = data25y.filter(r => r['구분'] === '부적합' && r['집계분류(대)'] === '고객');
        const defectCategories = { "Dim's": 0, Missing: 0, Visual: 0, Label: 0, Qty: 0 };
        customerDefects.forEach(r => {
            defectCategories["Dim's"] += (Number(r['치수']) || 0) + (Number(r['조립']) || 0);
            defectCategories.Missing += (Number(r['누락']) || 0);
            defectCategories.Visual += (Number(r['형상']) || 0) + (Number(r['외관']) || 0);
            defectCategories.Label += (Number(r['특성']) || 0);
            defectCategories.Qty += (Number(r['기타']) || 0);
        });
        const totalDefects = Object.values(defectCategories).reduce((s, v) => s + v, 0);
        const defectDataValues = Object.values(defectCategories);
        const maxDefectIndex = defectDataValues.indexOf(Math.max(...defectDataValues));
        const defectOffset = defectDataValues.map((_, i) => i === maxDefectIndex ? 20 : 0);
        createOrUpdateChart('analysisCurrentChart', 'doughnut', { labels: Object.keys(defectCategories), datasets: [{ data: defectDataValues, offset: defectOffset, backgroundColor: doughnutColors }] }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' }, datalabels: { formatter: (v) => { if (totalDefects === 0) return '0%'; return (v / totalDefects * 100).toFixed(1) + '%'; }, color: '#fff' } } });

        // Defect Trend
        const trendLabels = ['Missing', "Dim's", 'Visual', 'Label', 'Qty', 'Sum'];
        const trendData = [defectCategories.Missing, defectCategories["Dim's"], defectCategories.Visual, defectCategories.Label, defectCategories.Qty, totalDefects];
        createOrUpdateChart('analysisDefectTrendChart', 'bar', { labels: trendLabels.slice().reverse(), datasets: [{ label: '수량', data: trendData.slice().reverse(), backgroundColor: '#6c757d' }] }, { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'end', color: 'black', font: { weight: 'bold' }, formatter: (v) => v > 0 ? v.toLocaleString() : null } } });

        // CONQ - GS/PTT
        const monthlyConqGS = Array(15).fill(0);
        const monthlyConqPTT = Array(15).fill(0);

        const conqTotals23 = getAnnualConq(data23y);
        monthlyConqGS[0] = conqTotals23.gs; monthlyConqPTT[0] = conqTotals23.ptt;
        const conqTotals24 = getAnnualConq(data24y);
        monthlyConqGS[1] = conqTotals24.gs; monthlyConqPTT[1] = conqTotals24.ptt;

        data25y.filter(r => r['구분'] === '부적합').forEach(r => {
            const month = getReportingMonth(r['Issue 일자']);
            if (month !== -1) {
                const cost = Number(String(r['F-Cost_합계'] || '0').replace(/,/g, ''));
                if (r['제품군'] === 'GS') monthlyConqGS[month + 3] += cost;
                else if (r['제품군'] === 'PTT') monthlyConqPTT[month + 3] += cost;
            }
        });
        monthlyConqGS[2] = monthlyConqGS.slice(3).reduce((s, c) => s + c, 0);
        monthlyConqPTT[2] = monthlyConqPTT.slice(3).reduce((s, c) => s + c, 0);
        const maxConqValue = Math.max(...monthlyConqGS, ...monthlyConqPTT);

        createOrUpdateChart('conqGSPTTChart', 'bar', {
            labels: yearMonthLabels,
            datasets: [{ label: 'GS', data: monthlyConqGS, backgroundColor: '#4C7080' }, { label: 'PTT', data: monthlyConqPTT, backgroundColor: '#F15A22' }]
        }, { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: maxConqValue * 1.15 } }, plugins: { legend: { position: 'bottom' }, datalabels: { anchor: 'end', align: 'top', font: { weight: 'bold' }, formatter: v => v > 0 ? v.toLocaleString() : null } } });

        // CONQ Analysis Current
        const nonConform25y = data25y.filter(r => r['구분'] === '부적합');
        const current_incoming = sumFCost(nonConform25y.filter(r => r['집계분류(대)'] === '수입'));
        const current_customer = sumFCost(nonConform25y.filter(r => r['집계분류(대)'] === '고객'));
        const current_process = sumFCost(nonConform25y.filter(r => r['집계분류(대)'] === '공정' || r['집계분류(대)'] === '출하'));
        const currentConqData = [current_incoming, current_customer, current_process];
        const maxConqIndex = currentConqData.indexOf(Math.max(...currentConqData));
        const conqOffset = currentConqData.map((_, i) => i === maxConqIndex ? 20 : 0);
        createOrUpdateChart('conqAnalysisCurrentChart', 'doughnut', { labels: ['Incoming', 'Customer', 'Process'], datasets: [{ data: currentConqData, offset: conqOffset, backgroundColor: doughnutColors }] }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' }, datalabels: { formatter: (v) => v.toLocaleString(), color: '#fff', font: { weight: 'bold' } } } });

        // 24Y vs 25Y
        const nonConform24y = data24y.filter(r => r['구분'] === '부적합');
        const analysis25y = { Sum: sumFCost(nonConform25y), Customer: current_customer, Process: current_process, Incoming: current_incoming };
        const analysis24y = { Sum: sumFCost(nonConform24y), Customer: sumFCost(nonConform24y.filter(r => r['집계분류(대)'] === '고객')), Process: sumFCost(nonConform24y.filter(r => r['집계분류(대)'] === '공정' || r['집계분류(대)'] === '출하')), Incoming: sumFCost(nonConform24y.filter(r => r['집계분류(대)'] === '수입')) };
        const analysisLabels = ['Sum', 'Customer', 'Process', 'Incoming'];
        const analysisData25Y = [analysis25y.Sum, analysis25y.Customer, analysis25y.Process, analysis25y.Incoming];
        const analysisData24Y = [analysis24y.Sum, analysis24y.Customer, analysis24y.Process, analysis24y.Incoming];
        createOrUpdateChart('conqAnalysis24v25Chart', 'bar', { labels: analysisLabels, datasets: [{ label: '2025Y', data: analysisData25Y, backgroundColor: '#F15A22' }, { label: '2024Y', data: analysisData24Y, backgroundColor: '#adb5bd' }] }, { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { grace: '30%' } }, plugins: { legend: { position: 'bottom' }, datalabels: { anchor: 'end', align: 'end', formatter: (v) => v > 0 ? v.toLocaleString() : null, color: '#333', font: { weight: 'bold' } } } });

        // Supplier Claim
        const supplierClaimAll = Array(15).fill(0);
        const supplierClaimGS = Array(15).fill(0);
        const supplierClaimPTT = Array(15).fill(0);

        const supplierTotals23 = getAnnualSupplierTotals(data23y);
        supplierClaimAll[0] = supplierTotals23.all; supplierClaimGS[0] = supplierTotals23.gs; supplierClaimPTT[0] = supplierTotals23.ptt;
        const supplierTotals24 = getAnnualSupplierTotals(data24y);
        supplierClaimAll[1] = supplierTotals24.all; supplierClaimGS[1] = supplierTotals24.gs; supplierClaimPTT[1] = supplierTotals24.ptt;

        data25y.filter(r => r['구분'] === '부적합' && r['집계분류(대)'] === '수입').forEach(item => {
            const month = getReportingMonth(item['Issue 일자']);
            if (month !== -1) {
                supplierClaimAll[month + 3]++;
                if (item['제품군'] === 'GS') supplierClaimGS[month + 3]++;
                else if (item['제품군'] === 'PTT') supplierClaimPTT[month + 3]++;
            }
        });
        supplierClaimAll[2] = supplierClaimAll.slice(3).reduce((s, c) => s + c, 0);
        supplierClaimGS[2] = supplierClaimGS.slice(3).reduce((s, c) => s + c, 0);
        supplierClaimPTT[2] = supplierClaimPTT.slice(3).reduce((s, c) => s + c, 0);
        const maxSupplierValue = Math.max(...supplierClaimAll);

        createOrUpdateChart('supplierClaimChart', 'bar', { labels: yearMonthLabels, datasets: [{ label: 'All', data: supplierClaimAll, backgroundColor: '#F15A22' }, { label: 'GS', data: supplierClaimGS, backgroundColor: '#6c757d' }, { label: 'PTT', data: supplierClaimPTT, backgroundColor: '#adb5bd' }] }, { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: maxSupplierValue + Math.ceil(maxSupplierValue * 0.1) + 1 } }, plugins: { legend: { position: 'bottom' }, datalabels: { anchor: 'end', align: 'top', formatter: v => v > 0 ? v : null } } });

        // Supplier Analysis 2025Y
        const calculateDefectCaseData = (dataset) => {
            const categories = {};
            dataset.filter(r => r['구분'] === '부적합' && r['집계분류(대)'] === '수입').forEach(r => {
                let categoryName;
                if (r['발생처/검사처'] === '수입(해외)') categoryName = 'Material';
                else if (r['발생처/검사처'] === '수입(외주)') categoryName = r['이전공정(발생처)'] || '기타 외주';
                if (categoryName) categories[categoryName] = (categories[categoryName] || 0) + 1;
            });
            return categories;
        };
        const supplier2025Y_donut_raw_data = calculateDefectCaseData(data25y);
        const sortedDonutData = Object.entries(supplier2025Y_donut_raw_data).sort((a, b) => b[1] - a[1]);
        let donutLabels = sortedDonutData.map(item => item[0]);
        let donutValues = sortedDonutData.map(item => item[1]);
        if (sortedDonutData.length > 5) {
            const othersValue = sortedDonutData.slice(5).reduce((sum, item) => sum + item[1], 0);
            donutLabels = sortedDonutData.slice(0, 5).map(item => item[0]);
            donutValues = sortedDonutData.slice(0, 5).map(item => item[1]);
            donutLabels.push('Others');
            donutValues.push(othersValue);
        }
        const totalSupplierDefects25y = Object.values(supplier2025Y_donut_raw_data).reduce((s, v) => s + v, 0);
        createOrUpdateChart('supplierAnalysis2025YChart', 'doughnut', { labels: donutLabels, datasets: [{ data: donutValues, backgroundColor: doughnutColors }] }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' }, datalabels: { formatter: (v) => { if (totalSupplierDefects25y === 0) return '0%'; return (v / totalSupplierDefects25y * 100).toFixed(1) + '%'; }, color: '#fff' } } });

        // Supplier Defect Case
        const defectCases25y = calculateDefectCaseData(data25y);
        const defectCases24y = calculateDefectCaseData(data24y);
        const sortedCases25y = Object.entries(defectCases25y).sort((a, b) => b[1] - a[1]);
        const top5CaseLabels = sortedCases25y.slice(0, 5).map(item => item[0]);
        const data25yForCases = top5CaseLabels.map(label => defectCases25y[label] || 0);
        const data24yForCases = top5CaseLabels.map(label => defectCases24y[label] || 0);
        const sum25y = Object.values(defectCases25y).reduce((s, v) => s + v, 0);
        const sum24y = Object.values(defectCases24y).reduce((s, v) => s + v, 0);
        createOrUpdateChart('supplierDefectCaseChart', 'bar', { labels: ['Sum', ...top5CaseLabels], datasets: [{ label: '2025Y', data: [sum25y, ...data25yForCases], backgroundColor: '#F15A22' }, { label: '2024Y', data: [sum24y, ...data24yForCases], backgroundColor: '#adb5bd' }] }, { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { grace: '20%' } }, plugins: { legend: { position: 'bottom' }, datalabels: { anchor: 'end', align: 'end', formatter: (v) => v > 0 ? v.toLocaleString() : null, color: '#333' } } });

        // Urgent Inspection
        const passedInspections = data25y.filter(r => r['구분'] === '검사' && r['집계여부'] === 'YES' && r['판정'] === '합격');
        const urgentData = { regular: Array(13).fill(0), urgent: Array(13).fill(0) };
        passedInspections.forEach(item => {
            const month = getReportingMonth(item['Issue 일자']);
            if (month !== -1) {
                if (item['긴급검사 여부'] === 'Y') urgentData.urgent[month + 1]++;
                else urgentData.regular[month + 1]++;
            }
        });
        for (let i = 1; i <= 12; i++) { urgentData.regular[0] += urgentData.regular[i]; urgentData.urgent[0] += urgentData.urgent[i]; }
        const urgentPercentages = urgentData.urgent.map((u, i) => { const total = u + urgentData.regular[i]; return total > 0 ? (u / total * 100) : 0; });

        createOrUpdateChart('urgentInspectionCaseChart', 'bar', {
            labels: yearMonthLabels.slice(2),
            datasets: [
                { label: 'Regular', data: urgentData.regular, backgroundColor: '#4C7080', stack: 'stack0', datalabels: { color: '#000080', anchor: 'start', align: 'start', offset: 15, font: { weight: 'bold' }, formatter: v => v > 0 ? v : '' }, order: 1 },
                { label: 'Urgent', data: urgentData.urgent, backgroundColor: '#F15A22', stack: 'stack0', datalabels: { color: 'black', anchor: 'center', align: 'center', font: { weight: 'bold' }, formatter: v => v > 0 ? v : '' }, order: 1 },
                { label: 'Urgent %', data: urgentPercentages, type: 'line', borderColor: 'red', yAxisID: 'y1', datalabels: { display: true, color: 'red', anchor: 'end', align: 'top', offset: 8, font: { weight: 'bold' }, formatter: v => v > 0 ? v.toFixed(0) + '%' : null }, order: 0 }
            ]
        }, { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true, ticks: { padding: 30 } }, y: { stacked: true, beginAtZero: true, position: 'left' }, y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, min: 0, max: 100, ticks: { callback: v => v + '%' } } }, plugins: { legend: { position: 'bottom' }, datalabels: { display: false } } });

        // Urgent Customer
        const urgentCustomers = passedInspections.filter(r => r['긴급검사 여부'] === 'Y');
        const customerCounts = urgentCustomers.reduce((acc, r) => { const customer = r['고객사'] || 'Unknown'; acc[customer] = (acc[customer] || 0) + 1; return acc; }, {});
        const sortedCustomers = Object.entries(customerCounts).sort((a, b) => b[1] - a[1]);
        let pieLabels = sortedCustomers.map(item => item[0]);
        let pieData = sortedCustomers.map(item => item[1]);
        if (sortedCustomers.length > 5) {
            const othersValue = sortedCustomers.slice(5).reduce((sum, item) => sum + item[1], 0);
            pieLabels = sortedCustomers.slice(0, 5).map(item => item[0]);
            pieData = sortedCustomers.slice(0, 5).map(item => item[1]);
            pieLabels.push('Others');
            pieData.push(othersValue);
        }
        const totalUrgentCustomers = pieData.reduce((s, v) => s + v, 0);
        createOrUpdateChart('urgentCustomerCaseChart', 'doughnut', { labels: pieLabels, datasets: [{ data: pieData, borderWidth: 2, borderColor: '#fff', backgroundColor: doughnutColors, cutout: '60%' }] }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' }, datalabels: { formatter: (value) => totalUrgentCustomers > 0 ? (value / totalUrgentCustomers * 100).toFixed(1) + '%' : '0%', color: '#fff', font: { weight: 'bold' } } } });
    };

    return (
        <div id="main-dashboard" class="dashboard-body">
            <div class="grid-row">
                <div class="main-column">
                    <div class="category-container">
                        <h2>Total number of inspection</h2>
                        <div class="card">
                            <div class="chart-container" style={{ minHeight: '300px' }}><canvas id="totalInspectionsChart"></canvas></div>
                        </div>
                    </div>
                </div>
                <div class="main-column">
                    <div class="category-container">
                        <h2>Total number of nonconformities</h2>
                        <div class="card">
                            <div class="chart-container" style={{ minHeight: '300px' }}><canvas id="totalNonconformitiesChart"></canvas></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="content-grid">
                <div class="grid-row">
                    <div class="main-column">
                        <div class="category-container">
                            <h2>Customer</h2>
                            <div class="sub-section">
                                <h3 class="sub-section-title">Customer Claim</h3>
                                <div class="card-row">
                                    <div class="card nested-half-card"><h3 class="chart-title"><span class="title-blue">Customer Claim - </span><span class="title-orange">GS</span></h3><div class="chart-container"><canvas id="customerClaimGSChart"></canvas></div></div>
                                    <div class="card nested-half-card"><h3 class="chart-title"><span class="title-blue">Customer Claim - </span><span class="title-orange">PTT</span></h3><div class="chart-container"><canvas id="customerClaimPTTChart"></canvas></div></div>
                                </div>
                            </div>
                            <div class="sub-section">
                                <div class="card-row">
                                    <div class="card nested-half-card"><h3>Current</h3><div class="chart-container"><canvas id="analysisCurrentChart"></canvas></div></div>
                                    <div class="card nested-half-card"><h3>Defect trend</h3><div class="chart-container"><canvas id="analysisDefectTrendChart"></canvas></div></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="main-column">
                        <div class="category-container">
                            <h2>CONQ</h2>
                            <div class="sub-section"><h3 class="sub-section-title">CONQ</h3><div class="card"><h3 class="chart-title"><span class="title-blue">CONQ - </span><span class="title-orange">GS/PTT</span></h3><div class="chart-container tall-chart"><canvas id="conqGSPTTChart"></canvas></div></div></div>
                            <div class="sub-section">
                                <div class="card-row">
                                    <div class="card nested-half-card"><h3>Current</h3><div class="chart-container"><canvas id="conqAnalysisCurrentChart"></canvas></div></div>
                                    <div class="card nested-half-card"><h3>24Y vs 25Y</h3><div class="chart-container"><canvas id="conqAnalysis24v25Chart"></canvas></div></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="grid-row">
                    <div class="main-column">
                        <div class="category-container">
                            <h2>Supplier</h2>
                            <div class="sub-section"><h3 class="sub-section-title">Supplier Claim</h3><div class="card"><div class="chart-container tall-chart"><canvas id="supplierClaimChart"></canvas></div></div></div>
                            <div class="sub-section">
                                <div class="card-row">
                                    <div class="card nested-half-card"><h3>2025Y</h3><div class="chart-container"><canvas id="supplierAnalysis2025YChart"></canvas></div></div>
                                    <div class="card nested-half-card"><h3>Defect Case</h3><div class="chart-container"><canvas id="supplierDefectCaseChart"></canvas></div></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="main-column">
                        <div class="category-container">
                            <h2>Urgent Action</h2>
                            <div class="sub-section">
                                <h3 class="sub-section-title">Urgent Inspection Status</h3>
                                <div class="card">
                                    <h3>Inspection Case</h3>
                                    <div class="chart-container" style={{ minHeight: '370px' }}><canvas id="urgentInspectionCaseChart"></canvas></div>
                                </div>
                                <div class="card" style={{ marginTop: '1.5rem' }}>
                                    <h3>Customer Case</h3>
                                    <div class="chart-container" style={{ minHeight: '350px' }}><canvas id="urgentCustomerCaseChart"></canvas></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
