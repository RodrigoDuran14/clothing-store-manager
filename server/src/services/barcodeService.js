const Product = require('../models/Product');

// Generar código de barras EAN-13 (simulado para desarrollo)
const generateEAN13 = async () => {
  // Prefixo para Argentina (779)
  const prefix = '779';
  // Código de empresa (simulado)
  const companyCode = '12345';
  // Código de producto (incremental)
  const lastProduct = await Product.findOne().sort({ createdAt: -1 });
  let productCode = '00001';
  
  if (lastProduct && lastProduct.codigo_barra) {
    const lastCode = lastProduct.codigo_barra;
    const lastProductCode = lastCode.substring(8, 13);
    const nextNumber = parseInt(lastProductCode) + 1;
    productCode = nextNumber.toString().padStart(5, '0');
  }
  
  const codeWithoutCheck = `${prefix}${companyCode}${productCode}`;
  const checkDigit = calculateCheckDigit(codeWithoutCheck);
  
  return `${codeWithoutCheck}${checkDigit}`;
};

// Calcular dígito verificador para EAN-13
const calculateCheckDigit = (code) => {
  let sum = 0;
  for (let i = 0; i < code.length; i++) {
    const digit = parseInt(code[i]);
    if (i % 2 === 0) {
      sum += digit * 1;
    } else {
      sum += digit * 3;
    }
  }
  const remainder = sum % 10;
  const checkDigit = remainder === 0 ? 0 : 10 - remainder;
  return checkDigit;
};

// Validar código de barras
const validateBarcode = (barcode) => {
  if (!barcode || barcode.length !== 13) {
    return { valid: false, message: 'El código de barras debe tener 13 dígitos' };
  }
  
  const codeWithoutCheck = barcode.substring(0, 12);
  const providedCheckDigit = parseInt(barcode[12]);
  const calculatedCheckDigit = calculateCheckDigit(codeWithoutCheck);
  
  if (providedCheckDigit !== calculatedCheckDigit) {
    return { valid: false, message: 'Dígito verificador inválido' };
  }
  
  return { valid: true };
};

// Generar código de barras único
const generateUniqueBarcode = async () => {
  let barcode;
  let exists = true;
  let attempts = 0;
  const maxAttempts = 10;
  
  while (exists && attempts < maxAttempts) {
    barcode = await generateEAN13();
    const existingProduct = await Product.findOne({ codigo_barra: barcode });
    exists = !!existingProduct;
    attempts++;
  }
  
  if (exists) {
    // Si no se pudo generar único, usar timestamp
    barcode = `779${Date.now().toString().substring(0, 10)}`;
  }
  
  return barcode;
};

module.exports = {
  generateEAN13,
  generateUniqueBarcode,
  validateBarcode,
  calculateCheckDigit
};