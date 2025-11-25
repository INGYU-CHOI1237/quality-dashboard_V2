import React, { useState, useEffect } from 'react';
import * as d3 from 'd3';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ChartDataLabels
);

const Inkyu = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [trainingData, setTrainingData] = useState([]);
    const [amatData, setAmatData] = useState([]);
    const [settingData, setSettingData] = useState([]);
    const [ganttData, setGanttData] = useState([]);

    // Default Data
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
    const initialGanttData = [
        { id: 1, name: "검사결과 기록 자동화", cost: 13770120, progress: 86, start: 1, span: 2, status: '진행중', deliverySteps: [], progressSteps: [] },
        { id: 2, name: "CMM 검사결과 저장 자동화", cost: 3071795, progress: 100, start: 1, span: 2, status: '완료', deliverySteps: [], progressSteps: [] },
        { id: 3, name: "QM 대시보드", cost: 0, progress: 80, start: 1, span: 3, status: '진행중', deliverySteps: [], progressSteps: [] },
        { id: 4, name: "포장 원자재 E1 자동화", cost: 0, progress: 23, start: 1, span: 4, status: '진행중', deliverySteps: [], progressSteps: [] },
        { id: 5, name: "긴급검사 요청 자동화", cost: 0, progress: 0, start: 1, span: 4, status: '진행예정', deliverySteps: [], progressSteps: [] },
        { id: 6, name: "Rev 알림 자동화", cost: 0, progress: 0, start: 1, span: 4, status: '진행예정', deliverySteps: [], progressSteps: [] },
        { id: 7, name: "자동화 프로그램 서버로 통합", cost: 0, progress: 0, start: 6, span: 3, status: '진행예정', deliverySteps: [], progressSteps: [] }
    ];

    useEffect(() => {
        // Force re-login for now to ensure modal is seen and tested
        // if (sessionStorage.getItem('inkyu_auth_v2') === 'true') {
        //     setIsAuthenticated(true);
        // }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            d3.csv('/data/Training.csv').then(data => {
                const filtered = data.filter(row => row['성명'] === '최인규');
                setTrainingData(filtered);
            }).catch(err => console.error("Training CSV Load Error:", err));

            setAmatData(defaultAmatData);
            setSettingData(defaultSettingData);
            setGanttData(initialGanttData);
        }
    }, [isAuthenticated]);

    const handleLogin = (e) => {
        e.preventDefault();
        if (password === 'eunseom_240826') {
            setIsAuthenticated(true);
            sessionStorage.setItem('inkyu_auth_v2', 'true');
        } else {
            alert('비밀번호가 틀렸습니다.');
        }
    };

    const chartOptions = {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            datalabels: { anchor: 'end', align: 'end', font: { weight: 'bold' }, formatter: (v) => v.toLocaleString() }
        },
        scales: { x: { beginAtZero: true } }
    };

    const [selectedProject, setSelectedProject] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editGanttData, setEditGanttData] = useState([]);

    // Gantt Helpers
    const ganttQuarters = ["25.Q3", "25.Q4", "26.Q1", "26.Q2", "26.Q3", "26.Q4", "27.Q1", "27.Q2"];
    const ganttStatuses = ['진행중', '진행예정', '완료'];
    const ganttStepIcons = ['인수', '이동중', '배달지', '배달중', '완료']; // Default steps

    const GANTT_START_DATE = new Date('2025-07-01');
    const GANTT_END_DATE = new Date('2027-07-01');
    const GANTT_TOTAL_DAYS = (GANTT_END_DATE - GANTT_START_DATE) / (1000 * 60 * 60 * 24);
    const GANTT_PROJECT_COL_WIDTH_PCT = (1.5 / 9.5) * 100;
    const GANTT_TIMELINE_AREA_WIDTH_PCT = (8 / 9.5) * 100;

    const calculateTodayMarkerLeftPct = () => {
        const elapsedDays = (new Date() - GANTT_START_DATE) / (1000 * 60 * 60 * 24);
        let pct = (elapsedDays / GANTT_TOTAL_DAYS) * 100;
        pct = Math.max(0, Math.min(100, pct));
        return (pct * (GANTT_TIMELINE_AREA_WIDTH_PCT / 100)) + GANTT_PROJECT_COL_WIDTH_PCT;
    };
    const todayLeftPct = calculateTodayMarkerLeftPct();
    const statusMap = {
        '진행중': { border: '#16a34a', fill: '#16a34a', text: 'text-green-700' },
        '진행예정': { border: '#2563eb', fill: 'transparent', text: 'text-blue-700' },
        '완료': { border: '#6b7280', fill: '#6b7280', text: 'text-gray-700' }
    };

    const handleProjectClick = (project) => {
        setSelectedProject(project);
    };

    const handleEditClick = () => {
        // Deep copy to avoid mutating state directly during edits
        setEditGanttData(JSON.parse(JSON.stringify(ganttData)));
        setIsEditModalOpen(true);
    };

    const handleSaveGantt = () => {
        setGanttData(editGanttData);
        setIsEditModalOpen(false);
        // In a real app, you would save to backend here
    };

    const handleAddProject = () => {
        const newProject = {
            id: `new-${Date.now()}`,
            name: "새 프로젝트",
            cost: 0,
            progress: 0,
            start: 1,
            span: 1,
            status: '진행예정',
            deliverySteps: ['인수', '이동중', '배달지', '배달중', '완료'],
            progressSteps: []
        };
        setEditGanttData([...editGanttData, newProject]);
    };

    const handleDeleteProject = (index) => {
        if (window.confirm('이 프로젝트를 삭제하시겠습니까?')) {
            const newData = [...editGanttData];
            newData.splice(index, 1);
            setEditGanttData(newData);
        }
    };

    const handleEditChange = (index, field, value) => {
        const newData = [...editGanttData];
        newData[index][field] = value;
        setEditGanttData(newData);
    };

    const handleStepChange = (projectIndex, stepIndex, value) => {
        const newData = [...editGanttData];
        if (!newData[projectIndex].deliverySteps) {
            newData[projectIndex].deliverySteps = [...ganttStepIcons];
        }
        newData[projectIndex].deliverySteps[stepIndex] = value;
        setEditGanttData(newData);
    };

    // New Handlers for Progress Status (Detailed Steps)
    const handleAddProgressStep = (projectIndex) => {
        const newData = [...editGanttData];
        if (!newData[projectIndex].progressSteps) {
            newData[projectIndex].progressSteps = [];
        }
        newData[projectIndex].progressSteps.push({ date: '', content: '', currentState: '' });
        setEditGanttData(newData);
    };

    const handleDeleteProgressStep = (projectIndex, stepIndex) => {
        const newData = [...editGanttData];
        newData[projectIndex].progressSteps.splice(stepIndex, 1);
        setEditGanttData(newData);
    };

    const handleProgressStepChange = (projectIndex, stepIndex, field, value) => {
        const newData = [...editGanttData];
        newData[projectIndex].progressSteps[stepIndex][field] = value;
        setEditGanttData(newData);
    };

    if (!isAuthenticated) {
        return (
            <div className="login-modal-overlay">
                <div className="login-modal-card">
                    <h2 className="login-modal-title">Enter Password</h2>
                    <p className="login-modal-subtitle">Access to this section is restricted.</p>
                    <form onSubmit={handleLogin} className="login-modal-form">
                        <input
                            type="password"
                            className="login-modal-input"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <div className="login-modal-actions">
                            <button type="submit" className="login-modal-btn btn-submit">Submit</button>
                            <button type="button" className="login-modal-btn btn-close" onClick={() => window.location.href = '/'}>Close</button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div id="inkyu-choi-page" className="dashboard-body" style={{ flexDirection: 'column' }}>

            {/* Top Row: AMAT & Setting Charts */}
            <div className="grid-row">
                {/* Left Column: AMAT */}
                <div className="main-column">
                    <div className="category-container">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #a56eff', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: '0 0 0.5rem 0', padding: 0, border: 'none' }}>AMAT FAI CMM 프로그램 작성 현황</h2>
                            <button className="btn btn-toggle" style={{ marginBottom: '0.5rem' }}>데이터 관리</button>
                        </div>
                        <div className="sub-section">
                            <div className="card">
                                <div className="chart-container" style={{ minHeight: '300px' }}>
                                    <Bar
                                        data={{
                                            labels: amatData.map(d => d.label),
                                            datasets: [{
                                                label: '검사 건수',
                                                data: amatData.map(d => d.value),
                                                backgroundColor: ['#343a40', '#007bff', '#6c757d', '#fd7e14', '#28a745'],
                                                borderColor: '#ffffff',
                                                borderWidth: 1
                                            }]
                                        }}
                                        options={chartOptions}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Setting */}
                <div className="main-column">
                    <div className="category-container">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #a56eff', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: '0 0 0.5rem 0', padding: 0, border: 'none' }}>세팅품 검사이력</h2>
                            <button className="btn btn-toggle" style={{ marginBottom: '0.5rem' }}>데이터 관리</button>
                        </div>
                        <div className="sub-section">
                            <div className="card">
                                <div className="chart-container" style={{ minHeight: '300px' }}>
                                    <Bar
                                        data={{
                                            labels: settingData.map(d => d.label),
                                            datasets: [{
                                                label: '검사 이력 건수',
                                                data: settingData.map(d => d.value),
                                                backgroundColor: '#17a2b8',
                                                borderColor: '#ffffff',
                                                borderWidth: 1
                                            }]
                                        }}
                                        options={chartOptions}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Middle Row: Training Table */}
            <div className="grid-row">
                <div className="full-width-column">
                    <div className="category-container">
                        <h2>교육 이력 (Training.csv)</h2>
                        <div className="sub-section">
                            <div className="card">
                                <div id="training-table-container" style={{ overflowX: 'auto' }}>
                                    <table className="training-table">
                                        <thead>
                                            <tr>
                                                <th>과정명</th>
                                                <th>교육시작일</th>
                                                <th>교육종료일</th>
                                                <th>교육시간</th>
                                                <th>교육기관</th>
                                                <th>수료여부</th>
                                                <th>상태</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {trainingData.map((row, idx) => (
                                                <tr key={idx}>
                                                    <td>{row['과정명']}</td>
                                                    <td>{row['교육시작일']}</td>
                                                    <td>{row['교육종료일']}</td>
                                                    <td>{row['교육시간']}</td>
                                                    <td>{row['교육기관']}</td>
                                                    <td>{row['수료여부']}</td>
                                                    <td className={row['상태'].includes('완료') ? 'status-complete' : 'status-in-progress'}>
                                                        {row['상태']}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Proposals */}
            <div className="grid-row">
                <div className="full-width-column">
                    <div className="category-container">
                        <h2>제안</h2>
                        <div className="sub-section">
                            <div className="proposal-controls">
                                <button className="btn btn-add">제안 추가 +</button>
                                <button className="btn btn-save" style={{ marginLeft: '10px' }}>제안 일괄 저장</button>
                            </div>
                            <div id="proposal-list">
                                <div className="card proposal-card">
                                    <div className="proposal-card-body">
                                        <p>제안 기능은 현재 React 마이그레이션 중입니다.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Gantt */}
            <div className="grid-row">
                <div className="full-width-column">
                    <div className="category-container">
                        <div className="gantt-section-header" style={{ borderBottom: 'none', justifyContent: 'flex-end' }}>
                            <div className="proposal-controls">
                                <button className="btn btn-toggle" onClick={handleEditClick}>프로젝트 관리</button>
                            </div>
                        </div>
                        <div className="sub-section">
                            <div id="gantt-chart-container" className="gantt-chart-wrapper" style={{ overflowX: 'hidden' }}>
                                <div className="px-6 py-5 border-b">
                                    <h1 className="text-2xl font-bold text-gray-900">자동화 프로젝트 로드맵</h1>
                                    <p className="text-sm text-gray-600 mt-1">(데이터는 '프로젝트 관리' 버튼으로 편집/저장 가능)</p>
                                    <div className="gantt-legend mt-4">
                                        <span className="legend-item"><span className="legend-color bg-green-500"></span>진행중</span>
                                        <span className="legend-item"><span className="legend-color bg-blue-500"></span>진행예정</span>
                                        <span className="legend-item"><span className="legend-color bg-gray-400"></span>완료</span>
                                    </div>
                                </div>
                                <div className="relative w-full">
                                    <div className="relative w-full">
                                        <div className="absolute bottom-0 w-0.5 bg-indigo-500 z-40" style={{ left: `${todayLeftPct}%`, top: '2.5rem' }}>
                                            <div className="absolute -top-1 -ml-1.5 w-3 h-3 bg-indigo-500 rounded-full"></div>
                                        </div>
                                        <div className="gantt-grid grid" style={{ gridTemplateColumns: '250px repeat(8, 1fr)', alignContent: 'start', gridAutoRows: 'max-content' }}>
                                            <div className="gantt-header-cell gantt-sticky-col" style={{ height: '2.5rem', gridColumn: '1 / span 1' }}></div>
                                            <div className="gantt-header-cell" style={{ gridColumn: '2 / span 2' }}>2025년</div>
                                            <div className="gantt-header-cell" style={{ gridColumn: '4 / span 4' }}>2026년</div>
                                            <div className="gantt-header-cell" style={{ gridColumn: '8 / span 2' }}>2027년</div>

                                            <div className="gantt-header-cell gantt-sticky-col" style={{ top: '2.5rem', height: '3rem', gridColumn: '1 / span 1' }}>프로젝트 명</div>
                                            <div className="gantt-header-cell" style={{ top: '2.5rem', height: '3rem', gridColumn: '2 / span 1' }}>Q3</div>
                                            <div className="gantt-header-cell bg-indigo-50" style={{ top: '2.5rem', height: '3rem', gridColumn: '3 / span 1' }}>Q4</div>
                                            <div className="gantt-header-cell" style={{ top: '2.5rem', height: '3rem', gridColumn: '4 / span 1' }}>Q1</div>
                                            <div className="gantt-header-cell" style={{ top: '2.5rem', height: '3rem', gridColumn: '5 / span 1' }}>Q2</div>
                                            <div className="gantt-header-cell" style={{ top: '2.5rem', height: '3rem', gridColumn: '6 / span 1' }}>Q3</div>
                                            <div className="gantt-header-cell" style={{ top: '2.5rem', height: '3rem', gridColumn: '7 / span 1' }}>Q4</div>
                                            <div className="gantt-header-cell" style={{ top: '2.5rem', height: '3rem', gridColumn: '8 / span 1' }}>Q1</div>
                                            <div className="gantt-header-cell" style={{ top: '2.5rem', height: '3rem', gridColumn: '9 / span 1' }}>Q2</div>

                                            {ganttData.map(project => {
                                                const statusInfo = statusMap[project.status] || statusMap['완료'];
                                                const startCol = (project.start || 1) + 1;
                                                const span = project.span || 1;
                                                const costText = project.cost > 0 ? `₩${project.cost.toLocaleString()}` : '절감액: -';
                                                const barText = `${ganttQuarters[project.start - 1]} - ${ganttQuarters[project.start + span - 2]}`;
                                                const endCol = startCol + span;

                                                return (
                                                    <React.Fragment key={project.id}>
                                                        <div
                                                            className="gantt-sticky-col gantt-grid-cell p-4 gantt-project-name-clickable"
                                                            style={{ gridColumn: '1 / span 1', cursor: 'pointer', height: 'auto' }}
                                                            onClick={() => handleProjectClick(project)}
                                                        >
                                                            <div className="font-semibold text-gray-900 hover:text-blue-600 hover:underline">{project.name}</div>
                                                            <div className="text-sm text-gray-600">예상 절감비용: {costText}</div>
                                                            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                                                                <div className="h-2.5 rounded-full" style={{ width: `${project.progress}%`, backgroundColor: statusInfo.fill }}></div>
                                                            </div>
                                                            <div className={`text-xs font-medium ${statusInfo.text} mt-1`}>{project.progress}% 완료</div>
                                                        </div>
                                                        <div className="gantt-grid-cell" style={{ gridColumn: `${startCol} / span ${span}`, height: 'auto' }}>
                                                            <div className="gantt-bar-container" style={{ height: '2.5rem', position: 'relative' }}>
                                                                <div className="gantt-bar-outline" style={{ borderColor: statusInfo.border }}>
                                                                    <div className="gantt-bar-fill" style={{ width: `${project.progress}%`, backgroundColor: statusInfo.fill }}></div>
                                                                    <span className="relative z-10">{barText}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {endCol <= 9 && (
                                                            <div className="gantt-grid-cell" style={{ gridColumn: `${endCol} / span ${9 - endCol + 1}`, height: 'auto' }}></div>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Details Modal */}
            {selectedProject && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-content gantt-details-modal-content">
                        <h3>{selectedProject.name} - 진행 현황</h3>

                        <div className="gantt-steps-container">
                            {(selectedProject.deliverySteps && selectedProject.deliverySteps.length > 0 ? selectedProject.deliverySteps : ganttStepIcons).map((label, index, arr) => {
                                // Calculate active index based on progress
                                const totalSteps = arr.length;
                                const progressPerStep = 100 / totalSteps;
                                let activeStepIndex = Math.floor(selectedProject.progress / progressPerStep) - 1;
                                if (selectedProject.progress === 100) activeStepIndex = totalSteps - 1;
                                if (selectedProject.progress === 0) activeStepIndex = -1;

                                const isActive = index <= activeStepIndex ? 'is-active' : '';
                                return (
                                    <div key={index} className={`gantt-step ${isActive}`}>
                                        <div className="gantt-step-icon">✓</div>
                                        <div className="gantt-step-label">{label}</div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="gantt-details-table-container">
                            <table className="gantt-details-table">
                                <thead>
                                    <tr>
                                        <th>완료날짜</th>
                                        <th>내용</th>
                                        <th>현재상태</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedProject.progressSteps && selectedProject.progressSteps.length > 0 ? (
                                        [...selectedProject.progressSteps].reverse().map((step, idx) => (
                                            <tr key={idx}>
                                                <td>{step.date}</td>
                                                <td>{step.content}</td>
                                                <td>{step.currentState}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="3" style={{ textAlign: 'center', color: '#888' }}>입력된 진행 상황이 없습니다.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="gantt-modal-controls">
                            <button className="modal-button-close" onClick={() => setSelectedProject(null)}>닫기</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-content gantt-modal-content">
                        <h3>자동화 프로젝트 관리</h3>
                        <div className="gantt-form-container">
                            <div className="gantt-form-controls">
                                <button className="btn btn-add" onClick={handleAddProject}>프로젝트 추가 +</button>
                            </div>
                            {editGanttData.map((project, index) => (
                                <div key={project.id} className="gantt-edit-item">
                                    <button className="gantt-delete-project-btn" onClick={() => handleDeleteProject(index)}>×</button>
                                    <h4>{project.name}</h4>
                                    <div className="gantt-edit-grid">
                                        <div className="gantt-form-group">
                                            <label>프로젝트명</label>
                                            <input type="text" value={project.name} onChange={(e) => handleEditChange(index, 'name', e.target.value)} />
                                        </div>
                                        <div className="gantt-form-group">
                                            <label>예상 절감비용</label>
                                            <input type="number" value={project.cost} onChange={(e) => handleEditChange(index, 'cost', parseInt(e.target.value) || 0)} />
                                        </div>
                                        <div className="gantt-form-group">
                                            <label>진행률 (%)</label>
                                            <input type="number" value={project.progress} min="0" max="100" onChange={(e) => handleEditChange(index, 'progress', parseInt(e.target.value) || 0)} />
                                        </div>
                                        <div className="gantt-form-group">
                                            <label>시작 분기</label>
                                            <select value={project.start} onChange={(e) => handleEditChange(index, 'start', parseInt(e.target.value))}>
                                                {ganttQuarters.map((q, i) => <option key={i} value={i + 1}>{q}</option>)}
                                            </select>
                                        </div>
                                        <div className="gantt-form-group">
                                            <label>소요 분기 (Span)</label>
                                            <input type="number" value={project.span} min="1" onChange={(e) => handleEditChange(index, 'span', parseInt(e.target.value))} />
                                        </div>
                                        <div className="gantt-form-group">
                                            <label>상태</label>
                                            <select value={project.status} onChange={(e) => handleEditChange(index, 'status', e.target.value)}>
                                                {ganttStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Progress Steps (Popup) Editor */}
                                    <div style={{ marginTop: '1.5rem', borderTop: '1px dashed #ccc', paddingTop: '1rem' }}>
                                        <h5 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>진행 단계(팝업) 편집</h5>
                                        {(project.deliverySteps && project.deliverySteps.length > 0 ? project.deliverySteps : ganttStepIcons).map((step, stepIdx) => (
                                            <div key={stepIdx} className="gantt-form-group" style={{ marginBottom: '0.5rem' }}>
                                                <label>단계 {stepIdx + 1}</label>
                                                <input
                                                    type="text"
                                                    value={step}
                                                    onChange={(e) => handleStepChange(index, stepIdx, e.target.value)}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Detailed Progress Status Editor */}
                                    <div className="gantt-progress-section">
                                        <h5 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.5rem', marginTop: '1.5rem' }}>진행 상황 편집</h5>
                                        <div className="gantt-progress-list">
                                            <div className="gantt-progress-header">
                                                <span>날짜</span>
                                                <span>내용</span>
                                                <span>현재상태</span>
                                                <span></span>
                                            </div>
                                            {project.progressSteps && project.progressSteps.map((step, stepIdx) => (
                                                <div key={stepIdx} className="gantt-progress-row">
                                                    <input
                                                        type="text"
                                                        placeholder="YYYY-MM-DD"
                                                        value={step.date}
                                                        onChange={(e) => handleProgressStepChange(index, stepIdx, 'date', e.target.value)}
                                                    />
                                                    <input
                                                        type="text"
                                                        value={step.content}
                                                        onChange={(e) => handleProgressStepChange(index, stepIdx, 'content', e.target.value)}
                                                    />
                                                    <input
                                                        type="text"
                                                        value={step.currentState}
                                                        onChange={(e) => handleProgressStepChange(index, stepIdx, 'currentState', e.target.value)}
                                                    />
                                                    <button className="btn-delete-step" onClick={() => handleDeleteProgressStep(index, stepIdx)}>×</button>
                                                </div>
                                            ))}
                                        </div>
                                        <button className="btn-add-progress" onClick={() => handleAddProgressStep(index)}>+ 진행 상황 추가</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="gantt-modal-controls">
                            <button className="modal-button" onClick={handleSaveGantt}>저장 후 닫기</button>
                            <button className="modal-button-close" onClick={() => setIsEditModalOpen(false)}>닫기</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Inkyu;
