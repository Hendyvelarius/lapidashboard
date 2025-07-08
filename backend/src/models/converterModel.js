// converterModel.js
// Converts raw WIP data to frontend-friendly format


// Accepts new RAW WIP data (from sp_Dashboard_WIP 'RAW') and maps to frontend-friendly format
function WipConverter(rawData) {
  if (!Array.isArray(rawData)) return [];
  return rawData.map(item => ({
    id: item.Product_ID,
    name: item.Product_Name,
    batch: item.Batch_No,
    startDate: item["Tgl Timbang"],
    duration: item["Hari WIP"],
    process: typeof item["Tahapan Berjalan"] === 'string'
      ? item["Tahapan Berjalan"].split(';').map(s => s.trim()).filter(Boolean)
      : [],
    physicalDate: item["Close BPHP"],
    tarikDate: item["Tanggal Penarikan"],
    kelompok: item["Pengelompokan"],
    leadTime: item["leadTime"],
    dept: item["Dept"],
    groupPNCategory: item["Group_PNCategoryName"]
  }));
}

module.exports = { WipConverter };
