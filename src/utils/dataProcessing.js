import * as d3 from 'd3';

export const doughnutColors = ['#4C7080', '#F15A22', '#243642', '#8BA1A9', '#52579C', '#4F8CD1'];

export const fetchData = async () => {
    try {
        const [data23y, data24y, data25y] = await Promise.all([
            d3.csv('/data/data23y.csv'),
            d3.csv('/data/data24y.csv'),
            d3.csv('/data/data25y.csv')
        ]);
        return { data23y, data24y, data25y };
    } catch (error) {
        console.error("Error fetching data:", error);
        throw error;
    }
};

export const getReportingMonth = (dateString) => {
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

export const sumFCost = (data) => (data || []).reduce((sum, r) => {
    const fCostValue = String(r['F-Cost_합계'] || '0').replace(/,/g, '');
    return sum + (Number(fCostValue) || 0);
}, 0);

export const getAnnualClaimTotals = (dataset, productFamily) => {
    const filtered = dataset.filter(r => r['구분'] === '부적합' && r['제품군'] === productFamily && r['집계분류(대)'] === '고객');
    const totals = { all: filtered.length, official: 0, unofficial: 0 };
    filtered.forEach(item => {
        if (item['집계여부'] === 'YES') totals.official++;
        else if (item['집계여부'] === 'NO') totals.unofficial++;
    });
    return totals;
};

export const getAnnualConq = (dataset) => {
    const filtered = dataset.filter(r => r['구분'] === '부적합');
    const totals = { gs: 0, ptt: 0 };
    filtered.forEach(r => {
        const cost = Number(String(r['F-Cost_합계'] || '0').replace(/,/g, ''));
        if (r['제품군'] === 'GS') totals.gs += cost;
        else if (r['제품군'] === 'PTT') totals.ptt += cost;
    });
    return totals;
};

export const getAnnualSupplierTotals = (dataset) => {
    const filtered = dataset.filter(r => r['구분'] === '부적합' && r['집계분류(대)'] === '수입');
    const totals = { all: filtered.length, gs: 0, ptt: 0 };
    filtered.forEach(item => {
        if (item['제품군'] === 'GS') totals.gs++;
        else if (item['제품군'] === 'PTT') totals.ptt++;
    });
    return totals;
};
