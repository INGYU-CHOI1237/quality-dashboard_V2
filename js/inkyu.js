/************************************************************/
/************** ✨ js/inkyu.js (최종 수정본) ******************/
/************************************************************/
document.addEventListener("DOMContentLoaded", function() {


    /** 현재 연도를 가져와 제목을 동적으로 업데이트하는 함수 */
    function updateTitlesWithCurrentYear() {
        const currentYear = new Date().getFullYear();
        document.title = `Inkyu Choi - Private(${currentYear})`;
        const headerTitle = document.querySelector('.main-header h1');
        if (headerTitle) {
            headerTitle.textContent = `Inkyu Choi - Private(${currentYear})`;
        }
    }
    updateTitlesWithCurrentYear();

/** ✨ [추가] DB 날짜 문자열(ISO)을 Input 형식(YYYY-MM-DD)으로 변환 */
    function formatDateForInput(dateString) {
        if (!dateString) {
            return '';
        }
        try {
            // new Date()로 날짜 객체를 만들고, YYYY-MM-DD 부분만 잘라냅니다.
            return new Date(dateString).toISOString().slice(0, 10);
        } catch (e) {
            console.error('Invalid date format:', dateString);
            return '';
        }
    }

    Chart.register(ChartDataLabels);
    const chartInstances = {};

    function createOrUpdateChart(canvasId, type, data, options) {
        if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
        if (!document.getElementById(canvasId)) return;
        const ctx = document.getElementById(canvasId).getContext('2d');
        chartInstances[canvasId] = new Chart(ctx, { type, data, options });
    }

    const defaultAmatData = [
        { label: 'Total', value: 230 },
        { label: 'Inkyu Choi', value: 193 },
        { label: 'Others', value: 37 }
    ];
    const defaultSettingData = [
        { label: 'GS-1 Setup', value: 5 },
        { label: 'GS-2 Setup', value: 8 },
        { label: 'PTT-1 Setup', value: 3 },
        { label: 'PTT-2 Setup', value: 6 }
    ];

    // ===============================================
    // ==== 1. AMAT FAI 차트 ====
    // ===============================================

    /** 1.1. AMAT FAI 차트 그리기 */
    function renderAmatChart(data) {
        const chartData = {
            labels: data.map(d => d.label),
            datasets: [{
                label: '검사 건수',
                data: data.map(d => d.value),
                backgroundColor: ['#343a40', '#007bff', '#6c757d', '#fd7e14', '#28a745'],
                borderColor: '#ffffff',
                borderWidth: 1
            }]
        };
        const maxValue = Math.max(0, ...data.map(d => d.value));
        createOrUpdateChart('amatFaiChart', 'bar', chartData, {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            scales: { x: { beginAtZero: true, max: maxValue * 1.15 + 1 } },
            plugins: {
                legend: { display: false },
                datalabels: { anchor: 'end', align: 'end', font: { weight: 'bold' }, formatter: (v) => v.toLocaleString() }
            }
        });
        loadTrainingData();
    }

    /** 1.2. AMAT FAI 데이터 로드 (DB) */
    async function loadAmatData() {
        try {
const response = await fetch('/api/get-amat-data?_=' + new Date().getTime());
            if (!response.ok) throw new Error('DB 로드 실패');
            const data = await response.json();
            if (!data || data.length === 0) {
                renderAmatChart(defaultAmatData);
                return defaultAmatData;
            } else {
                renderAmatChart(data);
                return data;
            }
        } catch (error) {
            console.error(error);
            renderAmatChart(defaultAmatData);
            return defaultAmatData;
        }
    }

    /** 1.4. AMAT FAI 모달 폼 항목 HTML 생성 */
    function createAmatEditItemHTML(item = {label: '', value: 0}) {
        return `
            <div class="gantt-step-item">
                <div class="gantt-step-grid" style="grid-template-columns: 2fr 1fr; align-items: end;">
                    <div class="gantt-form-group"><label>항목 (Label)</label><input type="text" class="amat-label" value="${item.label || ''}"></div>
                    <div class="gantt-form-group"><label>값 (Value)</label><input type="number" class="amat-value" value="${item.value || 0}"></div>
                </div>
                <button class="gantt-step-delete-btn" title="항목 삭제">×</button>
            </div>`;
    }

    /** 1.5. AMAT FAI 모달 열기 (✨ 수정) */
    async function openAmatModal() {
        const data = await loadAmatData(); // ✨ 'await' 추가
        const form = document.getElementById('amat-edit-form');
        const controlsHTML = `<div class="gantt-form-controls" style="border: none; padding-bottom: 0.5rem; margin-bottom: 0.5rem; text-align: right;"><button id="add-amat-item-btn" class="btn btn-add-step">+ 항목 추가</button></div>`;
        let itemsHTML = '';
        data.forEach(item => itemsHTML += createAmatEditItemHTML(item));
        form.innerHTML = controlsHTML + `<div class="amat-items-container">${itemsHTML}</div>`;
        document.getElementById('amat-modal-overlay').style.display = 'flex';
    }

    /** 1.6. AMAT FAI 모달 저장 (DB) */
    async function saveAndCloseAmatModal() {
        const items = document.querySelectorAll('#amat-edit-form .gantt-step-item');
        const newData = [];
        items.forEach(item => {
            newData.push({
                label: item.querySelector('.amat-label').value,
                value: parseInt(item.querySelector('.amat-value').value, 10) || 0
            });
        });
        try {
            const response = await fetch('/api/save-amat-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newData)
            });
            if (!response.ok) throw new Error('서버 저장 실패'); // 👈 에러 잡기
        } catch (error) {
            console.error('Save failed:', error);
            alert('데이터 저장에 실패했습니다.');
            return; // 👈 [추가] 실패 시 함수 중단
        }
        await loadAmatData(); // 👈 [수정] DB에서 진짜 데이터 다시 로드 (이 함수가 renderAmatChart를 호출함)
        document.getElementById('amat-modal-overlay').style.display = 'none';
    }

    // ===============================================
    // ==== 2. 교육(Training.csv) 테이블 ====
    // ===============================================
    async function loadTrainingData() {
        const container = document.getElementById('training-table-container');
        if (!container) return;
        try {
            const trainingData = await d3.csv('./data/Training.csv');
            if (trainingData.length === 0) {
                 container.innerHTML = '<p>Training.csv 파일을 읽었으나 데이터가 없습니다.</p>'; return;
            }
            const headers = Object.keys(trainingData[0]);
            const colIndices = [0, 5, 6, 7, 9, 10, 14]; 
            if (headers.length <= 14) {
                container.innerHTML = `<p style="color: red;">'Training.csv' 파일의 열 개수가 15개 미만입니다.</p>`; return;
            }
            const colHeaders = colIndices.map(i => headers[i]);
            const filterColHeader = headers[0];
            const statusColHeader = headers[14];
            const filteredData = trainingData.filter(row => row[filterColHeader] === '최인규');
            if (filteredData.length === 0) {
                container.innerHTML = '<p>표시할 교육 데이터가 없습니다. (필터: 최인규)</p>'; return;
            }
            let tableHTML = '<div style="overflow-x: auto;"><table class="training-table">';
            tableHTML += '<thead><tr>';
            for (const header of colHeaders) tableHTML += `<th>${header}</th>`;
            tableHTML += '</tr></thead><tbody>';
            for (const row of filteredData) {
                tableHTML += '<tr>';
                for (const header of colHeaders) {
                    let cellValue = row[header] || '';
                    let className = '';
                    if (header === statusColHeader) {
                        if (cellValue.includes('완료')) className = 'status-complete';
                        else if (cellValue.includes('진행')) className = 'status-in-progress';
                    }
                    tableHTML += `<td class="${className}">${cellValue}</td>`;
                }
                tableHTML += '</tr>';
            }
            tableHTML += '</tbody></table></div>';
            container.innerHTML = tableHTML;
        } catch (error) {
            console.error("Training.csv 로드 오류:", error);
            container.innerHTML = `<p style="color: red;"><b>오류:</b> './data/Training.csv' 파일을 불러오는 데 실패했습니다.</p>`;
        }
    }

    // ===============================================
    // ==== 2.5. 세팅품 검사이력 차트 ====
    // ===============================================

    /** 2.5.1. 세팅품 차트 그리기 */
    function renderSettingChart(data) {
        const chartData = {
            labels: data.map(d => d.label),
            datasets: [{
                label: '검사 이력 건수',
                data: data.map(d => d.value),
                backgroundColor: '#17a2b8',
                borderColor: '#ffffff',
                borderWidth: 1
            }]
        };
        const maxValue = Math.max(0, ...data.map(d => d.value));
        createOrUpdateChart('settingInspectionChart', 'bar', chartData, {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            scales: { x: { beginAtZero: true, max: maxValue * 1.15 + 1 } },
            plugins: {
                legend: { display: false },
                datalabels: { anchor: 'end', align: 'end', font: { weight: 'bold' }, formatter: (v) => v.toLocaleString() }
            }
        });
    }

    /** 2.5.2. 세팅품 데이터 로드 (DB) */
    async function loadSettingData() {
        try {
const response = await fetch('/api/get-setting-data?_=' + new Date().getTime());
            if (!response.ok) throw new Error('DB 로드 실패');
            const data = await response.json();
            if (!data || data.length === 0) {
                renderSettingChart(defaultSettingData);
                return defaultSettingData;
            } else {
                renderSettingChart(data);
                return data;
            }
        } catch (error) {
            console.error(error);
            renderSettingChart(defaultSettingData);
            return defaultSettingData;
        }
    }

    /** 2.5.4. 세팅품 모달 폼 항목 HTML 생성 */
    function createSettingEditItemHTML(item = {label: '', value: 0}) {
        return `
            <div class="gantt-step-item">
                <div class="gantt-step-grid" style="grid-template-columns: 2fr 1fr; align-items: end;">
                    <div class="gantt-form-group"><label>항목 (Label)</label><input type="text" class="setting-label" value="${item.label || ''}"></div>
                    <div class="gantt-form-group"><label>값 (Value)</label><input type="number" class="setting-value" value="${item.value || 0}"></div>
                </div>
                <button class="gantt-step-delete-btn" title="항목 삭제">×</button>
            </div>`;
    }
    
    /** 2.5.5. 세팅품 모달 열기 (✨ 추가) */
    async function openSettingModal() {
        const data = await loadSettingData(); // ✨ 'await' 추가
        const form = document.getElementById('setting-edit-form');
        const controlsHTML = `<div class="gantt-form-controls" style="border: none; padding-bottom: 0.5rem; margin-bottom: 0.5rem; text-align: right;"><button id="add-setting-item-btn" class="btn btn-add-step">+ 항목 추가</button></div>`;
        let itemsHTML = '';
        data.forEach(item => itemsHTML += createSettingEditItemHTML(item));
        form.innerHTML = controlsHTML + `<div class="setting-items-container">${itemsHTML}</div>`;
        document.getElementById('setting-modal-overlay').style.display = 'flex';
    }

    /** 2.5.6. 세팅품 모달 저장 (DB) (✨ 수정 - 중복 제거) */
    async function saveAndCloseSettingModal() {
        const items = document.querySelectorAll('#setting-edit-form .gantt-step-item');
        const newData = [];
        items.forEach(item => {
            newData.push({
                label: item.querySelector('.setting-label').value,
                value: parseInt(item.querySelector('.setting-value').value, 10) || 0
            });
        });
        try {
            const response = await fetch('/api/save-setting-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newData)
            });
            if (!response.ok) throw new Error('서버 저장 실패'); // 👈 에러 잡기
        } catch (error) {
            console.error('Save failed:', error);
            alert('데이터 저장에 실패했습니다.');
            return; // 👈 [추가] 실패 시 함수 중단
        }
        await loadSettingData(); // 👈 [수정] DB에서 진짜 데이터 다시 로드
        document.getElementById('setting-modal-overlay').style.display = 'none';
    }

    // ===============================================
    // ==== 3. 제안 (Proposal) 기능 로직 ====
    // ===============================================
    const addProposalBtn = document.getElementById('add-proposal-btn');
    const proposalList = document.getElementById('proposal-list');
    const proposalResizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            const newHeight = entry.borderBoxSize[0].blockSize; 
            const card = entry.target.closest('.proposal-card');
            if (card) {
                const afterTextarea = card.querySelector('.textarea-after');
                if (afterTextarea) afterTextarea.style.height = `${newHeight}px`;
            }
        }
    });

    function addNewProposal(data = null) {
        const newProposalCard = document.createElement('div');
        newProposalCard.className = 'card proposal-card';
        newProposalCard.innerHTML = createProposalHTML(data); 
        proposalList.appendChild(newProposalCard);
        if (data && data.imageBefore) {
            const img = newProposalCard.querySelector('.img-preview-before');
            img.src = data.imageBefore; img.style.display = 'block';
        }
        if (data && data.imageAfter) {
            const img = newProposalCard.querySelector('.img-preview-after');
            img.src = data.imageAfter; img.style.display = 'block';
        }
        const beforeTextarea = newProposalCard.querySelector('.textarea-before');
        if (beforeTextarea) proposalResizeObserver.observe(beforeTextarea);
    }

    function handleProposalClick(e) {
        if (e.target.classList.contains('btn-delete-proposal')) {
            if (confirm('이 제안을 삭제하시겠습니까?')) {
                e.target.closest('.proposal-card').remove();

            }
        }
        if (e.target.classList.contains('btn-toggle-details')) {
            const card = e.target.closest('.proposal-card');
            const body = card.querySelector('.proposal-card-body');
            if (body.style.display === 'none' || body.style.display === '') {
                body.style.display = 'block'; e.target.textContent = '축소';
            } else {
                body.style.display = 'none'; e.target.textContent = '확장';
            }
        }
        if (e.target.classList.contains('btn-delete-image')) {
            const imgSection = e.target.closest('.image-section');
            const imgInput = imgSection.querySelector('.image-upload');
            const imgPreview = imgSection.querySelector('.image-preview');
            imgInput.value = ''; imgPreview.src = '';
            imgPreview.style.display = 'none';
            e.target.style.display = 'none';

        }
    }

