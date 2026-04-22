const PartnerCashRegister = require('../models/PartnerCashRegister');
const CashClosure = require('../models/CashClosure');
const Expense = require('../models/Expense');
const Sale = require('../models/Sale');

// ============================================
// FUNCIONES DE PREPARACIÓN Y CIERRE
// ============================================

// Preparar cierre de caja (vista previa)
const prepareCashClosure = async (cashRegisterId, date = new Date()) => {
  const cashRegister = await PartnerCashRegister.findById(cashRegisterId);
  if (!cashRegister) {
    throw new Error('Cash register not found');
  }
  
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  // Verificar si ya existe cierre
  const existingClosure = await CashClosure.findOne({
    cashRegisterId,
    date: { $gte: startOfDay, $lte: endOfDay }
  });
  
  if (existingClosure && existingClosure.status !== 'open') {
    throw new Error('Cash already closed for this day');
  }
  
  // Calcular efectivo esperado
  const expectedData = await cashRegister.calculateExpectedCash(date);
  
  // Obtener ventas del día por método de pago
  const sales = await Sale.find({
    date: { $gte: startOfDay, $lte: endOfDay },
    status: 'completed'
  });
  
  const totals = {
    cashSales: 0,
    cardSales: 0,
    transferSales: 0,
    creditSales: 0,
    expenses: 0,
    withdrawals: 0,
    deposits: 0
  };
  
  for (const sale of sales) {
    for (const payment of sale.payments) {
      switch(payment.method) {
        case 'cash': totals.cashSales += payment.amount; break;
        case 'credit_card':
        case 'debit_card': totals.cardSales += payment.amount; break;
        case 'transfer': totals.transferSales += payment.amount; break;
        case 'credit_account': totals.creditSales += payment.amount; break;
      }
    }
  }
  
  // Gastos del día
  const expenses = await Expense.find({
    partnerId: cashRegister.partnerId,
    date: { $gte: startOfDay, $lte: endOfDay }
  });
  totals.expenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Movimientos de caja
  const movements = cashRegister.movements.filter(m => 
    m.date >= startOfDay && m.date <= endOfDay
  );
  
  totals.withdrawals = movements
    .filter(m => m.type === 'withdrawal')
    .reduce((sum, m) => sum + m.amount, 0);
  
  totals.deposits = movements
    .filter(m => m.type === 'deposit')
    .reduce((sum, m) => sum + m.amount, 0);
  
  // Resumen de movimientos por tipo
  const movementSummary = {
    totalMovements: movements.length,
    byType: {
      sale: { count: 0, amount: 0 },
      expense: { count: 0, amount: 0 },
      withdrawal: { count: 0, amount: 0 },
      deposit: { count: 0, amount: 0 },
      transfer: { count: 0, amount: 0 },
      adjustment: { count: 0, amount: 0 }
    }
  };
  
  for (const movement of movements) {
    if (movementSummary.byType[movement.type]) {
      movementSummary.byType[movement.type].count++;
      movementSummary.byType[movement.type].amount += movement.amount;
    }
  }
  
  return {
    cashRegister,
    expectedData,
    totals,
    movementSummary,
    openingBalance: cashRegister.initialBalance,
    currentBalance: cashRegister.balance,
    expectedBalance: expectedData.expected
  };
};

// Realizar cierre de caja
const performCashClosure = async (cashRegisterId, closingBalance, userId, notes = '') => {
  const cashRegister = await PartnerCashRegister.findById(cashRegisterId);
  if (!cashRegister) {
    throw new Error('Cash register not found');
  }
  
  if (!cashRegister.isOpen) {
    throw new Error('Cash register is already closed');
  }
  
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  // Verificar cierre existente
  let closure = await CashClosure.findOne({
    cashRegisterId,
    date: { $gte: startOfDay }
  });
  
  // Preparar datos del cierre
  const closureData = await prepareCashClosure(cashRegisterId);
  
  const difference = closingBalance - closureData.expectedBalance;
  
  // Crear o actualizar cierre
  if (!closure) {
    closure = new CashClosure({
      cashRegisterId,
      partnerId: cashRegister.partnerId,
      date: startOfDay,
      openingBalance: closureData.openingBalance,
      closingBalance,
      expectedBalance: closureData.expectedBalance,
      difference,
      totals: closureData.totals,
      movementSummary: closureData.movementSummary,
      status: difference !== 0 ? 'discrepancy' : 'closed',
      closedBy: userId,
      closedAt: new Date(),
      notes
    });
    
    if (difference !== 0) {
      closure.discrepancy = {
        hasDiscrepancy: true,
        amount: difference,
        resolved: false
      };
    }
  } else {
    closure.closingBalance = closingBalance;
    closure.expectedBalance = closureData.expectedBalance;
    closure.difference = difference;
    closure.totals = closureData.totals;
    closure.movementSummary = closureData.movementSummary;
    closure.status = difference !== 0 ? 'discrepancy' : 'closed';
    closure.closedBy = userId;
    closure.closedAt = new Date();
    closure.notes = notes;
    
    if (difference !== 0 && !closure.discrepancy.hasDiscrepancy) {
      closure.discrepancy = {
        hasDiscrepancy: true,
        amount: difference,
        resolved: false
      };
    }
  }
  
  await closure.save();
  
  // Cerrar la caja
  await cashRegister.close(userId);
  
  // Registrar la discrepancia en el historial de la caja
  if (difference !== 0) {
    cashRegister.discrepancies.push({
      date: new Date(),
      expected: closureData.expectedBalance,
      actual: closingBalance,
      difference,
      resolved: false,
      notes: notes
    });
    await cashRegister.save();
  }
  
  return { closure, cashRegister };
};

