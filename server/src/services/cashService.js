const PartnerCashRegister = require('../models/PartnerCashRegister');
const Expense = require('../models/Expense');
const CashAdjustment = require('../models/CashAdjustment');
const CashClosure = require('../models/CashClosure');
const PartnerSplit = require('../models/PartnerSplit');

// Registrar gasto desde caja
const registerExpense = async (expenseData, userId) => {
  const cashRegister = await PartnerCashRegister.findOne({ 
    partnerId: expenseData.partnerId,
    isOpen: true 
  });
  
  if (!cashRegister) {
    throw new Error('Cash register is not open');
  }
  
  // Crear gasto
  const expense = await Expense.create({
    ...expenseData,
    createdBy: userId
  });
  
  // Registrar movimiento en caja
  const movement = await cashRegister.addMovement(
    'expense',
    expense.amount,
    `Expense: ${expense.description}`,
    expense._id,
    'Expense',
    userId
  );
  
  expense.registeredInCash = true;
  expense.registeredAt = new Date();
  await expense.save();
  
  return { expense, movement };
};

// Retirar efectivo de caja (socio se lleva dinero)
const withdrawCash = async (cashRegisterId, amount, reason, userId) => {
  const cashRegister = await PartnerCashRegister.findById(cashRegisterId);
  
  if (!cashRegister) {
    throw new Error('Cash register not found');
  }
  
  if (!cashRegister.isOpen) {
    throw new Error('Cash register is closed');
  }
  
  if (cashRegister.balance < amount) {
    throw new Error(`Insufficient funds. Balance: ${cashRegister.balance}`);
  }
  
  const movement = await cashRegister.addMovement(
    'withdrawal',
    amount,
    `Withdrawal: ${reason}`,
    null,
    null,
    userId
  );
  
  return movement;
};

// Depositar efectivo en caja
const depositCash = async (cashRegisterId, amount, reason, userId) => {
  const cashRegister = await PartnerCashRegister.findById(cashRegisterId);
  
  if (!cashRegister) {
    throw new Error('Cash register not found');
  }
  
  if (!cashRegister.isOpen) {
    throw new Error('Cash register is closed');
  }
  
  const movement = await cashRegister.addMovement(
    'deposit',
    amount,
    `Deposit: ${reason}`,
    null,
    null,
    userId
  );
  
  return movement;
};

// Ajustar caja (corregir diferencia)
const adjustCash = async (cashRegisterId, type, amount, reason, userId) => {
  const cashRegister = await PartnerCashRegister.findById(cashRegisterId);
  
  if (!cashRegister) {
    throw new Error('Cash register not found');
  }
  
  const previousBalance = cashRegister.balance;
  let newBalance = previousBalance;
  
  if (type === 'surplus') {
    newBalance = previousBalance + amount;
  } else if (type === 'shortage') {
    newBalance = previousBalance - amount;
  }
  
  if (newBalance < 0) {
    throw new Error('Adjustment would result in negative balance');
  }
  
  // Registrar ajuste
  const adjustment = await CashAdjustment.create({
    cashRegisterId,
    partnerId: cashRegister.partnerId,
    type,
    amount,
    previousBalance,
    newBalance,
    reason,
    createdBy: userId,
    approvedBy: userId
  });
  
  // Aplicar ajuste a la caja
  const movement = await cashRegister.addMovement(
    'adjustment',
    type === 'surplus' ? amount : -amount,
    `Adjustment: ${reason}`,
    adjustment._id,
    'CashAdjustment',
    userId
  );
  
  return { adjustment, movement };
};

// Cerrar caja diaria
const closeCashRegister = async (cashRegisterId, userId) => {
  const cashRegister = await PartnerCashRegister.findById(cashRegisterId);
  
  if (!cashRegister) {
    throw new Error('Cash register not found');
  }
  
  if (!cashRegister.isOpen) {
    throw new Error('Cash register is already closed');
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Obtener movimientos del día
  const todayMovements = cashRegister.movements.filter(m => 
    new Date(m.date) >= today
  );
  
  // Calcular totales
  const salesTotal = todayMovements
    .filter(m => m.type === 'sale')
    .reduce((sum, m) => sum + m.amount, 0);
  
  const expensesTotal = todayMovements
    .filter(m => m.type === 'expense')
    .reduce((sum, m) => sum + m.amount, 0);
  
  const withdrawalsTotal = todayMovements
    .filter(m => m.type === 'withdrawal')
    .reduce((sum, m) => sum + m.amount, 0);
  
  const depositsTotal = todayMovements
    .filter(m => m.type === 'deposit')
    .reduce((sum, m) => sum + m.amount, 0);
  
  const transfersTotal = todayMovements
    .filter(m => m.type === 'transfer_out' || m.type === 'transfer_in')
    .reduce((sum, m) => sum + m.amount, 0);
  
  // Calcular balance esperado
  const expectedBalance = cashRegister.initialBalance + salesTotal + depositsTotal - expensesTotal - withdrawalsTotal;
  
  // Crear cierre
  const closure = await CashClosure.create({
    cashRegisterId,
    partnerId: cashRegister.partnerId,
    date: today,
    openingBalance: cashRegister.initialBalance,
    closingBalance: cashRegister.balance,
    expectedBalance,
    difference: cashRegister.balance - expectedBalance,
    salesTotal,
    expensesTotal,
    withdrawalsTotal,
    depositsTotal,
    transfersTotal,
    status: 'closed',
    closedBy: userId,
    closedAt: new Date()
  });
  
  // Cerrar caja
  await cashRegister.close(userId);
  
  return { closure, cashRegister };
};

// Obtener reporte de caja por período
const getCashReport = async (partnerId, startDate, endDate) => {
  const cashRegister = await PartnerCashRegister.findOne({ partnerId });
  
  if (!cashRegister) {
    throw new Error('Cash register not found');
  }
  
  const movements = cashRegister.movements.filter(m => 
    new Date(m.date) >= startDate && new Date(m.date) <= endDate
  );
  
  // Agrupar por tipo
  const groupedMovements = {};
  for (const movement of movements) {
    if (!groupedMovements[movement.type]) {
      groupedMovements[movement.type] = {
        count: 0,
        total: 0,
        movements: []
      };
    }
    groupedMovements[movement.type].count++;
    groupedMovements[movement.type].total += movement.amount;
    groupedMovements[movement.type].movements.push(movement);
  }
  
  const closures = await CashClosure.find({
    partnerId,
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: -1 });
  
  return {
    partnerId,
    period: { startDate, endDate },
    summary: {
      initialBalance: cashRegister.initialBalance,
      finalBalance: cashRegister.balance,
      totalIncome: (groupedMovements.sale?.total || 0) + (groupedMovements.deposit?.total || 0),
      totalExpenses: (groupedMovements.expense?.total || 0) + (groupedMovements.withdrawal?.total || 0),
      movementCount: movements.length
    },
    groupedMovements,
    closures
  };
};

module.exports = {
  registerExpense,
  withdrawCash,
  depositCash,
  adjustCash,
  closeCashRegister,
  getCashReport
};