async function handleProposalChange(e) {
        if (e.target.classList.contains('image-upload') && e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const img = e.target.closest('.image-section').querySelector('.image-preview');
            const deleteBtn = e.target.closest('.image-section').querySelector('.btn-delete-image');
            img.style.opacity = '0.5';
            try {
                // 백엔드에 업로드 요청 (이 부분은 동일)
                const response = await fetch(`/api/upload-image?filename=${encodeURIComponent(file.name)}`, {
                    method: 'POST',
                    body: file,
                });

                if (!response.ok) {
                    throw new Error('Backend upload failed'); 
                }
                
                // 1. 서버로부터 원본 Blob URL을 받습니다 (텍스트)
                const originalBlobUrl = await response.text();
                
                // 2. ✨ 수정: 화면에 표시할 때는 방화벽 우회 API를 사용합니다.
                // (이전에 `\` (백슬래시)가 잘못 들어갔던 부분 수정)
                img.src = `/api/get-image?url=${encodeURIComponent(originalBlobUrl)}`;
                
                // 3. ✨ 추가: 나중에 저장할 수 있도록 원본 URL을 'data-' 속성에 저장합니다.
                img.setAttribute('data-blob-url', originalBlobUrl);

                img.style.display = 'block';
                deleteBtn.style.display = 'inline-block';

            } catch (error) {
                console.error('Image upload failed:', error);
                alert('사진 업로드에 실패했습니다.'); 
                img.src = '';
            } finally {
                img.style.opacity = '1.0';
            }
        }
    }

