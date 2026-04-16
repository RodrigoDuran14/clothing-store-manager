const Sale = require('../models/Sale');
const Expense = require('../models/Expense');
const Client = require('../models/Client');
const Return = require('../models/Return');
const BankAccount = require('../models/BankAccount');
const PartnerCashRegister = require('../models/PartnerCashRegister');

// Estado de Resultados (Pérdidas y Ganancias)
const getIncomeStatement = async (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // INGRESOS
  const sales = await Sale.find({
    date: { $gte: start, $lte: end },
    status: 'completed'
  });
  
  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  
  // COSTO DE VENTAS (COGS)
  let totalCogs = 0;
  for (const sale of sales) {
    for (const item of sale.items) {
      const product = await Sale.populate(item, { path: 'productId', select: 'cost' });
      totalCogs += (product.productId?.cost || 0) * item.quantity;
    }
  }
  
  const grossProfit = totalRevenue - totalCogs;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  
  // GASTOS OPERATIVOS
  const expenses = await Expense.find({
    date: { $gte: start, $lte: end }
  });
  
  const operatingExpenses = {
    rent: expenses.filter(e => e.category === 'rent').reduce((sum, e) => sum + e.amount, 0),
    salaries: expenses.filter(e => e.category === 'salaries').reduce((sum, e) => sum + e.amount, 0),
    supplies: expenses.filter(e => e.category === 'supplies').reduce((sum, e) => sum + e.amount, 0),
    services: expenses.filter(e => e.category === 'services').reduce((sum, e) => sum + e.amount, 0),
    taxes: expenses.filter(e => e.category === 'taxes').reduce((sum, e) => sum + e.amount, 0),
    maintenance: expenses.filter(e => e.category === 'maintenance').reduce((sum, e) => sum + e.amount, 0),
    marketing: expenses.filter(e => e.category === 'marketing').reduce((sum, e) => sum + e.amount, 0),
    other: expenses.filter(e => e.category === 'other').reduce((sum, e) => sum + e.amount, 0)
  };
  
  const totalOperatingExpenses = Object.values(operatingExpenses).reduce((sum, v) => sum + v, 0);
  const operatingIncome = grossProfit - totalOperatingExpenses;
  const operatingMargin = totalRevenue > 0 ? (operatingIncome / totalRevenue) * 100 : 0;
  
  // DEVOLUCIONES (como gasto)
  const returns = await Return.find({
    date: { $gte: start, $lte: end },
    status: 'completed'
  });
  
  const totalReturns = returns.reduce((sum, r) => sum + r.totalRefund, 0);
  const netIncome = operatingIncome - totalReturns;
  const netMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;
  
  return {
    period: { startDate: start, endDate: end },
    revenue: {
      total: totalRevenue,
      details: {
        sales: totalRevenue,
        returns: -totalReturns,
        net: totalRevenue - totalReturns
      }
    },
    cogs: {
      total: totalCogs,
      percentageOfRevenue: totalRevenue > 0 ? (totalCogs / totalRevenue) * 100 : 0
    },
    grossProfit: {
      amount: grossProfit,
      margin: grossMargin
    },
    operatingExpenses: {
      details: operatingExpenses,
      total: totalOperatingExpenses,
      percentageOfRevenue: totalRevenue > 0 ? (totalOperatingExpenses / totalRevenue) * 100 : 0
    },
    operatingIncome: {
      amount: operatingIncome,
      margin: operatingMargin
    },
    netIncome: {
      amount: netIncome,
      margin: netMargin
    },
    summary: {
      revenue: totalRevenue,
      expenses: totalOperatingExpenses + totalCogs,
      profit: netIncome,
      profitPercentage: netMargin
    }
  };
};

