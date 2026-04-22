const BankAccount = require('../models/BankAccount');
const Sale = require('../models/Sale');
const Payment = require('../models/Payment');

// Servicio para gestión bancaria

// Registrar pago de venta en cuenta bancaria
const registerSalePayment = async (saleId, amount, bankAccountId, userId, session = null) => {
  const sale = await Sale.findById(saleId);
  if (!sale) {
    throw new Error('Sale not found');
  }
  
  const bankAccount = await BankAccount.findById(bankAccountId);
  if (!bankAccount || !bankAccount.isActive) {
    throw new Error('Bank account not found or inactive');
  }
  
  const movement = await bankAccount.addMovement(
    'sale',
    amount,
    `Sale ${sale.saleNumber} - Payment received`,
    saleId,
    'Sale',
    sale.saleNumber,
    userId,
    session
  );
  
  return {
    saleId: sale._id,
    saleNumber: sale.saleNumber,
    bankAccount: bankAccount.fullName,
    amount,
    newBalance: bankAccount.balance,
    movement
  };
};

// Registrar reembolso de devolución
const registerRefund = async (returnId, amount, bankAccountId, userId, session = null) => {
  const Return = require('../models/Return');
  const returnData = await Return.findById(returnId);
  if (!returnData) {
    throw new Error('Return not found');
  }
  
  const bankAccount = await BankAccount.findById(bankAccountId);
  if (!bankAccount || !bankAccount.isActive) {
    throw new Error('Bank account not found or inactive');
  }
  
  const movement = await bankAccount.addMovement(
    'refund',
    amount,
    `Return ${returnData.returnNumber} - Refund processed`,
    returnId,
    'Return',
    returnData.returnNumber,
    userId,
    session
  );
  
  return {
    returnId: returnData._id,
    returnNumber: returnData.returnNumber,
    bankAccount: bankAccount.fullName,
    amount,
    newBalance: bankAccount.balance,
    movement
  };
};

// Conciliar movimientos con extracto bancario
const reconcileMovements = async (bankAccountId, movementsToReconcile, userId) => {
  const bankAccount = await BankAccount.findById(bankAccountId);
  if (!bankAccount) {
    throw new Error('Bank account not found');
  }
  
  const reconciled = [];
  const errors = [];
  
  for (const movementId of movementsToReconcile) {
    try {
      const movement = await bankAccount.reconcileMovement(movementId, userId);
      reconciled.push(movement);
    } catch (error) {
      errors.push({ movementId, error: error.message });
    }
  }
  
  return {
    reconciled: reconciled.length,
    errors,
    reconciledMovements: reconciled
  };
};

// Obtener reporte de cuenta por período
const getAccountReport = async (bankAccountId, startDate, endDate) => {
  const bankAccount = await BankAccount.findById(bankAccountId);
  if (!bankAccount) {
    throw new Error('Bank account not found');
  }
  
  const summary = await bankAccount.getMovementSummary(startDate, endDate);
  
  // Agrupar por tipo de movimiento
  const groupedByType = {};
  for (const movement of summary.movements) {
    if (!groupedByType[movement.type]) {
      groupedByType[movement.type] = {
        count: 0,
        total: 0
      };
    }
    groupedByType[movement.type].count++;
    groupedByType[movement.type].total += movement.amount;
  }
  
  return {
    account: {
      id: bankAccount._id,
      name: bankAccount.fullName,
      bankName: bankAccount.bankName,
      accountNumber: bankAccount.accountNumber
    },
    period: { startDate, endDate },
    summary: {
      startBalance: summary.startBalance,
      income: summary.income,
      expenses: summary.expenses,
      endBalance: summary.endBalance,
      movementCount: summary.movementCount
    },
    groupedByType,
    movements: summary.movements
  };
};

// Obtener dashboard financiero
const getFinancialDashboard = async () => {
  const accounts = await BankAccount.find({ isActive: true });
  const totalBalance = await BankAccount.getTotalBalance();
  
  const accountsSummary = accounts.map(account => ({
    id: account._id,
    name: account.fullName,
    bankName: account.bankName,
    accountNumber: account.accountNumber,
    balance: account.balance,
    isDefault: account.isDefault
  }));
  
  // Últimos movimientos (últimos 10 de todas las cuentas)
  const allMovements = [];
  for (const account of accounts) {
    const recentMovements = account.movements
      .sort((a, b) => b.date - a.date)
      .slice(0, 5)
      .map(m => ({
        ...m.toObject(),
        accountName: account.fullName
      }));
    allMovements.push(...recentMovements);
  }
  
  allMovements.sort((a, b) => b.date - a.date);
  const lastMovements = allMovements.slice(0, 10);
  
  return {
    totalBalance,
    accounts: accountsSummary,
    accountCount: accounts.length,
    lastMovements
  };
};

module.exports = {
  registerSalePayment,
  registerRefund,
  reconcileMovements,
  getAccountReport,
  getFinancialDashboard
};