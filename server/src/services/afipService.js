const crypto = require('crypto');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// NOTA: Esta es una implementación base. Para producción,
// se necesita la integración real con los web services de AFIP

// Configuración de AFIP
const AFIP_CONFIG = {
  // URLs de los servicios (producción vs testing)
  urls: {
    production: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx',
    testing: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx'
  },
  // Códigos de punto de venta (según cada comercio)
  pointOfSaleCodes: {
    '0001': 1,
    '0002': 2
  },
  // Códigos de tipo de comprobante
  invoiceTypes: {
    'A': 1,      // Factura A
    'B': 6,      // Factura B
    'C': 11,     // Factura C
    'CREDIT_NOTE_A': 2,   // Nota de Crédito A
    'CREDIT_NOTE_B': 7,   // Nota de Crédito B
    'CREDIT_NOTE_C': 12,  // Nota de Crédito C
    'DEBIT_NOTE_A': 3,    // Nota de Débito A
    'DEBIT_NOTE_B': 8,    // Nota de Débito B
    'DEBIT_NOTE_C': 13    // Nota de Débito C
  },
  // Códigos de documento
  documentTypes: {
    'CUIT': 80,
    'CUIL': 86,
    'DNI': 96,
    'PASSPORT': 94
  },
  // Códigos de IVA
  vatCodes: {
    'IVA_21': 5,      // 21%
    'IVA_10_5': 4,    // 10.5%
    'IVA_27': 6,      // 27%
    'EXEMPT': 2,      // Exento
    'NOT_REGISTERED': 1 // No inscripto
  }
};

// Generar TRA (Ticket de Requerimiento de Acceso)
const generateTRA = (service = 'wsfe') => {
  const now = new Date();
  const expiration = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutos de expiración
  
  const tra = `<?xml version="1.0" encoding="UTF-8"?>
    <loginTicketRequest version="1.0">
      <header>
        <uniqueId>${Date.now()}</uniqueId>
        <generationTime>${now.toISOString()}</generationTime>
        <expirationTime>${expiration.toISOString()}</expirationTime>
      </header>
      <service>${service}</service>
    </loginTicketRequest>`;
  
  return tra;
};

// Firmar TRA con certificado (simulado)
const signTRA = (tra) => {
  // En producción, se debe firmar con el certificado X.509
  // Esta es una implementación simulada para desarrollo
  const signature = crypto
    .createHash('sha256')
    .update(tra)
    .digest('base64');
  
  return signature;
};

// Obtener ticket de acceso (Login CMS)
const getLoginTicket = async () => {
  try {
    const tra = generateTRA();
    const signature = signTRA(tra);
    
    // En producción, enviar a AFIP
    // const response = await axios.post(AFIP_CONFIG.urls.testing, {
    //   ...body
    // });
    
    // Simulación para desarrollo
    return {
      token: 'SIMULATED_TOKEN_' + Date.now(),
      sign: 'SIMULATED_SIGN_' + Date.now(),
      expirationTime: new Date(Date.now() + 5 * 60 * 1000)
    };
  } catch (error) {
    console.error('Error getting login ticket:', error.message);
    throw new Error('Failed to authenticate with AFIP');
  }
};

// Obtener último número de comprobante
const getLastInvoiceNumber = async (pointOfSale, invoiceType) => {
  try {
    const auth = await getLoginTicket();
    
    // En producción, llamar a FECompUltimoAutorizado
    // const response = await axios.post(...);
    
    // Simulación para desarrollo
    const lastNumber = 1; // Esto debería venir de la BD o AFIP
    
    return {
      success: true,
      lastNumber,
      pointOfSale,
      invoiceType
    };
  } catch (error) {
    console.error('Error getting last invoice number:', error.message);
    throw new Error('Failed to get last invoice number from AFIP');
  }
};

// Autorizar comprobante
const authorizeInvoice = async (invoiceData) => {
  try {
    const auth = await getLoginTicket();
    
    // Construir cuerpo de la solicitud
    const requestBody = {
      Auth: auth,
      FeCAEReq: {
        FeCabReq: {
          CantReg: invoiceData.details.length,
          PtoVta: parseInt(invoiceData.pointOfSale),
          CbteTipo: AFIP_CONFIG.invoiceTypes[invoiceData.invoiceType]
        },
        FeDetReq: invoiceData.details.map(detail => ({
          Concepto: 1, // 1: Productos, 2: Servicios, 3: Productos y Servicios
          DocTipo: AFIP_CONFIG.documentTypes[invoiceData.receiver.taxIdType] || 96,
          DocNro: parseInt(invoiceData.receiver.taxId.replace(/\D/g, '')),
          CbteDesde: invoiceData.sequentialNumber,
          CbteHasta: invoiceData.sequentialNumber,
          CbteFch: formatDateForAFIP(invoiceData.issueDate),
          ImpTotal: invoiceData.total,
          ImpTotConc: 0,
          ImpNeto: invoiceData.subtotal,
          ImpOpEx: 0,
          ImpIVA: invoiceData.totalTaxes,
          ImpTrib: 0,
          FchServDesde: null,
          FchServHasta: null,
          FchVtoPago: null,
          MonId: 'PES',
          MonCotiz: 1,
          Iva: invoiceData.taxes.map(tax => ({
            Id: AFIP_CONFIG.vatCodes[tax.type],
            BaseImp: tax.taxableAmount,
            Importe: tax.amount
          })),
          CbtesAsoc: []
        }))
      }
    };
    
    // En producción, enviar a AFIP (FECompAutorizar)
    // const response = await axios.post(...);
    
    // Simulación para desarrollo
    const cae = `CAE${Date.now().toString().slice(-14)}`;
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 10);
    
    return {
      success: true,
      cae,
      expirationDate,
      qrCode: `https://www.afip.gob.ar/fe/qr/?p=${cae}`,
      rawResponse: { simulated: true }
    };
  } catch (error) {
    console.error('Error authorizing invoice:', error.message);
    throw new Error('Failed to authorize invoice with AFIP');
  }
};

// Formatear fecha para AFIP (YYYYMMDD)
const formatDateForAFIP = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return parseInt(`${year}${month}${day}`);
};

// Consultar comprobante
const queryInvoice = async (pointOfSale, invoiceNumber, invoiceType) => {
  try {
    const auth = await getLoginTicket();
    
    // En producción, llamar a FECompConsultar
    // const response = await axios.post(...);
    
    // Simulación para desarrollo
    return {
      success: true,
      result: {
        cae: `CAE12345678901234`,
        expirationDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        status: 'Aprobado'
      }
    };
  } catch (error) {
    console.error('Error querying invoice:', error.message);
    throw new Error('Failed to query invoice from AFIP');
  }
};

module.exports = {
  AFIP_CONFIG,
  getLoginTicket,
  getLastInvoiceNumber,
  authorizeInvoice,
  queryInvoice,
  formatDateForAFIP
};