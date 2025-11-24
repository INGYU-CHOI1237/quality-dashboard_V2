document.addEventListener("DOMContentLoaded", function () {
    console.log("Inspection Status 페이지 로드됨");

    // 전역 변수 설정
    let rawData = [];
    let currentMode = 'count'; // 기본 모드: 'count' (건수)

    // ---------------------------------------------------------
    // 1. 데이터 로드
    // ---------------------------------------------------------
    d3.csv("data/Status.csv").then(function (data) {
        console.log("CSV 데이터 로드 성공:", data);

        // 데이터 가공
        rawData = processData(data);

        // 초기 화면 렌더링
        init();

    }).catch(function (error) {
        console.error("CSV 로드 실패:", error);
        const bubbleContainer = document.getElementById('bubble-container');
        if (bubbleContainer) {
            bubbleContainer.innerHTML = `<p style="color:red; text-align:center;">
                'data/Status.csv' 파일을 찾을 수 없습니다.<br>
                data 폴더 안에 CSV 파일이 있는지 확인해주세요.
            </p>`;
        }
    });

    function init() {
        updateDashboard();
        updateSummary();

        const btnCount = document.getElementById('btn-count');
        const btnQty = document.getElementById('btn-qty');

        if (btnCount) btnCount.addEventListener('click', () => setMode('count'));
        if (btnQty) btnQty.addEventListener('click', () => setMode('qty'));
    }

    // ---------------------------------------------------------
    // 2. 데이터 전처리
    // ---------------------------------------------------------
    function processData(data) {
        const today = new Date(); // 오늘 날짜

        return data.map(row => {
            const transferDateStr = row['이관일자'] || "";
            const transferDate = new Date(transferDateStr);

            // 경과일자 계산
            let diffDays = 0;
            if (!isNaN(transferDate.getTime())) {
                const diffTime = today - transferDate;
                diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            }

            return {
                originalItemNumber: row['Item Number'],
                workOrder: row['Work order'],

                // Item Number 앞 4글자 추출
                customer: row['Item Number'] ? row['Item Number'].substring(0, 4) : 'Unk',

                // WO Qty 숫자 변환
                qty: parseInt(row['WO Qty']) || 0,

                transferDateStr: transferDateStr,
                transferDateObj: transferDate,
                elapsedDays: diffDays
            };
        });
    }

    function setMode(mode) {
        currentMode = mode;
        document.getElementById('btn-count').classList.toggle('active', mode === 'count');
        document.getElementById('btn-qty').classList.toggle('active', mode === 'qty');
        updateDashboard();
    }

    // ---------------------------------------------------------
    // 3. 화면 업데이트 (버블 & 리스트)
    // ---------------------------------------------------------
    function updateDashboard() {
        const bubbleContainer = document.getElementById('bubble-container');
        if (bubbleContainer) bubbleContainer.innerHTML = '';

        if (rawData.length === 0) return;

        // 3-1. 그룹화
        const groups = {};
        rawData.forEach(row => {
            const key = row.customer;
            if (!groups[key]) {
                groups[key] = { customer: key, count: 0, totalQty: 0 };
            }
            groups[key].count += 1;
            groups[key].totalQty += row.qty;
        });

        let groupArray = Object.values(groups);

        // 정렬 및 최대값 찾기
        if (currentMode === 'count') {
            groupArray.sort((a, b) => b.count - a.count);
        } else {
            groupArray.sort((a, b) => b.totalQty - a.totalQty);
        }

        const maxValue = groupArray.length > 0
            ? (currentMode === 'count' ? groupArray[0].count : groupArray[0].totalQty)
            : 1;

        // 3-2. 버블 생성
        groupArray.forEach((group, index) => {
            const value = currentMode === 'count' ? group.count : group.totalQty;
            const labelUnit = currentMode === 'count' ? '건' : '개';

            // 모드에 따른 테마 색상 결정
            const themeColor = currentMode === 'count' ? '#4C7080' : '#F15A22';

            // 크기 계산 (최소 120px ~ 최대 240px로 확대)
            const size = 120 + (value / maxValue) * 120;

            const bubble = document.createElement('div');
            bubble.className = 'bubble';
            bubble.style.width = `${size}px`;
            bubble.style.height = `${size}px`;

            // 동적 색상 적용
            bubble.style.backgroundColor = themeColor; // 배경색을 테마 색상으로
            bubble.style.borderColor = themeColor;
            bubble.style.color = 'white'; // 글자색은 흰색으로

            bubble.style.animation = `fadeIn 0.5s ease ${index * 0.05}s forwards`;
            bubble.style.opacity = '0';

            bubble.innerHTML = `
                <div class="bubble-text">${group.customer}</div>
                <div class="bubble-sub">${value.toLocaleString()}${labelUnit}</div>
            `;

            if (bubbleContainer) bubbleContainer.appendChild(bubble);
        });

        // 애니메이션 스타일 주입 (이미 존재하면 중복 방지 등은 생략)
        const styleSheet = document.createElement("style");
        styleSheet.innerText = `
            @keyframes fadeIn { to { opacity: 1; transform: translateY(0); } from { opacity: 0; transform: translateY(10px); } }
        `;
        document.head.appendChild(styleSheet);

        // 3-3. 리스트 업데이트
        renderList();
    }

    function renderList() {
        const listBody = document.getElementById('status-list-body');
        if (!listBody) return;
        listBody.innerHTML = '';

        // 이관일자 오름차순 정렬
        const sortedData = [...rawData].sort((a, b) => a.transferDateObj - b.transferDateObj);

        sortedData.forEach(row => {
            const tr = document.createElement('tr');

            // 7일 이상 경과 시 노란색 배경
            if (row.elapsedDays >= 7) {
                tr.classList.add('status-row-warning');
            }

            // Work Order: .0 제거, 이관일자: 시간 제거(앞 10자리만 사용)
            tr.innerHTML = `
                <td>${row.workOrder ? row.workOrder.split('.')[0] : ''}</td>
                <td>${row.transferDateStr ? row.transferDateStr.substring(0, 10) : ''}</td>
                <td>${row.elapsedDays}일</td>
            `;
            listBody.appendChild(tr);
        });
    }

    // ---------------------------------------------------------
    // 4. 요약 정보 업데이트
    // ---------------------------------------------------------
    function updateSummary() {
        const totalCount = rawData.length;
        const totalQty = rawData.reduce((sum, row) => sum + row.qty, 0);

        const elTotalCount = document.getElementById('summary-total-count');
        const elTotalQty = document.getElementById('summary-total-qty');

        if (elTotalCount) elTotalCount.innerText = totalCount.toLocaleString();
        if (elTotalQty) elTotalQty.innerText = totalQty.toLocaleString();
    }
});