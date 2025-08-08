function getProductCycleTimeAverage(data) {
  if (!Array.isArray(data)) return [];
  const grouped = {};
  data.forEach(item => {
    const key = item.Product_Name;
    if (!grouped[key]) {
      grouped[key] = {
        Product_ID: item.Product_ID,
        Product_Name: item.Product_Name,
        Kategori: item.Kategori,
        Dept: item.Dept,
        Batch_Nos: [],
        PCTs: [],
      };
    }
    grouped[key].Batch_Nos.push(item.Batch_No);
    if (typeof item.PCT === 'number') grouped[key].PCTs.push(item.PCT);
  });
  return Object.values(grouped).map(g => ({
    Product_ID: g.Product_ID,
    Product_Name: g.Product_Name,
    Kategori: g.Kategori,
    Dept: g.Dept,
    Batch_Nos: g.Batch_Nos,
    PCTAverage: g.PCTs.length ? Math.round(g.PCTs.reduce((a, b) => a + b, 0) / g.PCTs.length) : null
  }));
}

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
    groupPNCategory: item["Group_PNCategoryName"],
    price: item["Product_SalesHNA"],
    standard: item["StdOutput"],
    actual: item["BPHP"]
  }));
}

module.exports = { WipConverter, getProductCycleTimeAverage };