// Flujo de Caja (Cash Flow)
const getCashFlow = async (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Ingresos de efectivo
  const sales = await Sale.find({
    date: { $gte: start, $lte: end },
    status: 'completed'
  });
  
  let cashIncome = 0;
  let creditIncome = 0;
  
  for (const sale of sales) {
    for (const payment of sale.payments) {
      if (payment.method === 'cash') {
        cashIncome += payment.amount;
      } else {
        creditIncome += payment.amount;
      }
    }
  }
  
  // Egresos de efectivo
  const expenses = await Expense.find({
    date: { $gte: start, $lte: end }
  });
  
  const cashExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Transferencias entre cuentas
  const accounts = await BankAccount.find();
  let internalTransfers = 0;
  
  for (const account of accounts) {
    const transfers = account.movements.filter(m => 
      m.type === 'transfer_out' && m.date >= start && m.date <= end
    );
    internalTransfers += transfers.reduce((sum, t) => sum + t.amount, 0);
  }
  
  // Saldos iniciales y finales
  const cashRegisters = await PartnerCashRegister.find();
  const initialCashBalance = cashRegisters.reduce((sum, cr) => sum + cr.initialBalance, 0);
  const finalCashBalance = cashRegisters.reduce((sum, cr) => sum + cr.balance, 0);
  
  const bankAccounts = await BankAccount.find();
  const initialBankBalance = bankAccounts.reduce((sum, ba) => sum + ba.initialBalance, 0);
  const finalBankBalance = bankAccounts.reduce((sum, ba) => sum + ba.balance, 0);
  
  const netCashFlow = (cashIncome - cashExpenses) - internalTransfers;
  
  return {
    period: { startDate: start, endDate: end },
    inflows: {
      cashSales: cashIncome,
      creditSales: creditIncome,
      totalInflows: cashIncome + creditIncome
    },
    outflows: {
      expenses: cashExpenses,
      totalOutflows: cashExpenses + internalTransfers
    },
    netCashFlow,
    cashPosition: {
      initial: {
        cash: initialCashBalance,
        bank: initialBankBalance,
        total: initialCashBalance + initialBankBalance
      },
      final: {
        cash: finalCashBalance,
        bank: finalBankBalance,
        total: finalCashBalance + finalBankBalance
      },
      variation: (finalCashBalance + finalBankBalance) - (initialCashBalance + initialBankBalance)
    }
  };
};

// Reporte de Cuentas Corrientes por Antigüedad
const getAgedAccountsReceivable = async () => {
  const today = new Date();
  const clients = await Client.find({ 
    'creditAccount.isEnabled': true,
    'creditAccount.balance': { $gt: 0 }
  });
  
  const agingBuckets = {
    '0-30': [],
    '31-60': [],
    '61-90': [],
    '90+': []
  };
  
  let totalOutstanding = 0;
  
  for (const client of clients) {
    const lastMovement = client.creditAccount.movements[client.creditAccount.movements.length - 1];
    const daysSinceLastMovement = lastMovement ? 
      Math.floor((today - lastMovement.date) / (1000 * 60 * 60 * 24)) : 0;
    
    let bucket = '0-30';
    if (daysSinceLastMovement > 90) bucket = '90+';
    else if (daysSinceLastMovement > 60) bucket = '61-90';
    else if (daysSinceLastMovement > 30) bucket = '31-60';
    
    agingBuckets[bucket].push({
      clientId: client._id,
      clientName: client.name,
      email: client.email,
      phone: client.phone,
      balance: client.creditAccount.balance,
      creditLimit: client.creditAccount.creditLimit,
      daysOverdue: daysSinceLastMovement,
      lastMovementDate: lastMovement?.date,
      lastMovementDescription: lastMovement?.description
    });
    
    totalOutstanding += client.creditAccount.balance;
  }
  
  // Calcular porcentajes
  const agingSummary = {};
  for (const [bucket, clients] of Object.entries(agingBuckets)) {
    const bucketTotal = clients.reduce((sum, c) => sum + c.balance, 0);
    agingSummary[bucket] = {
      count: clients.length,
      total: bucketTotal,
      percentage: totalOutstanding > 0 ? (bucketTotal / totalOutstanding) * 100 : 0,
      clients
    };
  }
  
  return {
    generatedAt: new Date(),
    totalOutstanding,
    agingBuckets: agingSummary,
    riskAnalysis: {
      highRisk: agingBuckets['90+'].length,
      mediumRisk: agingBuckets['61-90'].length,
      lowRisk: agingBuckets['31-60'].length + agingBuckets['0-30'].length
    }
  };
};

