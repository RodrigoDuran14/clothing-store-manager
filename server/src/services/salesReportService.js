const Sale = require('../models/Sale');
const Seller = require('../models/Seller');

// Comparativa Mensual
const getMonthlyComparison = async (year) => {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const monthlyData = [];
  
  for (const month of months) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const sales = await Sale.find({
      date: { $gte: startDate, $lte: endDate },
      status: 'completed'
    });
    
    const total = sales.reduce((sum, s) => sum + s.total, 0);
    const count = sales.length;
    
    monthlyData.push({
      month: month,
      monthName: new Date(year, month - 1).toLocaleString('es-AR', { month: 'long' }),
      total,
      count,
      average: count > 0 ? total / count : 0
    });
  }
  
  // Calcular variación mes a mes
  const withVariation = monthlyData.map((data, index) => {
    const previous = index > 0 ? monthlyData[index - 1].total : data.total;
    const variation = previous > 0 ? ((data.total - previous) / previous) * 100 : 0;
    return { ...data, variation: variation.toFixed(1) };
  });
  
  const totalYear = withVariation.reduce((sum, m) => sum + m.total, 0);
  const averageMonth = totalYear / 12;
  const bestMonth = withVariation.reduce((best, m) => m.total > best.total ? m : best, withVariation[0]);
  const worstMonth = withVariation.reduce((worst, m) => m.total < worst.total ? m : worst, withVariation[0]);
  
  return {
    year,
    summary: {
      totalYear,
      averageMonth,
      bestMonth: { month: bestMonth.monthName, total: bestMonth.total },
      worstMonth: { month: worstMonth.monthName, total: worstMonth.total }
    },
    months: withVariation
  };
};

// Ventas por Hora/Día de la Semana
const getSalesByTimeSlot = async (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const sales = await Sale.find({
    date: { $gte: start, $lte: end },
    status: 'completed'
  });
  
  // Días de la semana
  const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const byDay = Array(7).fill().map(() => ({ total: 0, count: 0, average: 0 }));
  
  // Horas del día (0-23)
  const byHour = Array(24).fill().map(() => ({ total: 0, count: 0, average: 0 }));
  
  for (const sale of sales) {
    const dayOfWeek = sale.date.getDay();
    const hour = sale.date.getHours();
    
    byDay[dayOfWeek].total += sale.total;
    byDay[dayOfWeek].count += 1;
    
    byHour[hour].total += sale.total;
    byHour[hour].count += 1;
  }
  
  // Calcular promedios
  for (let i = 0; i < 7; i++) {
    byDay[i].average = byDay[i].count > 0 ? byDay[i].total / byDay[i].count : 0;
    byDay[i].dayName = daysOfWeek[i];
  }
  
  for (let i = 0; i < 24; i++) {
    byHour[i].average = byHour[i].count > 0 ? byHour[i].total / byHour[i].count : 0;
    byHour[i].hour = i;
    byHour[i].period = i < 12 ? 'Mañana' : i < 18 ? 'Tarde' : 'Noche';
  }
  
  // Encontrar mejores momentos
  const bestDay = byDay.reduce((best, d) => d.total > best.total ? d : best, byDay[0]);
  const bestHour = byHour.reduce((best, h) => h.total > best.total ? h : best, byHour[0]);
  
  return {
    period: { startDate: start, endDate: end },
    summary: {
      totalSales: sales.length,
      bestDay: { day: bestDay.dayName, total: bestDay.total, average: bestDay.average },
      bestHour: { hour: bestHour.hour, period: bestHour.period, total: bestHour.total }
    },
    byDay: byDay.map(d => ({ day: d.dayName, total: d.total, count: d.count, average: d.average })),
    byHour: byHour.map(h => ({ hour: h.hour, period: h.period, total: h.total, count: h.count, average: h.average }))
  };
};