function createProposalHTML(data = null) {
        const d = data || {};
        // ✨ 수정: DB 컬럼명(소문자)으로 읽기
        const isComplete = d.statustype === '완료일'; // 👈 'd.statustype' (O)
        
        // ✨ 추가: 저장된 원본 URL을 가져옵니다.
        // ✨ 수정: DB 컬럼명(소문자)으로 읽기
        const originalBeforeUrl = d.imagebefore || ''; // 👈 'd.imagebefore' (O)
        // ✨ 추가: 표시할 URL은 프록시 API를 통하도록 합니다.
        // (이전에 `\` (백슬래시)가 잘못 들어갔던 부분 수정)
        const displayBeforeUrl = originalBeforeUrl ? `/api/get-image?url=${encodeURIComponent(originalBeforeUrl)}` : '';
        
        // ✨ 수정: DB 컬럼명(소문자)으로 읽기
        const originalAfterUrl = d.imageafter || ''; // 👈 'd.imageafter' (O)
        const displayAfterUrl = originalAfterUrl ? `/api/get-image?url=${encodeURIComponent(originalAfterUrl)}` : '';

        // (이전에 `\` (백슬래시)가 잘못 들어갔던 부분 수정)
        return `
            <div class="proposal-card-header">
                <div class="proposal-title-group-horizontal"><label>제안명</label><input type="text" placeholder="제안명을 입력하세요..." class="proposal-title-input data-field" data-key="title" value="${d.title || ''}"></div>
                <div class="proposal-header-controls"><button class="btn btn-toggle btn-toggle-details">확장</button><button class="btn btn-delete btn-delete-proposal">삭제</button></div>
            </div>
            <div class="proposal-card-body" style="display: none;">
                <div class="proposal-main-row">
                    <div class="form-group form-group-proposer"><label>제안자</label><input type="text" value="최인규" readonly class="input-proposer"></div>
                    <div class="form-group"><label>제안일자</label><input type="date" value="${formatDateForInput(d.date)}" class="data-field" data-key="date"></div>
                    <div class="form-group"><label>제안유형</label><select class="data-field" data-key="type"><option value="" ${!d.type ? 'selected' : ''}>선택...</option><option value="작업방법 개선" ${d.type === '작업방법 개선' ? 'selected' : ''}>작업방법 개선</option><option value="원가 절감" ${d.type === '원가 절감' ? 'selected' : ''}>원가 절감</option><option value="사무제도 개선" ${d.type === '사무제도 개선' ? 'selected' : ''}>사무제도 개선</option><option value="기타" ${d.type === '기타' ? 'selected' : ''}>기타</option></select></div>
                    
                    <div class="form-group form-group-combined"><div><label>완료여부</label><select class="data-field" data-key="statusType"><option value="미완료(목표일)" ${!isComplete ? 'selected' : ''}>미완료(목표일)</option><option value="완료일" ${isComplete ? 'selected' : ''}>완료일</option></select></div><div><label>날짜</label><input type="date" value="${formatDateForInput(d.statusdate)}" class="data-field" data-key="statusDate"></div></div>
                    
                    <div class="form-group calc-formula"><label>절감금액 산출식</label><input type="text" value="${d.calc || ''}" class="data-field" data-key="calc"></div>
                    <div class="form-group"><label>예상 절감금액</label><div class="currency-input"><input type="text" value="${(d.amount || 0).toLocaleString()}" class="data-field amount-input" data-key="amount"><span class="currency-symbol">원</span></div></div>
                </div>
                <div class="proposal-details-row"><div class="details-grid">
                    <div class="details-column form-group">
                        <label>개선 전 (텍스트)</label><textarea rows="4" class="data-field textarea-before" data-key="textBefore">${d.textbefore || ''}</textarea>
                        <div class="image-section"><label class="label-image-upload">개선 전 (사진)</label><div class="image-upload-controls"><label class="btn-upload">파일선택<input type="file" accept="image/*" class="image-upload"></label><button class="btn btn-delete-image" style="${originalBeforeUrl ? '' : 'display:none;'}">삭제</button></div>
                        <img class="image-preview img-preview-before" alt="개선 전 미리보기" style="${originalBeforeUrl ? 'display:block;' : 'display:none;'}" src="${displayBeforeUrl}" data-blob-url="${originalBeforeUrl}"></div>
                    </div>
                    <div class="details-column form-group">
                        <label>개선 후 (텍스트)</label><textarea rows="4" class="data-field textarea-after" data-key="textAfter">${d.textafter || ''}</textarea>
                        <div class="image-section"><label class="label-image-upload">개선 후 (사진)</label><div class="image-upload-controls"><label class="btn-upload">파일선택<input type="file" accept="image/*" class="image-upload"></label><button class="btn btn-delete-image" style="${originalAfterUrl ? '' : 'display:none;'}">삭제</button></div>
                        <img class="image-preview img-preview-after" alt="개선 후 미리보기" style="${originalAfterUrl ? 'display:block;' : 'display:none;'}" src="${displayAfterUrl}" data-blob-url="${originalAfterUrl}"></div>
                    </div>
                </div></div>
            </div>
        `;
    }
    
