// Servicio para preparar datos para gráficos (frontend)

// Datos para gráfico de ventas por período
const getSalesChartData = async (salesData, groupBy = 'day') => {
  const grouped = {};
  
  for (const sale of salesData) {
    let key;
    const date = new Date(sale.date);
    
    switch(groupBy) {
      case 'day':
        key = date.toISOString().split('T')[0];
        break;
      case 'week':
        const weekNumber = getWeekNumber(date);
        key = `Semana ${weekNumber}`;
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      default:
        key = date.toISOString().split('T')[0];
    }
    
    if (!grouped[key]) {
      grouped[key] = {
        period: key,
        total: 0,
        count: 0,
        average: 0
      };
    }
    
    grouped[key].total += sale.total;
    grouped[key].count += 1;
  }
  
  const result = Object.values(grouped).map(item => ({
    ...item,
    average: item.total / item.count
  }));
  
  result.sort((a, b) => a.period.localeCompare(b.period));
  
  return {
    labels: result.map(r => r.period),
    datasets: [
      {
        label: 'Ventas ($)',
        data: result.map(r => r.total),
        backgroundColor: '#0D8F81',
        borderColor: '#0A6B60'
      },
      {
        label: 'Cantidad',
        data: result.map(r => r.count),
        backgroundColor: '#FF9800',
        borderColor: '#E68A00'
      }
    ]
  };
};

// Datos para gráfico de productos más vendidos
const getTopProductsChartData = async (topProducts) => {
  return {
    labels: topProducts.slice(0, 10).map(p => p.productName),
    datasets: [
      {
        label: 'Unidades Vendidas',
        data: topProducts.slice(0, 10).map(p => p.totalQuantity),
        backgroundColor: '#0D8F81'
      },
      {
        label: 'Ingresos ($)',
        data: topProducts.slice(0, 10).map(p => p.totalRevenue),
        backgroundColor: '#FF9800'
      }
    ]
  };
};

// Datos para gráfico de ventas por método de pago
const getPaymentMethodsChartData = async (paymentData) => {
  const methodLabels = {
    cash: 'Efectivo',
    credit_card: 'Tarjeta Crédito',
    debit_card: 'Tarjeta Débito',
    transfer: 'Transferencia',
    credit_account: 'Cuenta Corriente'
  };
  
  return {
    labels: paymentData.map(p => methodLabels[p._id] || p._id),
    datasets: [
      {
        label: 'Monto ($)',
        data: paymentData.map(p => p.total),
        backgroundColor: ['#0D8F81', '#FF9800', '#E74C3C', '#3498DB', '#9B59B6']
      }
    ]
  };
};

// Datos para gráfico de ventas por categoría
const getCategorySalesChartData = async (categoryData) => {
  return {
    labels: categoryData.map(c => c.categoryName),
    datasets: [
      {
        label: 'Ventas ($)',
        data: categoryData.map(c => c.total),
        backgroundColor: '#0D8F81'
      },
      {
        label: 'Cantidad',
        data: categoryData.map(c => c.quantity),
        backgroundColor: '#FF9800'
      }
    ]
  };
};

// Helper: obtener número de semana
function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

module.exports = {
  getSalesChartData,
  getTopProductsChartData,
  getPaymentMethodsChartData,
  getCategorySalesChartData
};