// Alertas de Crédito Vencido
const getCreditAlerts = async () => {
  const today = new Date();
  const clients = await Client.find({ 
    'creditAccount.isEnabled': true,
    'creditAccount.balance': { $gt: 0 }
  });
  
  const alerts = [];
  
  for (const client of clients) {
    const lastPayment = client.creditAccount.movements
      .filter(m => m.type === 'payment')
      .sort((a, b) => b.date - a.date)[0];
    
    const daysSinceLastPayment = lastPayment ? 
      Math.floor((today - lastPayment.date) / (1000 * 60 * 60 * 24)) : 999;
    
    const creditUsage = (client.creditAccount.balance / client.creditAccount.creditLimit) * 100;
    
    let alertLevel = null;
    let alertMessage = null;
    
    if (creditUsage >= 100) {
      alertLevel = 'critical';
      alertMessage = `Límite de crédito excedido (${creditUsage.toFixed(1)}%)`;
    } else if (creditUsage >= 85) {
      alertLevel = 'warning';
      alertMessage = `Cerca del límite de crédito (${creditUsage.toFixed(1)}%)`;
    }
    
    if (daysSinceLastPayment > 60 && daysSinceLastPayment < 999) {
      alertLevel = alertLevel === 'critical' ? 'critical' : 'warning';
      alertMessage = alertMessage 
        ? `${alertMessage} | Sin pagos en ${daysSinceLastPayment} días`
        : `Sin pagos en ${daysSinceLastPayment} días`;
    }
    
    if (alertLevel) {
      alerts.push({
        clientId: client._id,
        clientName: client.name,
        email: client.email,
        phone: client.phone,
        balance: client.creditAccount.balance,
        creditLimit: client.creditAccount.creditLimit,
        creditUsage,
        daysSinceLastPayment: daysSinceLastPayment < 999 ? daysSinceLastPayment : null,
        lastPaymentDate: lastPayment?.date,
        alertLevel,
        alertMessage
      });
    }
  }
  
  return {
    generatedAt: new Date(),
    totalAlerts: alerts.length,
    criticalAlerts: alerts.filter(a => a.alertLevel === 'critical').length,
    warningAlerts: alerts.filter(a => a.alertLevel === 'warning').length,
    alerts: alerts.sort((a, b) => b.creditUsage - a.creditUsage)
  };
};

