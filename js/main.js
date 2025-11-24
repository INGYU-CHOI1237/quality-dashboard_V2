document.addEventListener("DOMContentLoaded", function() {
    
    Chart.register(ChartDataLabels);
    const chartInstances = {};

    // ✨ [수정] 요청받은 6가지 도넛 차트 공통 색상
    const doughnutColors = ['#4C7080', '#F15A22', '#243642', '#8BA1A9', '#52579C', '#4F8CD1'];

    function createOrUpdateChart(canvasId, type, data, options) {
        if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
        if (!document.getElementById(canvasId)) return;
        const ctx = document.getElementById(canvasId).getContext('2d');
        chartInstances[canvasId] = new Chart(ctx, { type, data, options });
    }

    async function fetchData() {
        try {
            // ✨ [수정] data23y.csv도 함께 불러옵니다.
            const [data23y, data24y, data25y] = await Promise.all([
                d3.csv('./data/data23y.csv'),
                d3.csv('./data/data24y.csv'),
                d3.csv('./data/data25y.csv')
            ]);
            // ✨ [수정] 세 개의 데이터셋을 모두 전달합니다.
            updateDashboard({ data23y, data24y, data25y });

        } catch (error) {
            console.error("데이터를 불러오는 중 오류 발생:", error);
            alert(`데이터 로딩 실패: 'data' 폴더에 CSV 파일이 있는지, 경로가 맞는지 확인하세요. (${error.message})`);
        }
    }

    const sumFCost = (data) => (data || []).reduce((sum, r) => {
        const fCostValue = String(r['F-Cost_합계'] || '0').replace(/,/g, '');
        return sum + (Number(fCostValue) || 0);
    }, 0);

    // ✨ [수정] updateDashboard가 세 개의 데이터셋을 받도록 변경
    function updateDashboard({ data23y, data24y, data25y }) {
        
        // ✨ [수정] 라벨에 2023, 2024 추가 (총 15개 항목)
        const yearMonthLabels = ['2023', '2024', '2025', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        // 2025년 데이터의 월을 계산하는 (기존) 함수
        const getReportingMonth = (dateString) => {
            if (!dateString) return -1;
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return -1;

            let reportYear = date.getFullYear();
            let reportMonth = date.getMonth(); // 0-11
            if (date.getDate() >= 26) {
                const nextMonthDate = new Date(date.getFullYear(), date.getMonth() + 1, 1);
                reportYear = nextMonthDate.getFullYear();
                reportMonth = nextMonthDate.getMonth();
            }
            if (reportYear === 2025) return reportMonth;
            else return -1;
        };
        
        // ===============================================
        // ==== 1. 상단 차트 로직 (메인) ====
        // ===============================================

        // ✨ [수정] 2. Total number of inspection (2023, 2024 추가)
        const monthlyInspections = Array(15).fill(0); // 15개로 변경
        // 2023년 연간 합계
        monthlyInspections[0] = data23y.filter(r => r['구분'] === '검사').length;
        // 2024년 연간 합계
        monthlyInspections[1] = data24y.filter(r => r['구분'] === '검사').length;
        // 2025년 월별 데이터
        data25y.filter(r => r['구분'] === '검사').forEach(item => {
            const month = getReportingMonth(item['Issue 일자']);
            if(month !== -1) monthlyInspections[month + 3]++; // 인덱스 3 (Jan) 부터 채움
        });
        // 2025년 연간 합계
        monthlyInspections[2] = monthlyInspections.slice(3).reduce((s, c) => s + c, 0);

        const maxInspectionValue = Math.max(...monthlyInspections);

        createOrUpdateChart('totalInspectionsChart', 'bar', 
            { labels: yearMonthLabels, datasets: [{ label: '월별 검사 건수', data: monthlyInspections, backgroundColor: '#4C7080' }] }, // ✨ [수정] 색상 변경
            { 
                responsive: true, 
                maintainAspectRatio: false, 
                scales: { 
                    y: { 
                        beginAtZero: true, 
                        max: maxInspectionValue * 1.15 // 15% 여유 공간
                    } 
                },
                plugins: { 
                    legend: { display: false }, 
                    datalabels: { anchor: 'end', align: 'top', formatter: (v) => v > 0 ? v : null } 
                } 
            }
        );

        // (수정 불필요) Inspection Customer (2025년 데이터만 사용)
        const inspectionCustomers = data25y.filter(r => r['구분'] === '검사' && r['판정'] === '합격');
        const inspCustCounts = inspectionCustomers.reduce((acc, r) => {
            const customer = r['고객사'] || 'Unknown';
            acc[customer] = (acc[customer] || 0) + 1;
            return acc;
        }, {});
        const sortedInspCust = Object.entries(inspCustCounts).sort((a,b) => b[1] - a[1]);
        let inspCustLabels = sortedInspCust.map(item => item[0]);
        let inspCustValues = sortedInspCust.map(item => item[1]);
        if(sortedInspCust.length > 5) {
            const othersValue = sortedInspCust.slice(5).reduce((sum, item) => sum + item[1], 0);
            inspCustLabels = sortedInspCust.slice(0, 5).map(item => item[0]);
            inspCustValues = sortedInspCust.slice(0, 5).map(item => item[1]);
            inspCustLabels.push('Others');
            inspCustValues.push(othersValue);
        }
        createOrUpdateChart('inspectionCustomerChart', 'doughnut', { labels: inspCustLabels, datasets: [{ data: inspCustValues, backgroundColor: doughnutColors }] }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }); // ✨ [수정] 색상 변경

        // ✨ [수정] 3. Total number of nonconformities (2023, 2024 추가)
        const monthlyNonconformities = Array(15).fill(0); // 15개로 변경
        // 2023년 연간 합계
        monthlyNonconformities[0] = data23y.filter(r => r['구분'] === '부적합').length;
        // 2024년 연간 합계
        monthlyNonconformities[1] = data24y.filter(r => r['구분'] === '부적합').length;
        // 2025년 월별 데이터
        data25y.filter(r => r['구분'] === '부적합').forEach(item => {
            const month = getReportingMonth(item['Issue 일자']);
            if(month !== -1) monthlyNonconformities[month + 3]++; // 인덱스 3 (Jan) 부터 채움
        });
        // 2025년 연간 합계
        monthlyNonconformities[2] = monthlyNonconformities.slice(3).reduce((s, c) => s + c, 0);

        const maxNonconformityValue = Math.max(...monthlyNonconformities);

        createOrUpdateChart('totalNonconformitiesChart', 'bar', 
            { labels: yearMonthLabels, datasets: [{ label: '월별 부적합 건수', data: monthlyNonconformities, backgroundColor: '#F15A22' }] }, // ✨ [수정] 색상 변경
            { 
                responsive: true, 
                maintainAspectRatio: false,
                scales: { 
                    y: { 
                        beginAtZero: true, 
                        max: maxNonconformityValue * 1.15 // 15% 여유 공간
                    } 
                },
                plugins: { 
                    legend: { display: false }, 
                    datalabels: { anchor: 'end', align: 'top', formatter: (v) => v > 0 ? v : null } 
                } 
            }
        );

        // (수정 불필요) Nonconformity Customer (2025년 데이터만 사용)
        const nonConformCustomers = data25y.filter(r => r['구분'] === '부적합' && r['판정'] === '불합격');
        const nonConfCustCounts = nonConformCustomers.reduce((acc, r) => {
            let category;
            if (r['집계분류(대)'] === '수입' && r['발생처/검사처'] === '수입(외주)') {
                category = 'Material';
            } else if (['공정', '수입', '출하'].includes(r['집계분류(대)'])) {
                category = r['이전공정(발생처)'] || 'Unknown';
            }
            if (category) {
                acc[category] = (acc[category] || 0) + 1;
            }
            return acc;
        }, {});
        const sortedNonConfCust = Object.entries(nonConfCustCounts).sort((a,b) => b[1] - a[1]);
        let nonConfCustLabels = sortedNonConfCust.map(item => item[0]);
        let nonConfCustValues = sortedNonConfCust.map(item => item[1]);
        if(sortedNonConfCust.length > 5) {
            const othersValue = sortedNonConfCust.slice(5).reduce((sum, item) => sum + item[1], 0);
            nonConfCustLabels = sortedNonConfCust.slice(0, 5).map(item => item[0]);
            nonConfCustValues = sortedNonConfCust.slice(0, 5).map(item => item[1]);
            nonConfCustLabels.push('Others');
            nonConfCustValues.push(othersValue);
        }
        createOrUpdateChart('nonconformityCustomerChart', 'doughnut', { labels: nonConfCustLabels, datasets: [{ data: nonConfCustValues, backgroundColor: doughnutColors }] }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }); // ✨ [수정] 색상 변경

        // ===============================================
        // ==== 2. Customer 대시보드 차트 로직 (메인) ====
        // ===============================================
        
        // ✨ [추가] 4, 5번 항목을 위한 연간 클레임 집계 헬퍼 함수
        const getAnnualClaimTotals = (dataset, productFamily) => {
            const filtered = dataset.filter(r => r['구분'] === '부적합' && r['제품군'] === productFamily && r['집계분류(대)'] === '고객');
            const totals = { all: filtered.length, official: 0, unofficial: 0 };
            filtered.forEach(item => {
                if (item['집계여부'] === 'YES') totals.official++;
                else if (item['집계여부'] === 'NO') totals.unofficial++;
            });
            return totals;
        };

        // ✨ [수정] 4. Customer Claim - GS (2023, 2024 추가)
        const gsClaimAll = Array(15).fill(0);
        const gsClaimOfficial = Array(15).fill(0);
        const gsClaimUnofficial = Array(15).fill(0);
        
        // 2023년
        const gsTotals23 = getAnnualClaimTotals(data23y, 'GS');
        gsClaimAll[0] = gsTotals23.all;
        gsClaimOfficial[0] = gsTotals23.official;
        gsClaimUnofficial[0] = gsTotals23.unofficial;
        // 2024년
        const gsTotals24 = getAnnualClaimTotals(data24y, 'GS');
        gsClaimAll[1] = gsTotals24.all;
        gsClaimOfficial[1] = gsTotals24.official;
        gsClaimUnofficial[1] = gsTotals24.unofficial;
        // 2025년 (월별)
        const filtered25_GS = data25y.filter(r => r['구분'] === '부적합' && r['제품군'] === 'GS' && r['집계분류(대)'] === '고객');
        filtered25_GS.forEach(item => {
            const month = getReportingMonth(item['Issue 일자']);
            if (month !== -1) {
                gsClaimAll[month + 3]++;
                if (item['집계여부'] === 'YES') gsClaimOfficial[month + 3]++;
                else if (item['집계여부'] === 'NO') gsClaimUnofficial[month + 3]++;
            }
        });
        // 2025년 (연간)
        gsClaimAll[2] = gsClaimAll.slice(3).reduce((s, c) => s + c, 0);
        gsClaimOfficial[2] = gsClaimOfficial.slice(3).reduce((s, c) => s + c, 0);
        gsClaimUnofficial[2] = gsClaimUnofficial.slice(3).reduce((s, c) => s + c, 0);

        // 차트 옵션 생성
        const maxGSValue = Math.max(...gsClaimAll);
        // ✨ [수정] Y축 최대값 계산 방식 변경 (데이터 잘림 방지)
        const gsOptions = { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: maxGSValue + Math.ceil(maxGSValue * 0.1) + 1, ticks: { stepSize: 1 } } }, plugins: { legend: { position: 'bottom' }, datalabels: { anchor: 'end', align: 'top', formatter: (v) => v > 0 ? v : null } } };

        createOrUpdateChart('customerClaimGSChart', 'bar', { 
            labels: yearMonthLabels, 
            datasets: [ 
                { label: 'All', data: gsClaimAll, backgroundColor: '#F15A22' }, // ✨ [수정] 색상 변경
                { label: 'Official', data: gsClaimOfficial, backgroundColor: '#6c757d' }, 
                { label: 'Unofficial', data: gsClaimUnofficial, backgroundColor: '#adb5bd' } // PTT 데이터가 아닌 GS의 Unofficial을 사용해야 합니다.
            ] 
        }, gsOptions);

        // ✨ [수정] 5. Customer Claim - PTT (2023, 2024 추가)
        const pttClaimAll = Array(15).fill(0);
        const pttClaimOfficial = Array(15).fill(0);
        const pttClaimUnofficial = Array(15).fill(0);

        // 2023년
        const pttTotals23 = getAnnualClaimTotals(data23y, 'PTT');
        pttClaimAll[0] = pttTotals23.all;
        pttClaimOfficial[0] = pttTotals23.official;
        pttClaimUnofficial[0] = pttTotals23.unofficial;
        // 2024년
        const pttTotals24 = getAnnualClaimTotals(data24y, 'PTT');
        pttClaimAll[1] = pttTotals24.all;
        pttClaimOfficial[1] = pttTotals24.official;
        pttClaimUnofficial[1] = pttTotals24.unofficial;
        // 2025년 (월별)
        const filtered25_PTT = data25y.filter(r => r['구분'] === '부적합' && r['제품군'] === 'PTT' && r['집계분류(대)'] === '고객');
        filtered25_PTT.forEach(item => {
            const month = getReportingMonth(item['Issue 일자']);
            if (month !== -1) {
                pttClaimAll[month + 3]++;
                if (item['집계여부'] === 'YES') pttClaimOfficial[month + 3]++;
                else if (item['집계여부'] === 'NO') pttClaimUnofficial[month + 3]++;
            }
        });
        // 2025년 (연간)
        pttClaimAll[2] = pttClaimAll.slice(3).reduce((s, c) => s + c, 0);
        pttClaimOfficial[2] = pttClaimOfficial.slice(3).reduce((s, c) => s + c, 0);
        pttClaimUnofficial[2] = pttClaimUnofficial.slice(3).reduce((s, c) => s + c, 0);

        // 차트 옵션 생성
        const maxPTTValue = Math.max(...pttClaimAll);
        const pttOptions = { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: maxPTTValue + 2, ticks: { stepSize: 1 } } }, plugins: { legend: { position: 'bottom' }, datalabels: { anchor: 'end', align: 'top', formatter: (v) => v > 0 ? v : null } } };

        createOrUpdateChart('customerClaimPTTChart', 'bar', { 
            labels: yearMonthLabels, 
            datasets: [ 
                { label: 'All', data: pttClaimAll, backgroundColor: '#F15A22' }, // ✨ [수정] 색상 변경
                { label: 'Official', data: pttClaimOfficial, backgroundColor: '#6c757d' }, 
                { label: 'Unofficial', data: pttClaimUnofficial, backgroundColor: '#adb5bd' } 
            ] 
        }, pttOptions);


        // (수정 불필요) Analysis (2025년 데이터만 사용)
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
        createOrUpdateChart('analysisCurrentChart', 'doughnut', { labels: Object.keys(defectCategories), datasets: [{ data: defectDataValues, offset: defectOffset, backgroundColor: doughnutColors }] }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' }, datalabels: { formatter: (v, ctx) => { if(totalDefects === 0) return '0%'; return (v / totalDefects * 100).toFixed(1) + '%'; }, color: '#fff' } } }); // ✨ [수정] 색상 변경
        
        const trendSum = totalDefects;
        const trendLabels = ['Missing', "Dim's", 'Visual', 'Label', 'Qty', 'Sum'];
        const trendData = [ defectCategories.Missing, defectCategories["Dim's"], defectCategories.Visual, defectCategories.Label, defectCategories.Qty, trendSum ];
        createOrUpdateChart('analysisDefectTrendChart', 'bar', { labels: trendLabels.slice().reverse(), datasets: [{ label: '수량', data: trendData.slice().reverse(), backgroundColor: '#6c757d' }] }, { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'end', color: 'black', font: { weight: 'bold' }, formatter: (v) => v > 0 ? v.toLocaleString() : null } } });

        // ===============================================
        // ==== 3. CONQ 대시보드 차트 로직 (메인) ====
        // ===============================================
        
        // ✨ [추가] 6번 항목을 위한 연간 CONQ 집계 헬퍼 함수
        const getAnnualConq = (dataset) => {
            const filtered = dataset.filter(r => r['구분'] === '부적합');
            const totals = { gs: 0, ptt: 0 };
            filtered.forEach(r => {
                const cost = Number(String(r['F-Cost_합계'] || '0').replace(/,/g, ''));
                if (r['제품군'] === 'GS') totals.gs += cost;
                else if (r['제품군'] === 'PTT') totals.ptt += cost;
            });
            return totals;
        };

        // ✨ [수정] 6. CONQ - GS/PTT (2023, 2024 추가)
        const monthlyConqGS = Array(15).fill(0);
        const monthlyConqPTT = Array(15).fill(0);
        
        // 2023년
        const conqTotals23 = getAnnualConq(data23y);
        monthlyConqGS[0] = conqTotals23.gs;
        monthlyConqPTT[0] = conqTotals23.ptt;
        // 2024년
        const conqTotals24 = getAnnualConq(data24y);
        monthlyConqGS[1] = conqTotals24.gs;
        monthlyConqPTT[1] = conqTotals24.ptt;
        // 2025년 (월별)
        const nonConform25y = data25y.filter(r => r['구분'] === '부적합');
        nonConform25y.forEach(r => {
            const month = getReportingMonth(r['Issue 일자']);
            if(month !== -1) {
                const cost = Number(String(r['F-Cost_합계'] || '0').replace(/,/g, ''));
                if (r['제품군'] === 'GS') monthlyConqGS[month + 3] += cost;
                else if (r['제품군'] === 'PTT') monthlyConqPTT[month + 3] += cost;
            }
        });
        // 2025년 (연간)
        monthlyConqGS[2] = monthlyConqGS.slice(3).reduce((s, c) => s + c, 0);
        monthlyConqPTT[2] = monthlyConqPTT.slice(3).reduce((s, c) => s + c, 0);
        
        const maxConqValue = Math.max(...monthlyConqGS, ...monthlyConqPTT);
        
        createOrUpdateChart('conqGSPTTChart', 'bar', { 
            labels: yearMonthLabels, 
            datasets: [ 
                { label: 'GS', data: monthlyConqGS, backgroundColor: '#4C7080' }, // ✨ [수정] 색상 변경
                { label: 'PTT', data: monthlyConqPTT, backgroundColor: '#F15A22' } // ✨ [수정] 색상 변경
            ] 
        }, { 
            responsive: true, 
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, max: maxConqValue * 1.15 } },
            plugins: { 
                legend: { position: 'bottom' }, 
                datalabels: { anchor: 'end', align: 'top', font: { weight: 'bold' }, formatter: v => v > 0 ? v.toLocaleString() : null } 
            } 
        });

        // (수정 불필요) CONQ Analysis Current (2025년 데이터만 사용)
        const current_incoming = sumFCost(nonConform25y.filter(r => r['집계분류(대)'] === '수입'));
        const current_customer = sumFCost(nonConform25y.filter(r => r['집계분류(대)'] === '고객'));
        const current_process = sumFCost(nonConform25y.filter(r => r['집계분류(대)'] === '공정' || r['집계분류(대)'] === '출하'));
        const currentConqData = [current_incoming, current_customer, current_process];
        const maxConqIndex = currentConqData.indexOf(Math.max(...currentConqData));
        const conqOffset = currentConqData.map((_, i) => i === maxConqIndex ? 20 : 0);
        createOrUpdateChart('conqAnalysisCurrentChart', 'doughnut', { labels: ['Incoming', 'Customer', 'Process'], datasets: [{ data: currentConqData, offset: conqOffset, backgroundColor: doughnutColors }] }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' }, datalabels: { formatter: (v) => v.toLocaleString(), color: '#fff', font: { weight: 'bold' } } } }); // ✨ [수정] 색상 변경

        // (수정 불필요) 24Y vs 25Y (데이터 계산은 24Y, 25Y 둘 다 사용함)
        const nonConform24y = data24y.filter(r => r['구분'] === '부적합'); // (nonConform25y는 위에서 이미 정의됨)
        const analysis25y = { Sum: sumFCost(nonConform25y), Customer: current_customer, Process: current_process, Incoming: current_incoming };
        const analysis24y = { Sum: sumFCost(nonConform24y), Customer: sumFCost(nonConform24y.filter(r => r['집계분류(대)'] === '고객')), Process: sumFCost(nonConform24y.filter(r => r['집계분류(대)'] === '공정' || r['집계분류(대)'] === '출하')), Incoming: sumFCost(nonConform24y.filter(r => r['집계분류(대)'] === '수입')) };
        const analysisLabels = ['Sum', 'Customer', 'Process', 'Incoming'];
        const analysisData25Y = [analysis25y.Sum, analysis25y.Customer, analysis25y.Process, analysis25y.Incoming];
        const analysisData24Y = [analysis24y.Sum, analysis24y.Customer, analysis24y.Process, analysis24y.Incoming];
        
        // ✨ [수정] 7. 24Y vs 25Y 차트 (라벨 잘림 문제 해결)
        createOrUpdateChart('conqAnalysis24v25Chart', 'bar', 
            { labels: analysisLabels, datasets: [ { label: '2025Y', data: analysisData25Y, backgroundColor: '#F15A22' }, { label: '2024Y', data: analysisData24Y, backgroundColor: '#adb5bd' } ] }, // ✨ [수정] 색상 변경
            { 
                indexAxis: 'y', 
                responsive: true, 
                maintainAspectRatio: false, 
                // ✨ [추가] X축에 'grace' (여유 공간) 20%를 주어 라벨이 잘리지 않게 함
                scales: { 
                    x: { grace: '30%' } 
                },
                plugins: { 
                    legend: { position: 'bottom' }, 
                    datalabels: { anchor: 'end', align: 'end', formatter: (v) => v > 0 ? v.toLocaleString() : null, color: '#333', font: { weight: 'bold' } } 
                } 
            }
        );

        // ===============================================
        // ==== 4. Supplier 대시보드 차트 로직 (메인) ====
        // ===============================================
        
        // ✨ [추가] 8번 항목을 위한 연간 공급자 클레임 집계 헬퍼 함수
        const getAnnualSupplierTotals = (dataset) => {
            const filtered = dataset.filter(r => r['구분'] === '부적합' && r['집계분류(대)'] === '수입');
            const totals = { all: filtered.length, gs: 0, ptt: 0 };
            filtered.forEach(item => {
                if (item['제품군'] === 'GS') totals.gs++;
                else if (item['제품군'] === 'PTT') totals.ptt++;
            });
            return totals;
        };

        // ✨ [수정] 8. Supplier Claim (2023, 2024 추가)
        const supplierClaimAll = Array(15).fill(0);
        const supplierClaimGS = Array(15).fill(0);
        const supplierClaimPTT = Array(15).fill(0);

        // 2023년
        const supplierTotals23 = getAnnualSupplierTotals(data23y);
        supplierClaimAll[0] = supplierTotals23.all;
        supplierClaimGS[0] = supplierTotals23.gs;
        supplierClaimPTT[0] = supplierTotals23.ptt;
        // 2024년
        const supplierTotals24 = getAnnualSupplierTotals(data24y);
        supplierClaimAll[1] = supplierTotals24.all;
        supplierClaimGS[1] = supplierTotals24.gs;
        supplierClaimPTT[1] = supplierTotals24.ptt;
        // 2025년 (월별)
        const supplierDefects25y = data25y.filter(r => r['구분'] === '부적합' && r['집계분류(대)'] === '수입');
        supplierDefects25y.forEach(item => {
            const month = getReportingMonth(item['Issue 일자']);
            if (month !== -1) {
                supplierClaimAll[month + 3]++;
                if (item['제품군'] === 'GS') supplierClaimGS[month + 3]++;
                else if (item['제품군'] === 'PTT') supplierClaimPTT[month + 3]++;
            }
        });
        // 2025년 (연간)
        supplierClaimAll[2] = supplierClaimAll.slice(3).reduce((s, c) => s + c, 0);
        supplierClaimGS[2] = supplierClaimGS.slice(3).reduce((s, c) => s + c, 0);
        supplierClaimPTT[2] = supplierClaimPTT.slice(3).reduce((s, c) => s + c, 0);
        
        const maxSupplierValue = Math.max(...supplierClaimAll);
        
        createOrUpdateChart('supplierClaimChart', 'bar', 
            { 
                labels: yearMonthLabels, 
                datasets: [ 
                    { label: 'All', data: supplierClaimAll, backgroundColor: '#F15A22' }, // ✨ [수정] 색상 변경
                    { label: 'GS', data: supplierClaimGS, backgroundColor: '#6c757d' }, 
                    { label: 'PTT', data: supplierClaimPTT, backgroundColor: '#adb5bd' } 
                ] 
            }, 
            { 
                responsive: true, 
                maintainAspectRatio: false, 
                scales: { 
                    y: { beginAtZero: true, max: maxSupplierValue + Math.ceil(maxSupplierValue * 0.1) + 1 } 
                }, 
                plugins: { 
                    legend: { position: 'bottom' }, 
                    datalabels: { anchor: 'end', align: 'top', formatter: v => v > 0 ? v : null } 
                } 
            }
        );
        
        // (수정 불필요) Supplier Analysis 2025Y
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
        createOrUpdateChart('supplierAnalysis2025YChart', 'doughnut', {
            labels: donutLabels,
            datasets: [{ data: donutValues, backgroundColor: doughnutColors }] // ✨ [수정] 색상 변경
        }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' }, datalabels: { formatter: (v, ctx) => { if(totalSupplierDefects25y === 0) return '0%'; return (v / totalSupplierDefects25y * 100).toFixed(1) + '%'; }, color: '#fff' } } });

        // (수정 불필요) Supplier Defect Case (24Y vs 25Y)
        const defectCases25y = calculateDefectCaseData(data25y);
        const defectCases24y = calculateDefectCaseData(data24y);
        const sortedCases25y = Object.entries(defectCases25y).sort((a, b) => b[1] - a[1]);
        const top5CaseLabels = sortedCases25y.slice(0, 5).map(item => item[0]);
        const data25yForCases = top5CaseLabels.map(label => defectCases25y[label] || 0);
        const data24yForCases = top5CaseLabels.map(label => defectCases24y[label] || 0);
        const sum25y = Object.values(defectCases25y).reduce((s, v) => s + v, 0);
        const sum24y = Object.values(defectCases24y).reduce((s, v) => s + v, 0);
        const finalCaseLabels = ['Sum', ...top5CaseLabels];
        const finalData25Y = [sum25y, ...data25yForCases];
        const finalData24Y = [sum24y, ...data24yForCases];
        createOrUpdateChart('supplierDefectCaseChart', 'bar', {
            labels: finalCaseLabels,
            datasets: [ { label: '2025Y', data: finalData25Y, backgroundColor: '#F15A22' }, { label: '2024Y', data: finalData24Y, backgroundColor: '#adb5bd' } ] // ✨ [수정] 색상 변경
        }, { 
            indexAxis: 'y', 
            responsive: true, 
            maintainAspectRatio: false, 
            scales: { 
                x: { grace: '20%' } // ✨ [추가] X축 여유 공간 (라벨 잘림 방지)
            },
            plugins: { legend: { position: 'bottom' }, datalabels: { anchor: 'end', align: 'end', formatter: (v) => v > 0 ? v.toLocaleString() : null, color: '#333' } } 
        });

        // ===============================================
        // ==== 5. Urgent Action 대시보드 차트 로직 (메인) ====
        // ===============================================
        
        // (수정 불필요) Urgent Inspection (2025년 데이터만 사용)
        const passedInspections = data25y.filter(r => r['구분'] === '검사' && r['집계여부'] === 'YES' && r['판정'] === '합격');
        const urgentData = { regular: Array(13).fill(0), urgent: Array(13).fill(0) };
        passedInspections.forEach(item => {
            const month = getReportingMonth(item['Issue 일자']);
            if (month !== -1) {
                if (item['긴급검사 여부'] === 'Y') {
                    urgentData.urgent[month + 1]++;
                } else {
                    urgentData.regular[month + 1]++;
                }
            }
        });
        for (let i = 1; i <= 12; i++) {
            urgentData.regular[0] += urgentData.regular[i];
            urgentData.urgent[0] += urgentData.urgent[i];
        }
        const urgentPercentages = urgentData.urgent.map((u, i) => {
            const total = u + urgentData.regular[i];
            return total > 0 ? (u / total * 100) : 0;
        });
        
        createOrUpdateChart('urgentInspectionCaseChart', 'bar', {
            labels: yearMonthLabels.slice(2), // 2023, 2024 제외
            datasets: [
                { 
                    label: 'Regular', data: urgentData.regular, backgroundColor: '#4C7080', stack: 'stack0', // ✨ [수정] 색상 변경
                    datalabels: { color: '#000080', anchor: 'start', align: 'start', offset: 15, font: { weight: 'bold' }, formatter: v => v > 0 ? v : '' },
                    order: 1 
                },
                { 
                    label: 'Urgent', data: urgentData.urgent, backgroundColor: '#F15A22', stack: 'stack0', // ✨ [수정] 색상 변경
                    datalabels: { color: 'black', anchor: 'center', align: 'center', font: { weight: 'bold' }, formatter: v => v > 0 ? v : '' },
                    order: 1 
                },
                { 
                    label: 'Urgent %', data: urgentPercentages, type: 'line', borderColor: 'red', yAxisID: 'y1',
                    datalabels: { display: true, color: 'red', anchor: 'end', align: 'top', offset: 8, font: {weight: 'bold'}, formatter: v => v > 0 ? v.toFixed(0) + '%' : null },
                    order: 0
                }
            ]
        }, {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { stacked: true, ticks: { padding: 30 } },
                y: { stacked: true, beginAtZero: true, position: 'left' },
                y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, min: 0, max: 100, ticks: { callback: v => v + '%' } }
            },
            plugins: { legend: { position: 'bottom' }, datalabels: { display: false } }
        });

        // (수정 불필요) Urgent Customer (2025년 데이터만 사용)
        const urgentCustomers = passedInspections.filter(r => r['긴급검사 여부'] === 'Y');
        const customerCounts = urgentCustomers.reduce((acc, r) => {
            const customer = r['고객사'] || 'Unknown';
            acc[customer] = (acc[customer] || 0) + 1;
            return acc;
        }, {});
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

        createOrUpdateChart('urgentCustomerCaseChart', 'doughnut', {
            labels: pieLabels,
            datasets: [{ 
                data: pieData, 
                borderWidth: 2, 
                borderColor: '#fff', 
                backgroundColor: doughnutColors, // ✨ [수정] 색상 변경
                cutout: '60%'
            }]
        }, {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' },
                datalabels: {
                    formatter: (value, ctx) => { 
                        const percentage = totalUrgentCustomers > 0 ? (value / totalUrgentCustomers * 100).toFixed(1) : 0;
                        return percentage + '%';
                    },
                    color: '#fff', 
                    font: { weight: 'bold' }
                }
            }
        });
    }

    // 메인 대시보드 데이터 로드 시작
    fetchData();

    // ===============================================
    // ==== ✨ 비밀번호 팝업 로직 (메인) ====
    // ===============================================

    const inkyuLink = document.getElementById('inkyu-choi-link');
    const passwordOverlay = document.getElementById('password-overlay');
    const passwordSubmit = document.getElementById('password-submit');
    const passwordClose = document.getElementById('password-close');
    const passwordInput = document.getElementById('password-input');

    if (inkyuLink && passwordOverlay && passwordSubmit && passwordClose && passwordInput) {
        inkyuLink.addEventListener('click', (e) => {
            e.preventDefault();
            passwordOverlay.style.display = 'flex';
            passwordInput.focus();
        });

        passwordClose.addEventListener('click', () => {
            passwordOverlay.style.display = 'none';
            passwordInput.value = '';
        });

        passwordSubmit.addEventListener('click', checkPassword);
        passwordInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') checkPassword();
        });
    }

    // ✨ 비밀번호 확인 및 페이지 이동 함수
    function checkPassword() {
        if (passwordInput.value === 'eunseom_240826') {
            // 성공 시: 인증 상태를 sessionStorage에 저장
            sessionStorage.setItem('isAuthenticated', 'true');
            // 'inkyu.html' 페이지로 이동
            window.location.href = 'inkyu.html';
        } else {
            // 실패 시
            alert('비밀번호가 일치하지 않습니다.');
            passwordInput.value = '';
            passwordInput.focus();
        }
    }

});