// ============================================
// FUNCIONES DE REPORTES
// ============================================

// Obtener reporte de cierres con diferencias
const getDiscrepancyReport = async (startDate, endDate) => {
  return await CashClosure.getDiscrepancies(startDate, endDate);
};

// Resolver discrepancia
const resolveDiscrepancy = async (closureId, notes, userId) => {
  const closure = await CashClosure.findById(closureId);
  if (!closure) {
    throw new Error('Cash closure not found');
  }
  
  await closure.resolveDiscrepancy(notes, userId);
  
  // Actualizar el historial de la caja
  const cashRegister = await PartnerCashRegister.findById(closure.cashRegisterId);
  if (cashRegister) {
    const discrepancyRecord = cashRegister.discrepancies.find(
      d => d.date.toDateString() === closure.date.toDateString()
    );
    if (discrepancyRecord) {
      discrepancyRecord.resolved = true;
      discrepancyRecord.resolvedBy = userId;
      await cashRegister.save();
    }
  }
  
  return closure;
};

// Obtener arqueo de caja (resumen)
const getCashAudit = async (cashRegisterId, date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const closure = await CashClosure.findOne({
    cashRegisterId,
    date: { $gte: startOfDay }
  });
  
  if (!closure) {
    throw new Error('No cash closure found for this date');
  }
  
  const cashRegister = await PartnerCashRegister.findById(cashRegisterId);
  
  return {
    date: closure.date,
    cashier: cashRegister?.cashierName || 'No asignado',
    openingBalance: closure.openingBalance,
    expectedBalance: closure.expectedBalance,
    countedBalance: closure.closingBalance,
    difference: closure.difference,
    movementSummary: closure.movementSummary,
    totals: closure.totals,
    discrepancy: closure.discrepancy
  };
};

// Reporte de caja por período (resumen diario)
const getDailyCashReport = async (partnerId, startDate, endDate) => {
  const closures = await CashClosure.find({
    partnerId,
    date: { $gte: startDate, $lte: endDate },
    status: { $in: ['closed', 'audited'] }
  }).sort({ date: 1 });
  
  const dailyReport = closures.map(closure => ({
    date: closure.date,
    openingBalance: closure.openingBalance,
    closingBalance: closure.closingBalance,
    difference: closure.difference,
    cashSales: closure.totals.cashSales,
    expenses: closure.totals.expenses,
    withdrawals: closure.totals.withdrawals,
    deposits: closure.totals.deposits,
    hasDiscrepancy: closure.discrepancy.hasDiscrepancy
  }));
  
  const summary = {
    totalCashSales: dailyReport.reduce((sum, d) => sum + d.cashSales, 0),
    totalExpenses: dailyReport.reduce((sum, d) => sum + d.expenses, 0),
    totalWithdrawals: dailyReport.reduce((sum, d) => sum + d.withdrawals, 0),
    totalDeposits: dailyReport.reduce((sum, d) => sum + d.deposits, 0),
    daysWithDiscrepancy: dailyReport.filter(d => d.hasDiscrepancy).length,
    averageDailySales: dailyReport.length > 0 ? 
      dailyReport.reduce((sum, d) => sum + d.cashSales, 0) / dailyReport.length : 0
  };
  
  return {
    period: { startDate, endDate },
    summary,
    daily: dailyReport
  };
};

module.exports = {
  prepareCashClosure,
  performCashClosure,
  getDiscrepancyReport,
  resolveDiscrepancy,
  getCashAudit,
  getDailyCashReport
};