// Reporte de Ventas y Ganancias por Socio
const getPartnerSalesAndProfits = async (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const Partner = require('../models/Partner');
  const PartnerSplit = require('../models/PartnerSplit');
  const Product = require('../models/Product');
  
  // Obtener todos los socios activos
  const partners = await Partner.find({ isActive: true })
    .populate('bankAccounts', 'bankName accountNumber')
    .populate('cashRegisterId');
  
  // Obtener todas las divisiones de ventas en el período
  const splits = await PartnerSplit.find({
    date: { $gte: start, $lte: end },
    status: 'completed'
  }).populate('saleId');
  
  // Inicializar datos por socio
  const partnerData = {};
  
  for (const partner of partners) {
    partnerData[partner._id] = {
      partnerId: partner._id,
      partnerName: partner.name,
      email: partner.email,
      phone: partner.phone,
      ownershipPercentage: partner.ownershipPercentage,
      bankAccounts: partner.bankAccounts,
      cashRegisterBalance: partner.cashRegisterId?.balance || 0,
      
      // Ventas
      totalSales: 0,
      totalSalesCount: 0,
      averageSaleValue: 0,
      
      // Productos
      productsSold: [],
      topProducts: [],
      categoriesSold: [],
      
      // Ganancias
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      profitMargin: 0,
      
      // Métodos de pago
      paymentMethods: {
        cash: 0,
        credit_card: 0,
        debit_card: 0,
        transfer: 0,
        credit_account: 0
      },
      
      // Comisiones pagadas a vendedores
      totalCommissions: 0,
      
      // Resumen mensual
      monthlyBreakdown: {}
    };
  }
  
  // Procesar cada split
  for (const split of splits) {
    for (const splitItem of split.splits) {
      const partnerId = splitItem.partnerId.toString();
      const sale = split.saleId;
      
      if (!partnerData[partnerId]) continue;
      
      const amount = splitItem.amount;
      partnerData[partnerId].totalSales += amount;
      partnerData[partnerId].totalSalesCount += 1;
      
      // Calcular costo de productos para este socio
      let saleCost = 0;
      for (const item of splitItem.items) {
        const product = await Product.findById(item.productId);
        if (product && product.cost) {
          saleCost += product.cost * item.quantity;
        }
      }
      
      partnerData[partnerId].totalCost += saleCost;
      partnerData[partnerId].totalRevenue += amount;
      
      // Procesar productos vendidos
      for (const item of splitItem.items) {
        const existingProduct = partnerData[partnerId].productsSold.find(
          p => p.productId === item.productId?.toString()
        );
        
        if (existingProduct) {
          existingProduct.quantity += item.quantity;
          existingProduct.revenue += item.subtotal;
        } else {
          partnerData[partnerId].productsSold.push({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            revenue: item.subtotal
          });
        }
      }
      
      // Métodos de pago (desde la venta original)
      if (sale && sale.payments) {
        for (const payment of sale.payments) {
          const method = payment.method;
          if (partnerData[partnerId].paymentMethods[method] !== undefined) {
            // Proporcional según el porcentaje del split
            const proportion = amount / split.totalAmount;
            partnerData[partnerId].paymentMethods[method] += payment.amount * proportion;
          }
        }
      }
      
      // Comisiones pagadas (si el socio también es vendedor)
      if (sale && sale.sellerId) {
        const seller = await Seller.findById(sale.sellerId);
        if (seller && seller.userId && seller.userId.toString() === partner.userId?.toString()) {
          // Si el socio es el vendedor, sumar su comisión
          const commission = await commissionService.calculateSaleCommission(
            seller._id,
            amount,
            sale.date
          );
          partnerData[partnerId].totalCommissions += commission.commissionAmount;
        }
      }
      
      // Desglose mensual
      const monthKey = `${sale.date.getFullYear()}-${String(sale.date.getMonth() + 1).padStart(2, '0')}`;
      if (!partnerData[partnerId].monthlyBreakdown[monthKey]) {
        partnerData[partnerId].monthlyBreakdown[monthKey] = {
          month: monthKey,
          sales: 0,
          count: 0,
          profit: 0
        };
      }
      partnerData[partnerId].monthlyBreakdown[monthKey].sales += amount;
      partnerData[partnerId].monthlyBreakdown[monthKey].count += 1;
      partnerData[partnerId].monthlyBreakdown[monthKey].profit += amount - saleCost;
    }
  }
  
  // Calcular métricas finales por socio
  const result = [];
  let totalGeneralSales = 0;
  let totalGeneralProfit = 0;
  
  for (const [id, data] of Object.entries(partnerData)) {
    // Ordenar productos por revenue
    const topProducts = [...data.productsSold]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    
    // Calcular ganancia
    const totalProfit = data.totalRevenue - data.totalCost;
    const profitMargin = data.totalRevenue > 0 ? (totalProfit / data.totalRevenue) * 100 : 0;
    const averageSaleValue = data.totalSalesCount > 0 ? data.totalSales / data.totalSalesCount : 0;
    
    // Ordenar desglose mensual
    const monthlyBreakdown = Object.values(data.monthlyBreakdown)
      .sort((a, b) => a.month.localeCompare(b.month));
    
    totalGeneralSales += data.totalSales;
    totalGeneralProfit += totalProfit;
    
    result.push({
      ...data,
      topProducts,
      totalProfit,
      profitMargin: profitMargin.toFixed(2),
      averageSaleValue,
      monthlyBreakdown,
      // Porcentaje de participación en ventas totales (se calculará después)
      participationPercentage: 0
    });
  }
  
  // Calcular porcentaje de participación
  for (const partner of result) {
    partner.participationPercentage = totalGeneralSales > 0 
      ? (partner.totalSales / totalGeneralSales) * 100 
      : 0;
    partner.participationPercentage = partner.participationPercentage.toFixed(2);
  }
  
  // Ordenar por ventas totales (mayor a menor)
  result.sort((a, b) => b.totalSales - a.totalSales);
  
  return {
    period: { startDate: start, endDate: end },
    summary: {
      totalPartners: result.length,
      totalGeneralSales,
      totalGeneralProfit,
      averageProfitMargin: totalGeneralSales > 0 ? (totalGeneralProfit / totalGeneralSales) * 100 : 0,
      bestPartner: result[0] ? {
        name: result[0].partnerName,
        sales: result[0].totalSales,
        profit: result[0].totalProfit
      } : null
    },
    partners: result
  };
};

