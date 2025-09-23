const QRCode = require("qrcode");

const generateProductQR = async ({ id, name, category, size, price }) => {
  const data = {
    id: id.toString(),
    name,
    category,
    size,
    price,
  };

  const jsonData = JSON.stringify(data);

  try {
    const qrImageDataUrl = await QRCode.toDataURL(jsonData);
    return qrImageDataUrl;
  } catch (error) {
    throw new Error("Error al generar QR: " + error.message);
  }
};

module.exports = generateProductQR;
