/**
 * Calculates start, end, and label range for excel exports based on dashboard filters.
 */
export const getDateRangeFromFilters = ({
  timeframe,
  filterDate,
  filterWeek,
  filterYear,
  selectedDay,
  filterYearsCount = 5
}) => {
  let from = '';
  let to = '';
  let label = '';

  if (timeframe === 'daily') {
    if (filterDate) {
      const [year, month] = filterDate.split('-').map(Number);
      if (selectedDay) {
        const formattedDay = String(selectedDay).padStart(2, '0');
        const formattedMonth = String(month).padStart(2, '0');
        from = `${year}-${formattedMonth}-${formattedDay}`;
        to = from;
        label = `Ngày ${formattedDay}/${formattedMonth}/${year}`;
      } else {
        const formattedMonth = String(month).padStart(2, '0');
        from = `${year}-${formattedMonth}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        to = `${year}-${formattedMonth}-${String(lastDay).padStart(2, '0')}`;
        label = `Tháng ${month}/${year}`;
      }
    } else {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const day = now.getDate();
      from = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      to = from;
      label = `Ngày ${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    }
  } else if (timeframe === 'weekly') {
    if (filterWeek) {
      const [year, week] = filterWeek.split('-W').map(Number);
      const d = new Date(year, 0, 1);
      const dayNum = d.getDay();
      const diff = d.getDate() - dayNum + (dayNum === 0 ? -6 : 1);
      const firstMonday = new Date(d.setDate(diff));
      const start = new Date(firstMonday.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);

      from = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
      to = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
      label = `Tuần ${week}/${year} (Từ ${start.getDate()}/${start.getMonth() + 1} Đến ${end.getDate()}/${end.getMonth() + 1})`;
    }
  } else if (timeframe === 'monthly') {
    const year = filterYear || new Date().getFullYear();
    from = `${year}-01-01`;
    to = `${year}-12-31`;
    label = `Năm ${year}`;
  } else if (timeframe === 'yearly') {
    const endYear = new Date().getFullYear();
    const startYear = endYear - filterYearsCount + 1;
    from = `${startYear}-01-01`;
    to = `${endYear}-12-31`;
    label = `${filterYearsCount} năm qua (${startYear}-${endYear})`;
  }

  return { from, to, label };
};

/**
 * Prepares the complete report metadata object
 */
export const prepareReportMetadata = ({
  timeframe,
  filterDate,
  filterWeek,
  filterYear,
  selectedDay,
  filterYearsCount,
  revenueData = [],
  categoryData = [],
  performanceData = []
}) => {
  const dateRange = getDateRangeFromFilters({
    timeframe,
    filterDate,
    filterWeek,
    filterYear,
    selectedDay,
    filterYearsCount
  });

  const totalRevenue = revenueData.reduce((sum, item) => sum + (item.revenue || 0), 0);
  const totalDebt = revenueData.reduce((sum, item) => sum + (item.expense || 0), 0);
  const totalCollected = revenueData.reduce((sum, item) => sum + (item.collected || 0), 0);
  const totalOrders = revenueData.reduce((sum, item) => sum + (item.invoiceCount || 0), 0);

  return {
    generatedAt: new Date().toISOString(),
    timeframe,
    dateRange,
    summary: {
      totalRevenue,
      totalDebt,
      totalCollected,
      totalOrders,
      categoryCount: categoryData.length,
      salesCount: performanceData.length
    }
  };
};

export default {
  getDateRangeFromFilters,
  prepareReportMetadata
};
