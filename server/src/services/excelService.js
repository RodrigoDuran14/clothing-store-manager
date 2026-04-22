const ExcelJS = require('exceljs');
const path = require('path');

// Generar reporte de ventas en Excel
const generateSalesReport = async (data, options) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Ventas');
  
  // Configurar columnas
  worksheet.columns = [
    { header: 'Fecha', key: 'date', width: 15 },
    { header: 'Nº Venta', key: 'saleNumber', width: 20 },
    { header: 'Cliente', key: 'clientName', width: 25 },
    { header: 'Vendedor', key: 'sellerName', width: 20 },
    { header: 'Subtotal', key: 'subtotal', width: 15 },
    { header: 'Descuento', key: 'discount', width: 15 },
    { header: 'IVA', key: 'tax', width: 12 },
    { header: 'Total', key: 'total', width: 15 },
    { header: 'Estado', key: 'status', width: 15 },
    { header: 'Método Pago', key: 'paymentMethod', width: 15 }
  ];
  
  // Estilo de encabezados
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0D8F81' }
  };
  worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' } };
  
  // Agregar datos
  data.forEach(row => {
    worksheet.addRow({
      date: new Date(row.date).toLocaleDateString('es-AR'),
      saleNumber: row.saleNumber,
      clientName: row.clientName,
      sellerName: row.sellerName,
      subtotal: row.subtotal,
      discount: row.discount,
      tax: row.tax,
      total: row.total,
      status: row.status,
      paymentMethod: row.paymentMethod
    });
  });
  
  // Agregar totales al final
  const totalRow = worksheet.addRow({
    date: 'TOTALES',
    saleNumber: '',
    clientName: '',
    sellerName: '',
    subtotal: data.reduce((sum, r) => sum + r.subtotal, 0),
    discount: data.reduce((sum, r) => sum + r.discount, 0),
    tax: data.reduce((sum, r) => sum + r.tax, 0),
    total: data.reduce((sum, r) => sum + r.total, 0),
    status: '',
    paymentMethod: ''
  });
  
  totalRow.font = { bold: true };
  
  // Formato de números
  worksheet.getColumn('subtotal').numFmt = '"$"#,##0.00';
  worksheet.getColumn('discount').numFmt = '"$"#,##0.00';
  worksheet.getColumn('tax').numFmt = '"$"#,##0.00';
  worksheet.getColumn('total').numFmt = '"$"#,##0.00';
  
  // Agregar resumen en otra hoja
  const summarySheet = workbook.addWorksheet('Resumen');
  summarySheet.addRow(['Métrica', 'Valor']);
  summarySheet.addRow(['Total Ventas', data.length]);
  summarySheet.addRow(['Monto Total', data.reduce((sum, r) => sum + r.total, 0)]);
  summarySheet.addRow(['Promedio por Venta', data.reduce((sum, r) => sum + r.total, 0) / (data.length || 1)]);
  summarySheet.addRow(['Período', `${options.startDate} al ${options.endDate}`]);
  
  return workbook;
};

// Generar reporte de productos en Excel
const generateProductsReport = async (data, options) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Productos');
  
  worksheet.columns = [
    { header: 'Producto', key: 'name', width: 30 },
    { header: 'Categoría', key: 'category', width: 20 },
    { header: 'Stock Total', key: 'totalStock', width: 12 },
    { header: 'Precio', key: 'price', width: 15 },
    { header: 'Costo', key: 'cost', width: 15 },
    { header: 'Margen', key: 'margin', width: 12 },
    { header: 'Unidades Vendidas', key: 'unitsSold', width: 15 },
    { header: 'Ingresos', key: 'revenue', width: 15 }
  ];
  
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0D8F81' }
  };
  
  data.forEach(row => {
    worksheet.addRow({
      name: row.name,
      category: row.category,
      totalStock: row.totalStock,
      price: row.price,
      cost: row.cost,
      margin: `${row.margin.toFixed(1)}%`,
      unitsSold: row.unitsSold || 0,
      revenue: row.revenue || 0
    });
  });
  
  worksheet.getColumn('price').numFmt = '"$"#,##0.00';
  worksheet.getColumn('cost').numFmt = '"$"#,##0.00';
  worksheet.getColumn('revenue').numFmt = '"$"#,##0.00';
  
  return workbook;
};

// Generar reporte de clientes en Excel
const generateClientsReport = async (data, options) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Clientes');
  
  worksheet.columns = [
    { header: 'Cliente', key: 'name', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Teléfono', key: 'phone', width: 15 },
    { header: 'Total Gastado', key: 'totalSpent', width: 15 },
    { header: 'Compras', key: 'purchaseCount', width: 10 },
    { header: 'Promedio', key: 'average', width: 15 },
    { header: 'Última Compra', key: 'lastPurchase', width: 15 },
    { header: 'Categoría', key: 'category', width: 12 },
    { header: 'VIP', key: 'isVip', width: 8 }
  ];
  
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0D8F81' }
  };
  
  data.forEach(row => {
    worksheet.addRow({
      name: row.name,
      email: row.email,
      phone: row.phone,
      totalSpent: row.totalSpent,
      purchaseCount: row.purchaseCount,
      average: row.purchaseCount > 0 ? row.totalSpent / row.purchaseCount : 0,
      lastPurchase: row.lastPurchase ? new Date(row.lastPurchase).toLocaleDateString('es-AR') : 'Nunca',
      category: row.clientCategory,
      isVip: row.isVip ? 'Sí' : 'No'
    });
  });
  
  worksheet.getColumn('totalSpent').numFmt = '"$"#,##0.00';
  worksheet.getColumn('average').numFmt = '"$"#,##0.00';
  
  return workbook;
};

// Guardar workbook como buffer
const saveWorkbook = async (workbook) => {
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

module.exports = {
  generateSalesReport,
  generateProductsReport,
  generateClientsReport,
  saveWorkbook
};