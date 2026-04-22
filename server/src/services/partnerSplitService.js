const Partner = require('../models/Partner');
const BankAccount = require('../models/BankAccount');
const PartnerCashRegister = require('../models/PartnerCashRegister');

// Servicio para dividir ingresos entre socios según los productos vendidos

// Determinar a qué socio pertenece cada item de la venta
const assignItemsToPartners = async (items) => {
  const partnerItems = {};
  
  for (const item of items) {
    // Encontrar socio dueño del producto
    const partner = await Partner.findByProduct(item.productId);
    
    if (partner) {
      if (!partnerItems[partner._id]) {
        partnerItems[partner._id] = {
          partnerId: partner._id,
          partnerName: partner.name,
          items: [],
          totalAmount: 0,
          ownershipPercentage: partner.ownershipPercentage
        };
      }
      
      const itemTotal = (item.unitPrice * item.quantity) - (item.discount || 0);
      partnerItems[partner._id].items.push({
        ...item,
        itemTotal
      });
      partnerItems[partner._id].totalAmount += itemTotal;
    }
  }
  
  return Object.values(partnerItems);
};

// Dividir el pago entre los socios según sus productos
const splitPayment = async (saleId, totalAmount, payments, userId) => {
  const sale = await require('../models/Sale').findById(saleId).populate('items');
  
  if (!sale) {
    throw new Error('Sale not found');
  }
  
  // Asignar items a socios
  const partnerAllocations = await assignItemsToPartners(sale.items);
  
  // Distribuir cada pago entre los socios proporcionalmente
  const partnerPayments = {};
  
  for (const payment of payments) {
    const paymentAmount = payment.amount;
    
    for (const allocation of partnerAllocations) {
      const proportion = allocation.totalAmount / totalAmount;
      const partnerPaymentAmount = paymentAmount * proportion;
      
      if (!partnerPayments[allocation.partnerId]) {
        partnerPayments[allocation.partnerId] = {
          partnerId: allocation.partnerId,
          partnerName: allocation.partnerName,
          totalPayment: 0,
          payments: [],
          bankAccountId: null,
          cashRegisterId: null
        };
      }
      
      partnerPayments[allocation.partnerId].totalPayment += partnerPaymentAmount;
      partnerPayments[allocation.partnerId].payments.push({
        method: payment.method,
        amount: partnerPaymentAmount,
        reference: payment.reference,
        originalPaymentAmount: paymentAmount
      });
    }
  }
  
  return Object.values(partnerPayments);
};

// Registrar ingreso en la cuenta del socio (caja o banco)
const registerPartnerIncome = async (partnerId, amount, saleId, paymentMethod, userId) => {
  const partner = await Partner.findById(partnerId);
  
  if (!partner) {
    throw new Error('Partner not found');
  }
  
  let movementResult = null;
  
  // Determinar destino según método de pago
  if (paymentMethod === 'cash') {
    // Ingreso a caja del socio
    const cashRegister = await PartnerCashRegister.findOne({ partnerId });
    
    if (!cashRegister) {
      throw new Error(`Cash register not found for partner ${partner.name}`);
    }
    
    movementResult = await cashRegister.addMovement(
      'sale',
      amount,
      `Sale income - Sale ID: ${saleId}`,
      saleId,
      'Sale',
      userId
    );
    
    return {
      destination: 'cash_register',
      accountId: cashRegister._id,
      balance: cashRegister.balance,
      movement: movementResult
    };
  } else {
    // Ingreso a cuenta bancaria del socio
    let bankAccount = null;
    
    // Usar la primera cuenta bancaria del socio por defecto
    if (partner.bankAccounts && partner.bankAccounts.length > 0) {
      bankAccount = await BankAccount.findById(partner.bankAccounts[0]);
    }
    
    if (!bankAccount) {
      throw new Error(`No bank account found for partner ${partner.name}`);
    }
    
    movementResult = await bankAccount.addMovement(
      'payment',
      amount,
      `Sale income - Sale ID: ${saleId}`,
      saleId,
      'Sale',
      null,
      userId
    );
    
    return {
      destination: 'bank_account',
      accountId: bankAccount._id,
      balance: bankAccount.balance,
      movement: movementResult
    };
  }
};

// Generar resumen de ingresos por socio para un período
const getPartnerIncomeSummary = async (startDate, endDate) => {
  const Sale = require('../models/Sale');
  
  const sales = await Sale.find({
    date: { $gte: startDate, $lte: endDate },
    status: 'completed'
  }).populate('items');
  
  const partnerSummary = {};
  
  for (const sale of sales) {
    const partnerAllocations = await assignItemsToPartners(sale.items);
    
    for (const allocation of partnerAllocations) {
      if (!partnerSummary[allocation.partnerId]) {
        partnerSummary[allocation.partnerId] = {
          partnerId: allocation.partnerId,
          partnerName: allocation.partnerName,
          totalSales: 0,
          saleCount: 0,
          items: []
        };
      }
      
      partnerSummary[allocation.partnerId].totalSales += allocation.totalAmount;
      partnerSummary[allocation.partnerId].saleCount += 1;
      partnerSummary[allocation.partnerId].items.push(...allocation.items);
    }
  }
  
  return Object.values(partnerSummary);
};

// Verificar si un producto pertenece a un socio específico (middleware)
const checkProductOwnership = async (productId, partnerId) => {
  const partner = await Partner.findById(partnerId);
  
  if (!partner) {
    return { authorized: false, message: 'Partner not found' };
  }
  
  const ownsProduct = await partner.ownsProduct(productId);
  
  return {
    authorized: ownsProduct,
    message: ownsProduct ? 'Authorized' : 'Product does not belong to this partner'
  };
};

// Calcular haberes y débitos entre socios
const calculatePartnerBalances = async (startDate, endDate) => {
  const partners = await Partner.find({ isActive: true });
  const partnerBalances = {};
  
  for (const partner of partners) {
    partnerBalances[partner._id] = {
      partnerId: partner._id,
      partnerName: partner.name,
      salesTotal: 0,
      expensesTotal: 0,
      netBalance: 0,
      cashRegisterBalance: 0,
      bankBalance: 0
    };
    
    // Obtener caja
    const cashRegister = await PartnerCashRegister.findOne({ partnerId: partner._id });
    if (cashRegister) {
      partnerBalances[partner._id].cashRegisterBalance = cashRegister.balance;
    }
    
    // Obtener cuentas bancarias
    let totalBankBalance = 0;
    for (const bankId of partner.bankAccounts) {
      const bankAccount = await BankAccount.findById(bankId);
      if (bankAccount) {
        totalBankBalance += bankAccount.balance;
      }
    }
    partnerBalances[partner._id].bankBalance = totalBankBalance;
  }
  
  return Object.values(partnerBalances);
};

module.exports = {
  assignItemsToPartners,
  splitPayment,
  registerPartnerIncome,
  getPartnerIncomeSummary,
  checkProductOwnership,
  calculatePartnerBalances
};