// inkyu.js의 saveProposals 함수를 이걸로 교체
async function saveProposals() {
        const proposalCards = document.querySelectorAll('.proposal-card');
        const proposalsData = [];

        // ✨ --- 유효성 검사 시작 ---
        for (const card of proposalCards) {
            const titleField = card.querySelector('.data-field[data-key="title"]');
            const typeField = card.querySelector('.data-field[data-key="type"]');

            if (!titleField.value) {
                alert('저장할 수 없습니다: "제안명"이 비어있는 항목이 있습니다.');
                titleField.focus(); // 해당 입력창으로 포커스
                throw new Error('Proposal title is empty.'); // 저장 중단
            }
            if (!typeField.value) {
                alert('저장할 수 없습니다: "제안유형"이 선택되지 않은 항목이 있습니다.');
                typeField.focus(); // 해당 선택창으로 포커스
                throw new Error('Proposal type is empty.'); // 저장 중단
            }
        }
        // ✨ --- 유효성 검사 끝 ---
        proposalCards.forEach(card => {
            const data = {};
            
            // ✨ 수정: amount 필드를 특별 처리하는 로직으로 변경
            card.querySelectorAll('.data-field').forEach(field => {
                const key = field.dataset.key;
                let value = field.value;

                if (key === 'amount') {
                    // 1. 콤마 제거
                    value = value.replace(/,/g, ''); 
                    // 2. 빈 문자열이거나 숫자가 아니면 0으로, 아니면 숫자로 변환
                    data[key] = parseFloat(value) || 0; 
                } else {
                    data[key] = value;
                }
            });

            // .src가 Vercel Blob URL이 맞는지 확인하는 함수
            const getSafeUrl = (url) => {
            // ✨ 수정: 'blob.vercel-storage.com'을 포함하는 URL만 허용
            if (url && url.includes('blob.vercel-storage.com')) {
                if (url.endsWith('.html')) { // .html 버그 방지는 유지
                    return '';
                }
                return url; // 올바른 Blob URL만 반환
            }
            return ''; // 그 외 (프록시 URL 등)는 모두 빈 문자열로 처리 
            };
            
            // data-blob-url 속성에서 원본 URL만 읽어 저장합니다. (fallback 제거)
const imgBefore = card.querySelector('.img-preview-before');
data.imageBefore = getSafeUrl(imgBefore.getAttribute('data-blob-url')); // 👈 || imgBefore.src 제거

const imgAfter = card.querySelector('.img-preview-after');
data.imageAfter = getSafeUrl(imgAfter.getAttribute('data-blob-url')); // 👈 || imgAfter.src 제거

            proposalsData.push(data);
        });
        
try {
            // ✨ 'response'를 받도록 수정
            const response = await fetch('/api/save-proposals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(proposalsData)
            });
            // ✨ 서버가 OK를 안주면 에러를 던짐
            if (!response.ok) {
                throw new Error(await response.text());
            }
} catch (error) {
// ✨ [수정] '저장' 실패 알림으로 변경
            console.error('Failed to save proposals:', error);
            alert('제안 저장에 실패했습니다. ' + error.message); 
            throw error; // ✨ [수정] '가짜 성공' 알림을 막기 위해 throw 추가
        }
    }

    async function loadProposals() {
        try {
            const response = await fetch('/api/get-proposals?_=' + new Date().getTime());
            const proposalsData = await response.json();
            if (proposalsData && proposalsData.length > 0) {
                proposalList.innerHTML = '';
                proposalsData.forEach(data => addNewProposal(data));
            }
        } catch (error) {
// ✨ [수정] '로딩' 실패 알림으로 변경
            console.error('Failed to load proposals:', error);
            alert('제안 목록 로딩에 실패했습니다.');
            // ✨ [수정] 로딩 실패는 throw 할 필요 없음
        }
    }
    
    if (addProposalBtn) addProposalBtn.addEventListener('click', () => addNewProposal(null));
    if (proposalList) {
        proposalList.addEventListener('click', handleProposalClick);
        proposalList.addEventListener('change', handleProposalChange);
        proposalList.addEventListener('input', (e) => {
            if (e.target.classList.contains('amount-input')) {
                const value = e.target.value.replace(/,/g, '');
                if (!isNaN(value) && value !== '') e.target.value = parseInt(value, 10).toLocaleString();
                else if (value === '') e.target.value = '';
                else e.target.value = e.target.value.slice(0, -1);
            }
            // if (e.target.classList.contains('data-field')) saveProposals(); // <-- ✨ 이 줄을 삭제하거나 주석 처리
        });
    }

    // =============================================================
    // ==== 6. 자동화 프로젝트 (Gantt) 기능 로직 ====
    // =============================================================

    const GANTT_START_DATE = new Date('2025-07-01');
    const GANTT_END_DATE = new Date('2027-07-01');
    const GANTT_TOTAL_DAYS = (GANTT_END_DATE - GANTT_START_DATE) / (1000 * 60 * 60 * 24);
    const GANTT_PROJECT_COL_WIDTH_PCT = (1.5 / 9.5) * 100;
    const GANTT_TIMELINE_AREA_WIDTH_PCT = (8 / 9.5) * 100;

    const initialGanttData = [
        { id: 1, name: "검사결과 기록 자동화", cost: 13770120, progress: 86, start: 1, span: 2, status: '진행중', 
            deliverySteps: ['인수', '이동중', '배달지', '배달중', '완료'],
            progressSteps: [
                { date: '2025-09-10', content: '개발', currentState: '요구사항 분석' },
                { date: '2025-10-22', content: '개발', currentState: 'UI 디자인' },
                { date: '2025-11-05', content: '테스트', currentState: '1차 테스트 완료' }
            ]
        },
        // ... (initialGanttData의 나머지 항목들) ...
        { id: 7, name: "자동화 프로그램 서버로 통합", cost: 0, progress: 16.7, start: 4, span: 5, status: '완료', deliverySteps: ['인수', '이동중', '배달지', '배달중', '완료'], progressSteps: [] }
    ];
    
    const ganttQuarters = ["25.Q3", "25.Q4", "26.Q1", "26.Q2", "26.Q3", "26.Q4", "27.Q1", "27.Q2"];
    const ganttStatuses = ['진행중', '진행예정', '완료'];
    const ganttStepIcons = ['인수', '이동중', '배달지', '배달중', '완료'];

    function calculateTodayMarkerLeftPct() {
        const elapsedDays = (new Date() - GANTT_START_DATE) / (1000 * 60 * 60 * 24);
        let timelineProgressPct = (elapsedDays / GANTT_TOTAL_DAYS) * 100;
        timelineProgressPct = Math.max(0, Math.min(100, timelineProgressPct)); 
        const todayLineLeftPct = (timelineProgressPct * (GANTT_TIMELINE_AREA_WIDTH_PCT / 100)) + GANTT_PROJECT_COL_WIDTH_PCT;
        return todayLineLeftPct;
    }

    function renderGanttChart(data) {
        const container = document.getElementById('gantt-chart-container');
        if (!container) return;
        const statusMap = {
            '진행중': { border: '#16a34a', fill: '#16a34a', text: 'text-green-700' },
            '진행예정': { border: '#2563eb', fill: '#2563eb', text: 'text-blue-700' },
            '완료': { border: '#6b7280', fill: '#6b7280', text: 'text-gray-700' }
        };
        const todayLeftPct = calculateTodayMarkerLeftPct();

        let headerHtml = `
            <div class="px-6 py-5 border-b">
                <h1 class="text-2xl font-bold text-gray-900">자동화 프로젝트 로드맵</h1>
                <p class="text-sm text-gray-600 mt-1">(데이터는 '프로젝트 관리' 버튼으로 편집/저장 가능)</p>
                <div class="gantt-legend mt-4">
                    <span class="legend-item"><span class="legend-color bg-green-500"></span>진행중</span>
                    <span class="legend-item"><span class="legend-color bg-blue-500"></span>진행예정</span>
                    <span class="legend-item"><span class="legend-color bg-gray-400"></span>완료</span>
                </div>
            </div>`;
        
        let gridHeaderHtml = `
            <div class="overflow-x-auto relative">
                <div class="min-w-[1200px] relative">
                    <div class="absolute bottom-0 w-0.5 bg-indigo-500 z-40" style="left: ${todayLeftPct}%; top: 2.5rem;">
                        <div class="absolute -top-1 -ml-1.5 w-3 h-3 bg-indigo-500 rounded-full"></div>
                    </div>
                    <div id="gantt-grid-body" class="gantt-grid grid" style="grid-template-columns: minmax(250px, 1.5fr) repeat(8, 1fr);">
                        <div class="gantt-header-cell gantt-sticky-col" style="height: 2.5rem; grid-column: 1 / span 1;"></div>
                        <div class="gantt-header-cell" style="grid-column: 2 / span 2;">2025년</div>
                        <div class="gantt-header-cell" style="grid-column: 4 / span 4;">2026년</div>
                        <div class="gantt-header-cell" style="grid-column: 8 / span 2;">2027년</div>
                        <div class="gantt-header-cell gantt-sticky-col" style="top: 2.5rem; height: 3rem; grid-column: 1 / span 1;">프로젝트 명</div>
                        <div class="gantt-header-cell" style="top: 2.5rem; height: 3rem; grid-column: 2 / span 1;">Q3</div>
                        <div class="gantt-header-cell bg-indigo-50" style="top: 2.5rem; height: 3rem; grid-column: 3 / span 1;">Q4</div>
                        <div class="gantt-header-cell" style="top: 2.5rem; height: 3rem; grid-column: 4 / span 1;">Q1</div>
                        <div class="gantt-header-cell" style="top: 2.5rem; height: 3rem; grid-column: 5 / span 1;">Q2</div>
                        <div class="gantt-header-cell" style="top: 2.5rem; height: 3rem; grid-column: 6 / span 1;">Q3</div>
                        <div class="gantt-header-cell" style="top: 2.5rem; height: 3rem; grid-column: 7 / span 1;">Q4</div>
                        <div class="gantt-header-cell" style="top: 2.5rem; height: 3rem; grid-column: 8 / span 1;">Q1</div>
                        <div class="gantt-header-cell" style="top: 2.5rem; height: 3rem; grid-column: 9 / span 1;">Q2</div>`;
        
        let projectsHtml = '';
        for (const project of data) {
            const statusInfo = statusMap[project.status] || statusMap.완료;
            const startCol = parseInt(project.start || 1) + 1; // 'start'가 null일 경우 대비
            const span = parseInt(project.span || 1); // 'span'이 null일 경우 대비
            const costText = project.cost > 0 ? `₩${project.cost.toLocaleString()}` : '절감액: -';
            const barText = `${ganttQuarters[project.start - 1]} - ${ganttQuarters[project.start + span - 2]}`;
            
            projectsHtml += `
                <div class="gantt-sticky-col gantt-grid-cell p-4 gantt-project-name-clickable" data-project-id="${project.id}" style="grid-column: 1 / span 1;">
                    <div class="font-semibold text-gray-900">${project.name}</div>
                    <div class="text-sm text-gray-600">예상 절감비용: ${costText}</div>
                    <div class="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                        <div class="h-2.5 rounded-full" style="width: ${project.progress}%; background-color: ${statusInfo.fill};"></div>
                    </div>
                    <div class="text-xs font-medium ${statusInfo.text} mt-1">${project.progress}% 완료</div>
                </div>
                <div class="gantt-grid-cell" style="grid-column: ${startCol} / span ${span}">
                    <div class="gantt-bar-container">
                        <div class="gantt-bar-outline" style="border-color: ${statusInfo.border};">
                            <div class="gantt-bar-fill" style="width: ${project.progress}%; background-color: ${statusInfo.fill};"></div>
                            <span class="relative z-10">${barText}</span>
                        </div>
                    </div>
                </div>`;
            const endCol = startCol + span;
            if (endCol <= 9) {
                projectsHtml += `<div class="gantt-grid-cell" style="grid-column: ${endCol} / span ${9 - endCol + 1};"></div>`;
            }
        }
        
        container.innerHTML = `
            ${headerHtml}
            <div class="overflow-x-auto relative">
                <div class="min-w-[1200px] relative">
                    ${gridHeaderHtml} ${projectsHtml} </div> </div> </div> `;
    }

    const ganttModalOverlay = document.getElementById('gantt-modal-overlay');
    const ganttEditForm = document.getElementById('gantt-edit-form');
    
    async function loadGanttData() {
        try {
            const response = await fetch('/api/get-gantt-data?_=' + new Date().getTime());
            const data = await response.json();
            if (!data || data.length === 0) {
                renderGanttChart(initialGanttData);
                return initialGanttData;
            } else {
                // ✨ 수정: try...catch로 JSON 파싱 오류를 안전하게 처리합니다.
                const parsedData = data.map(project => {
                    
                    // Vercel Postgres는 컬럼명을 소문자로 반환합니다.
                    let deliverySteps = project.deliverysteps;
                    let progressSteps = project.progresssteps;
    
                    // 1. deliverySteps 파싱 시도
                    try {
                        // 문자열일 경우에만 파싱 시도
                        if (typeof deliverySteps === 'string') {
                            // JSON.parse(null)은 null을 반환, JSON.parse("[]")는 []를 반환
                            // 하지만 JSON.parse("")는 오류를 발생시킴
                            deliverySteps = JSON.parse(deliverySteps);
                        }
                    } catch (e) {
                        console.error('Failed to parse deliverySteps:', project.deliverysteps, e);
                        // 파싱 실패 시(예: 빈 문자열) 안전하게 빈 배열로 처리
                        deliverySteps = []; 
                    }
    
                    // 2. progressSteps 파싱 시도
                    try {
                        if (typeof progressSteps === 'string') {
                            progressSteps = JSON.parse(progressSteps);
                        }
                    } catch (e) {
                        console.error('Failed to parse progressSteps:', project.progresssteps, e);
                        // 파싱 실패 시 안전하게 빈 배열로 처리
                        progressSteps = [];
                    }
    
                    return {
                        ...project,
                        deliverySteps: deliverySteps, // 파싱된 값 (또는 원본)
                        progressSteps: progressSteps  // 파싱된 값 (또는 원본)
                    };
                });
    
                renderGanttChart(parsedData); // 👈 수정된 데이터로 차트 그리기
                return parsedData;
            }
        // ✨ [수정] 누락되었던 Outer catch 블록을 여기에 추가합니다.
        } catch (error) { 
            console.error(error);
            renderGanttChart(initialGanttData);
            return initialGanttData;
        }
    } // 👈 함수의 닫는 괄호

    function createGanttEditItemHTML(project = null) {
        const p = project || { id: `new-${Date.now()}`, name: "새 프로젝트", cost: 0, progress: 0, start: 1, span: 1, status: '진행예정', deliverySteps: ['인수', '이동중', '배달지', '배달중', '완료'], progressSteps: [] };
        let quarterOptions = '';
        ganttQuarters.forEach((q, index) => quarterOptions += `<option value="${index + 1}" ${p.start == (index + 1) ? 'selected' : ''}>${q}</option>`);
        let statusOptions = '';
        ganttStatuses.forEach(s => statusOptions += `<option value="${s}" ${p.status === s ? 'selected' : ''}>${s}</option>`);
        const costValue = p.cost > 0 ? p.cost.toLocaleString() : (p.cost === 0 ? '' : p.cost);

        let deliveryStepsHtml = '<h5 class="gantt-steps-title">진행 단계(팝업) 편집</h5><div class="gantt-delivery-steps-editor">';
        const defaultSteps = (p.deliverySteps && p.deliverySteps.length > 0) ? p.deliverySteps : ['인수', '이동중', '배달지', '배달중', '완료'];
        defaultSteps.forEach((step, index) => {
            deliveryStepsHtml += `
                <div class="gantt-form-group">
                    <label>단계 ${index + 1}</label>
                    <input type="text" class="gantt-delivery-step" value="${step}">
                </div>`;
        });
        deliveryStepsHtml += '</div>';
        
        let stepsEditorHtml = '<h5 class="gantt-steps-title">진행 상황 편집</h5><div class="gantt-progress-steps-editor">';
        if (p.progressSteps && p.progressSteps.length > 0) {
            p.progressSteps.forEach((step, index) => {
                stepsEditorHtml += createGanttStepItemHTML(step, index);
            });
        }
        stepsEditorHtml += '</div><button class="btn btn-add-step gantt-step-add-btn">+ 진행 상황 추가</button>';

        return `
            <div class="gantt-edit-item" data-id="${p.id}">
                <button class="gantt-delete-project-btn" title="프로젝트 삭제">×</button>
                <h4>${p.name}</h4>
                <div class="gantt-edit-grid">
                    <div class="gantt-form-group"><label>프로젝트명</label><input type="text" class="gantt-name" value="${p.name}"></div>
                    <div class="gantt-form-group"><label>예상 절감비용</label><div class="gantt-currency-input"><span class="currency-symbol-modal">₩</span><input type="text" class="gantt-cost gantt-amount-input" value="${costValue}"></div></div>
                    <div class="gantt-form-group"><label>진행률 (%)</label><input type="number" class="gantt-progress" value="${p.progress}" min="0" max="100"></div>
                    <div class="gantt-form-group"><label>시작 분기</label><select class="gantt-start">${quarterOptions}</select></div>
                    <div class="gantt-form-group"><label>소요 분기 (Span)</label><input type="number" class="gantt-span" value="${p.span}" min="1"></div>
                    <div class="gantt-form-group"><label>상태</label><select class="gantt-status">${statusOptions}</select></div>
                </div>
                ${deliveryStepsHtml}
                ${stepsEditorHtml}
            </div>`;
    }

    function createGanttStepItemHTML(step = null) {
        const s = step || { date: '', content: '', currentState: '' };
        return `
            <div class="gantt-step-item">
                <div class="gantt-step-grid">
                    <div class="gantt-form-group"><label>날짜</label><input type="text" class="gantt-step-date" value="${s.date}" placeholder="YYYY-MM-DD"></div>
                    <div class="gantt-form-group"><label>내용</label><input type="text" class="gantt-step-content" value="${s.content}"></div>
                    <div class="gantt-form-group"><label>현재상태</label><input type="text" class="gantt-step-currentState" value="${s.currentState}"></div>
                </div>
                <button class="gantt-step-delete-btn" title="진행상황 삭제">×</button>
            </div>`;
    }
    
    async function openGanttModal() { // ✨ 'async' 추가
        const data = await loadGanttData(); // ✨ 'await' 추가
        const controlsHTML = `<div class="gantt-form-controls"><button id="add-gantt-project-btn" class="btn btn-add">프로젝트 추가 +</button></div>`;
        let itemsHTML = '';
        data.forEach(project => itemsHTML += createGanttEditItemHTML(project));
        ganttEditForm.innerHTML = controlsHTML + itemsHTML;
        ganttModalOverlay.style.display = 'flex';
    }
    
