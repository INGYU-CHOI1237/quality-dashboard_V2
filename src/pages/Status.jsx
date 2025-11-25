import React, { useState, useEffect } from 'react';
import * as d3 from 'd3';

const Status = () => {
    const [rawData, setRawData] = useState([]);
    const [mode, setMode] = useState('count'); // 'count' or 'qty'
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await d3.csv('/data/Status.csv');
                const processed = processData(data);
                setRawData(processed);
                setLoading(false);
            } catch (err) {
                console.error("CSV 로드 실패:", err);
                setError("'data/Status.csv' 파일을 찾을 수 없습니다.");
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const processData = (data) => {
        const today = new Date();
        return data.map(row => {
            const transferDateStr = row['이관일자'] || "";
            const transferDate = new Date(transferDateStr);
            let diffDays = 0;
            if (!isNaN(transferDate.getTime())) {
                const diffTime = today - transferDate;
                diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            }

            return {
                originalItemNumber: row['Item Number'],
                workOrder: row['Work order'],
                customer: row['Item Number'] ? row['Item Number'].substring(0, 4) : 'Unk',
                qty: parseInt(row['WO Qty'], 10) || 0,
                transferDateStr: transferDateStr,
                transferDateObj: transferDate,
                elapsedDays: diffDays
            };
        });
    };

    const getGroupedData = () => {
        const groups = {};
        rawData.forEach(row => {
            const key = row.customer;
            if (!groups[key]) {
                groups[key] = { customer: key, count: 0, totalQty: 0 };
            }
            groups[key].count += 1;
            groups[key].totalQty += row.qty;
        });

        const groupArray = Object.values(groups);
        if (mode === 'count') {
            groupArray.sort((a, b) => b.count - a.count);
        } else {
            groupArray.sort((a, b) => b.totalQty - a.totalQty);
        }
        return groupArray;
    };

    const groupedData = getGroupedData();
    const maxValue = groupedData.length > 0
        ? (mode === 'count' ? groupedData[0].count : groupedData[0].totalQty)
        : 1;

    const totalCount = rawData.length;
    const totalQty = rawData.reduce((sum, row) => sum + row.qty, 0);
    const sortedList = [...rawData].sort((a, b) => a.transferDateObj - b.transferDateObj);

    if (loading) return <div className="p-8 text-center">Loading data...</div>;
    if (error) return <div className="p-8 text-center text-red-600 font-bold">{error}</div>;

    return (
        <div className="dashboard-body">
            <div className="category-container full-height">
                {/* Header Row: Controls & Summary */}
                <div className="status-header-row">
                    <div className="status-controls">
                        <button
                            id="btn-count"
                            className={`btn-mode ${mode === 'count' ? 'active' : ''}`}
                            onClick={() => setMode('count')}
                        >
                            고객별 건수
                        </button>
                        <button
                            id="btn-qty"
                            className={`btn-mode ${mode === 'qty' ? 'active' : ''}`}
                            onClick={() => setMode('qty')}
                        >
                            고객별 수량
                        </button>
                    </div>
                    <div className="status-summary">
                        <div className="summary-box" style={{ backgroundColor: '#4C7080', color: 'white', borderColor: '#4C7080' }}>
                            총 대기 건수 : <span id="summary-total-count" style={{ color: 'white' }}>{totalCount.toLocaleString()}</span>
                        </div>
                        <div className="summary-box" style={{ backgroundColor: '#F15A22', color: 'white', borderColor: '#F15A22' }}>
                            총 대기 수량 : <span id="summary-total-qty" style={{ color: 'white' }}>{totalQty.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Content Wrapper: Bubble Chart (Left) & List (Right) */}
                <div className="status-content-wrapper">
                    {/* Left: Bubble Chart */}
                    <div className="bubble-section">
                        <div id="bubble-container" className="bubble-container">
                            {groupedData.map((group, index) => {
                                const value = mode === 'count' ? group.count : group.totalQty;
                                const labelUnit = mode === 'count' ? '건' : '개';
                                const themeColor = mode === 'count' ? '#4C7080' : '#F15A22';

                                // Safety check for size
                                let calculatedSize = 120 + (value / maxValue) * 120;
                                if (!isFinite(calculatedSize) || isNaN(calculatedSize)) {
                                    calculatedSize = 120;
                                }
                                const size = calculatedSize;

                                return (
                                    <div
                                        key={`${group.customer}-${mode}`}
                                        className="status-bubble-circle"
                                        style={{
                                            width: `${size}px`,
                                            height: `${size}px`,
                                            backgroundColor: themeColor,
                                            borderColor: themeColor,
                                            color: 'white',
                                            animation: `fadeIn 0.5s ease ${index * 0.05}s forwards`,
                                            opacity: 0, // Start invisible for animation
                                            // Inline fallbacks
                                            borderRadius: '50%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            margin: '10px',
                                            border: '2px solid #ccc'
                                        }}
                                    >
                                        <div className="bubble-text" style={{ fontSize: '1.4rem' }}>{group.customer}</div>
                                        <div className="bubble-sub" style={{ fontSize: '1.6rem' }}>{value.toLocaleString()}{labelUnit}</div>
                                    </div>
                                );
                            })}
                            <style>{`
                                .status-bubble-circle {
                                    border-radius: 50% !important;
                                    display: flex !important;
                                    flex-direction: column !important;
                                    justify-content: center !important;
                                    align-items: center !important;
                                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                                    transition: transform 0.2s;
                                }
                                .status-bubble-circle:hover {
                                    transform: scale(1.05);
                                }
                                @keyframes fadeIn {
                                    to { opacity: 1; transform: translateY(0); }
                                    from { opacity: 0; transform: translateY(10px); }
                                }
                            `}</style>
                        </div>
                    </div>

                    {/* Right: List Table */}
                    <div className="list-section">
                        <div className="list-table-wrapper">
                            <table className="status-list-table">
                                <thead>
                                    <tr>
                                        <th>Work Order</th>
                                        <th>이관일자</th>
                                        <th>경과일자</th>
                                    </tr>
                                </thead>
                                <tbody id="status-list-body">
                                    {sortedList.map((row, idx) => (
                                        <tr key={idx} className={
                                            row.elapsedDays > 14 ? 'status-row-danger' :
                                                row.elapsedDays > 7 ? 'status-row-warning' : ''
                                        }>
                                            <td>{row.workOrder ? row.workOrder.split('.')[0] : ''}</td>
                                            <td>{row.transferDateStr ? row.transferDateStr.substring(0, 10) : ''}</td>
                                            <td>{row.elapsedDays}일</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Status;