// Reporte comparativo entre socios
const getPartnerComparison = async (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const Partner = require('../models/Partner');
  const PartnerSplit = require('../models/PartnerSplit');
  
  const partners = await Partner.find({ isActive: true });
  const splits = await PartnerSplit.find({
    date: { $gte: start, $lte: end },
    status: 'completed'
  });
  
  const comparison = [];
  
  for (const partner of partners) {
    let totalSales = 0;
    let saleCount = 0;
    let totalProducts = 0;
    
    for (const split of splits) {
      const partnerSplit = split.splits.find(s => s.partnerId.toString() === partner._id.toString());
      if (partnerSplit) {
        totalSales += partnerSplit.amount;
        saleCount += 1;
        totalProducts += partnerSplit.items?.length || 0;
      }
    }
    
    const averageSale = saleCount > 0 ? totalSales / saleCount : 0;
    const productsPerSale = saleCount > 0 ? totalProducts / saleCount : 0;
    
    comparison.push({
      partnerId: partner._id,
      partnerName: partner.name,
      totalSales,
      saleCount,
      averageSale,
      totalProducts,
      productsPerSale: productsPerSale.toFixed(1),
      ownershipPercentage: partner.ownershipPercentage,
      expectedShare: (totalSales * partner.ownershipPercentage) / 100,
      performanceVsOwnership: partner.ownershipPercentage > 0 
        ? ((totalSales / totalGeneralSales) * 100) / partner.ownershipPercentage 
        : 0
    });
  }
  
  const totalGeneralSales = comparison.reduce((sum, p) => sum + p.totalSales, 0);
  
  for (const partner of comparison) {
    partner.percentageOfTotal = totalGeneralSales > 0 ? (partner.totalSales / totalGeneralSales) * 100 : 0;
    partner.performanceVsOwnership = partner.ownershipPercentage > 0 
      ? partner.percentageOfTotal / partner.ownershipPercentage 
      : 0;
  }
  
  return {
    period: { startDate: start, endDate: end },
    totalGeneralSales,
    partners: comparison.sort((a, b) => b.totalSales - a.totalSales)
  };
};


module.exports = {
  getIncomeStatement,
  getCashFlow,
  getAgedAccountsReceivable,
  getCreditAlerts,
  getPartnerSalesAndProfits,
  getPartnerComparison
};