// inkyu.js의 saveAndCloseGanttModal 함수를 이걸로 교체
async function saveAndCloseGanttModal() {
        const newGanttData = [];
        const items = ganttEditForm.querySelectorAll('.gantt-edit-item');

// ✨ --- 이 부분을 추가하세요 ---
        for (const item of items) {
            const nameField = item.querySelector('.gantt-name');
            if (!nameField.value) {
                alert('저장할 수 없습니다: "프로젝트명"이 비어있는 항목이 있습니다.');
                nameField.focus(); // 해당 입력창으로 포카스
                return; // 👈 함수를 중단 (throw 대신 return)
            }
        }
        // ✨ --- 여기까지 ---

        items.forEach(item => {
            let costVal = item.querySelector('.gantt-cost').value.replace(/,/g, '');
            if (costVal === '' || isNaN(costVal)) costVal = 0;
            
            const deliverySteps = [];
            item.querySelectorAll('.gantt-delivery-step').forEach(stepInput => {
                deliverySteps.push(stepInput.value);
            });
            
            const progressSteps = [];
            item.querySelectorAll('.gantt-step-item').forEach(stepItem => {
                progressSteps.push({
                    date: stepItem.querySelector('.gantt-step-date').value,
                    content: stepItem.querySelector('.gantt-step-content').value,
                    currentState: stepItem.querySelector('.gantt-step-currentState').value
                });
            });
            
newGanttData.push({
                name: item.querySelector('.gantt-name').value,
                cost: parseFloat(costVal),
                progress: parseFloat(item.querySelector('.gantt-progress').value) || 0, // 👈 || 0 추가
                start: parseInt(item.querySelector('.gantt-start').value, 10) || 1,     // 👈 1로 수정
                span: parseInt(item.querySelector('.gantt-span').value, 10) || 1,      // 👈 1로 수정
                status: item.querySelector('.gantt-status').value,
                
                // ✨ 수정: DB(JSONB)에 맞게 배열을 JSON 문자열로 변환
                deliverySteps: JSON.stringify(deliverySteps),
                progressSteps: JSON.stringify(progressSteps)
            });
        });

        try {
            const response = await fetch('/api/save-gantt-data', { // 👈 [수정] response 변수 추가
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newGanttData)
            });
            if (!response.ok) throw new Error('서버 저장 실패'); // 👈 [추가] 에러 잡기
        } catch (error) {
            console.error('Failed to save Gantt data:', error);
            alert('Gantt 데이터 저장에 실패했습니다.');
            return; // 👈 [추가] 실패 시 함수 중단
        }
        
        // ✨ [수정] DB에서 진짜 데이터를 다시 로드
        await loadGanttData(); 
        ganttModalOverlay.style.display = 'none';
    }

    function addNewGanttProjectFormItem() {
        const newItemHTML = createGanttEditItemHTML(null);
        ganttEditForm.insertAdjacentHTML('beforeend', newItemHTML);
        ganttEditForm.scrollTop = ganttEditForm.scrollHeight;
    }

    const ganttDetailsModalOverlay = document.getElementById('gantt-details-modal-overlay');
    
    async function openGanttDetailsModal(projectId) { // ✨ 'async' 추가
        const data = await loadGanttData(); // ✨ 'await' 추가
        const project = data.find(p => p.id == projectId);
        if (!project) return;

        const titleEl = document.getElementById('gantt-details-title');
        const stepsEl = document.getElementById('gantt-details-steps');
        const tableEl = document.getElementById('gantt-details-table');

        titleEl.textContent = `${project.name} - 진행 현황`;

        let stepsHtml = '';
        const stepLabels = (project.deliverySteps && project.deliverySteps.length > 0) ? project.deliverySteps : ganttStepIcons;
        let activeStepIndex = Math.floor(project.progress / (100 / stepLabels.length)) - 1;
        if (project.progress === 100) activeStepIndex = stepLabels.length - 1;
        if (project.progress === 0) activeStepIndex = -1;

        stepLabels.forEach((label, index) => {
            const isActive = index <= activeStepIndex ? 'is-active' : '';
            stepsHtml += `<div class="gantt-step ${isActive}"><div class="gantt-step-icon">✓</div><div class="gantt-step-label">${label}</div></div>`;
        });
        stepsEl.innerHTML = stepsHtml;
        
        let tableHtml = `<table class="gantt-details-table"><thead><tr><th>완료날짜</th><th>내용</th><th>현재상태</th></tr></thead><tbody>`;
        if (project.progressSteps && project.progressSteps.length > 0) {
            [...project.progressSteps].reverse().forEach(step => {
                tableHtml += `<tr><td>${step.date}</td><td>${step.content}</td><td>${step.currentState}</td></tr>`;
            });
        } else {
            tableHtml += `<tr><td colspan="3" style="text-align: center; color: #888;">입력된 진행 상황이 없습니다.</td></tr>`;
        }
        tableHtml += `</tbody></table>`;
        tableEl.innerHTML = tableHtml;

        ganttDetailsModalOverlay.style.display = 'flex';
    }


    // --- 6.6. 이벤트 리스너 연결 ---
    
    const openGanttBtn = document.getElementById('open-gantt-modal-btn');
    if (openGanttBtn) openGanttBtn.addEventListener('click', openGanttModal);
    
    const closeGanttBtn = document.getElementById('close-gantt-modal-btn');
    if (closeGanttBtn) closeGanttBtn.addEventListener('click', () => { ganttModalOverlay.style.display = 'none'; });
    
    const saveGanttBtn = document.getElementById('save-gantt-btn');
    if (saveGanttBtn) saveGanttBtn.addEventListener('click', saveAndCloseGanttModal);
    
    const closeDetailsBtn = document.getElementById('close-gantt-details-btn');
    if (closeDetailsBtn) closeDetailsBtn.addEventListener('click', () => { ganttDetailsModalOverlay.style.display = 'none'; });

    const ganttChartBody = document.getElementById('gantt-chart-container');
    if (ganttChartBody) {
        ganttChartBody.addEventListener('click', function(e) {
            const toggle = e.target.closest('.gantt-project-name-clickable');
            if (toggle) {
                const projectId = toggle.dataset.projectId;
                openGanttDetailsModal(projectId);
            }
        });
    }

    if (ganttModalOverlay) {
        ganttModalOverlay.addEventListener('click', function(e) {
            if (e.target.id === 'add-gantt-project-btn') addNewGanttProjectFormItem();
            if (e.target.classList.contains('gantt-delete-project-btn')) {
                if (confirm('이 프로젝트를 삭제하시겠습니까? (저장 후 닫기를 눌러야 최종 반영됩니다)')) {
                    e.target.closest('.gantt-edit-item').remove();
                }
            }
            if (e.target.classList.contains('gantt-step-add-btn')) {
                const editor = e.target.closest('.gantt-edit-item').querySelector('.gantt-progress-steps-editor');
                editor.insertAdjacentHTML('beforeend', createGanttStepItemHTML(null));
            }
            if (e.target.classList.contains('gantt-step-delete-btn')) {
                e.target.closest('.gantt-step-item').remove();
            }
        });
        
        ganttModalOverlay.addEventListener('input', function(e) {
            if (e.target.classList.contains('gantt-amount-input')) {
                const value = e.target.value.replace(/,/g, '');
                if (!isNaN(value) && value !== '') e.target.value = parseInt(value, 10).toLocaleString();
                else if (value === '') e.target.value = '';
                else e.target.value = e.target.value.slice(0, -1);
            }
        });
    }

    // --- AMAT Modal ---
    const openAmatBtn = document.getElementById('open-amat-modal-btn');
    const closeAmatBtn = document.getElementById('close-amat-modal-btn');
    const saveAmatBtn = document.getElementById('save-amat-btn');
    const amatModalOverlay = document.getElementById('amat-modal-overlay');

    if (openAmatBtn) openAmatBtn.addEventListener('click', openAmatModal);
    if (closeAmatBtn) closeAmatBtn.addEventListener('click', () => { amatModalOverlay.style.display = 'none'; });
    if (saveAmatBtn) saveAmatBtn.addEventListener('click', saveAndCloseAmatModal);
    if (amatModalOverlay) {
        amatModalOverlay.addEventListener('click', function(e) {
            if (e.target.id === 'add-amat-item-btn') {
                const container = amatModalOverlay.querySelector('.amat-items-container');
                container.insertAdjacentHTML('beforeend', createAmatEditItemHTML(null));
            }
            if (e.target.classList.contains('gantt-step-delete-btn')) {
                e.target.closest('.gantt-step-item').remove();
            }
        });
    }

    // --- Setting Modal ---
    const openSettingBtn = document.getElementById('open-setting-modal-btn');
    const closeSettingBtn = document.getElementById('close-setting-modal-btn');
    const saveSettingBtn = document.getElementById('save-setting-btn');
    const settingModalOverlay = document.getElementById('setting-modal-overlay');

    if (openSettingBtn) openSettingBtn.addEventListener('click', openSettingModal);
    if (closeSettingBtn) closeSettingBtn.addEventListener('click', () => { settingModalOverlay.style.display = 'none'; });
    if (saveSettingBtn) saveSettingBtn.addEventListener('click', saveAndCloseSettingModal);
    if (settingModalOverlay) {
        settingModalOverlay.addEventListener('click', function(e) {
            if (e.target.id === 'add-setting-item-btn') {
                const container = settingModalOverlay.querySelector('.setting-items-container');
                container.insertAdjacentHTML('beforeend', createSettingEditItemHTML(null));
            }
            if (e.target.classList.contains('gantt-step-delete-btn')) {
                e.target.closest('.gantt-step-item').remove();
            }
        });
    }

// --- ✨ '제안' 수동 저장 버튼 연결 ---
const saveProposalsBtn = document.getElementById('save-proposals-btn');
if (saveProposalsBtn) {
    // 1. 이벤트 핸들러를 'async'로 변경
    saveProposalsBtn.addEventListener('click', async () => { 
        try {
            // 2. 'await'로 saveProposals()가 끝날 때까지 기다림
            await saveProposals(); 
            // 3. 성공했을 때만 이 알림이 뜸
            alert('모든 제안이 저장되었습니다.'); 
        } catch (error) {
            // 4. (2.1에서 던진) 에러가 발생하면 여기로 와서 "저장 성공" 알림이 뜨지 않음
            console.error('Save operation failed, alert already shown.');
        }
    });
}
// ✨ --- 여기까지 추가 ---

    // --- 페이지 로드 시 DB에서 데이터 가져오기 ---
    loadAmatData(); 
    loadSettingData();
    loadProposals();
    loadGanttData();

}); // <-- DOMContentLoaded 래퍼의 닫는 괄호