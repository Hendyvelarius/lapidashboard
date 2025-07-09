import React from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import App from "./App";
import Reports from "./Reports";
import ModularReportPage from "./components/ModularReportPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/reports" element={<Reports />} />
        <Route
          path="/reports/pct-per-produk"
          element={
            <ModularReportPage
              title="PCT Per Produk"
              apiEndpoint="/api/pctAverage"
              tableColumns={[
                { key: "kode", label: "Kode" },
                { key: "namaProduk", label: "Nama Produk" },
                { key: "kategori", label: "Kategori" },
                { key: "departemen", label: "Departemen" },
                { key: "batch", label: "Batch" },
                { key: "rataRataPCT", label: "Rata-rata PCT (hari)" },
              ]}
              dataMapper={(rawData) => {
                return rawData.map(item => ({
                  kode: item.Product_ID || '-',
                  namaProduk: item.Product_Name || '-',
                  kategori: item.Kategori || '-',
                  departemen: item.Dept || '-',
                  batch: Array.isArray(item.Batch_Nos) ? item.Batch_Nos.length : 0,
                  rataRataPCT: item.PCTAverage || 0,
                }));
              }}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
    