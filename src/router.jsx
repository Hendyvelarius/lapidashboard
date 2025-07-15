import React from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import App from "./App";
import Reports from "./Reports";
import ModularReportPage from "./components/ModularReportPage";
import AIChat from "./components/AIChat";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/reports" element={<Reports />} />
        <Route
          path="/reports/pcttahunan"
          element={
            <ModularReportPage
              title="Product Cycle Time (PCT) Tahunan"
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
        <Route
          path="/reports/pct-monthly"
          element={
            <ModularReportPage
              title="Product Cycle Time (PCT) Monthly"
              apiEndpoint="/api/pct"
              tableColumns={[
                { key: "kode", label: "Kode" },
                { key: "namaProduk", label: "Nama Produk" },
                { key: "kategori", label: "Kategori" },
                { key: "departemen", label: "Departemen" },
                { key: "batchNo", label: "Batch No" },
                { key: "batchDate", label: "Batch Date" },
                { key: "pct", label: "PCT (hari)" },
              ]}
              dataMapper={(rawData) => {
                // Handle the response structure - data might be nested
                const actualData = rawData.data || rawData || [];
                return actualData.map(item => ({
                  kode: item.Product_ID || '-',
                  namaProduk: item.Product_Name || '-',
                  kategori: item.Kategori || '-',
                  departemen: item.Dept || '-',
                  batchNo: item.Batch_No || '-',
                  batchDate: item.Batch_Date ? new Date(item.Batch_Date).toLocaleDateString('id-ID') : '-',
                  pct: item.PCT || 0,
                  // Keep the raw PCT value for calculations (use 'pct' for the key expected by ModularReportPage)
                  rataRataPCT: item.PCT || 0,
                }));
              }}
            />
          }
        />
        <Route path="/ai" element={<AIChat />} />
      </Routes>
    </BrowserRouter>
  );
}
    