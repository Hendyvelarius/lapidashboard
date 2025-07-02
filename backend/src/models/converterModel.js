// converterModel.js
// Converts raw WIP data to frontend-friendly format

function WipConverter(rawData) {
  if (!Array.isArray(rawData)) return [];
  return rawData.map(item => ({
    name: item.Product_Name,
    batch: item.Batch_No,
    startDate: item["Tgl Timbang"],
    duration: item["Hari WIP"],
    process: typeof item["Tahapan Berjalan"] === 'string'
      ? item["Tahapan Berjalan"].split(';').map(s => s.trim()).filter(Boolean)
      : [],
    physicalDate: item["Close BPHP"]
  }));
}

module.exports = { WipConverter };