// Efectividad por Turno/Horario (Vendedores)
const getShiftEffectiveness = async (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const sellers = await Seller.find({ active: true });
  
  const shiftData = {
    morning: { sales: 0, count: 0, sellers: [] },
    afternoon: { sales: 0, count: 0, sellers: [] },
    evening: { sales: 0, count: 0, sellers: [] }
  };
  
  for (const seller of sellers) {
    const sales = await Sale.find({
      sellerId: seller._id,
      date: { $gte: start, $lte: end },
      status: 'completed'
    });
    
    const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
    const saleCount = sales.length;
    
    // Determinar turno del vendedor
    const shift = seller.shifts?.[0]?.day ? 
      (seller.shifts[0].startTime < '12:00' ? 'morning' : 
       seller.shifts[0].startTime < '18:00' ? 'afternoon' : 'evening') : 'morning';
    
    shiftData[shift].sales += totalSales;
    shiftData[shift].count += saleCount;
    shiftData[shift].sellers.push({
      name: `${seller.firstName} ${seller.lastName}`,
      sales: totalSales,
      count: saleCount,
      average: saleCount > 0 ? totalSales / saleCount : 0
    });
  }
  
  // Calcular promedios por turno
  const effectiveness = [];
  for (const [shift, data] of Object.entries(shiftData)) {
    effectiveness.push({
      shift: shift === 'morning' ? 'Mañana (9-12)' : shift === 'afternoon' ? 'Tarde (12-18)' : 'Noche (18-21)',
      totalSales: data.sales,
      saleCount: data.count,
      averagePerSeller: data.sellers.length > 0 ? data.sales / data.sellers.length : 0,
      averagePerSale: data.count > 0 ? data.sales / data.count : 0,
      sellersCount: data.sellers.length,
      topSellers: data.sellers.sort((a, b) => b.sales - a.sales).slice(0, 3)
    });
  }
  
  return {
    period: { startDate: start, endDate: end },
    effectiveness: effectiveness.sort((a, b) => b.totalSales - a.totalSales),
    bestShift: effectiveness.reduce((best, s) => s.totalSales > best.totalSales ? s : best, effectiveness[0])
  };
};

// Productividad por Vendedor
const getSellerProductivity = async (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const sellers = await Seller.find({ active: true });
  
  const productivityData = [];
  
  for (const seller of sellers) {
    const sales = await Sale.find({
      sellerId: seller._id,
      date: { $gte: start, $lte: end },
      status: 'completed'
    });
    
    const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
    const saleCount = sales.length;
    const averageTicket = saleCount > 0 ? totalSales / saleCount : 0;
    
    // Calcular comisiones
    let commissionEarned = 0;
    if (seller.commissionType === 'percentage') {
      commissionEarned = totalSales * (seller.commissionRate / 100);
    } else {
      commissionEarned = seller.fixedCommissionAmount * saleCount;
    }
    
    // Efectividad (ventas por día trabajado - suponiendo 20 días)
    const daysWorked = 20;
    const salesPerDay = saleCount / daysWorked;
    const valuePerDay = totalSales / daysWorked;
    
    productivityData.push({
      sellerId: seller._id,
      sellerName: `${seller.firstName} ${seller.lastName}`,
      position: seller.position,
      totalSales,
      saleCount,
      averageTicket,
      commissionRate: seller.commissionRate,
      commissionEarned,
      salesPerDay: salesPerDay.toFixed(1),
      valuePerDay: valuePerDay.toFixed(2),
      productivityScore: (salesPerDay * (averageTicket / 10000)).toFixed(2)
    });
  }
  
  // Ranking
  const rankingBySales = [...productivityData].sort((a, b) => b.totalSales - a.totalSales);
  const rankingByEfficiency = [...productivityData].sort((a, b) => parseFloat(b.productivityScore) - parseFloat(a.productivityScore));
  
  return {
    period: { startDate: start, endDate: end },
    summary: {
      totalSellers: productivityData.length,
      totalSales: productivityData.reduce((sum, s) => sum + s.totalSales, 0),
      averagePerSeller: productivityData.reduce((sum, s) => sum + s.totalSales, 0) / (productivityData.length || 1)
    },
    ranking: {
      bySales: rankingBySales.slice(0, 5),
      byEfficiency: rankingByEfficiency.slice(0, 5)
    },
    sellers: productivityData
  };
};

module.exports = {
  getMonthlyComparison,
  getSalesByTimeSlot,
  getShiftEffectiveness,
  getSellerProductivity
};