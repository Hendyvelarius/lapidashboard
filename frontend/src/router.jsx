import React from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import App from "./App";
import Reports from "./Reports";
import PCTReportPage from "./components/PCTReportPage";
import StockForecastDashboard from "./components/StockForecastDashboard";
import SummaryDashboard from "./components/SummaryDashboard";
import AIChat from "./components/AIChat";

// Component to handle auth token from URL
function AuthHandler({ children }) {
  // URL authentication is now handled by AuthContext
  // This component just provides the routing structure
  return children;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthHandler>
          <Routes>
            <Route path="/" element={<ProtectedRoute><SummaryDashboard /></ProtectedRoute>} />
            <Route path="/beta" element={<ProtectedRoute><App /></ProtectedRoute>} />
            <Route path="/eDashboard" element={<ProtectedRoute><SummaryDashboard /></ProtectedRoute>} />
            <Route path="/summary" element={<ProtectedRoute><SummaryDashboard /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/reports" element={<Reports />} />
        <Route
          path="/reports/pcttahunan"
          element={
            <ProtectedRoute>
              <PCTReportPage
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
                  // Handle the response structure - data is nested in the response
                  const actualData = rawData.data || rawData || [];
                  return actualData.map(item => ({
                    kode: item.Product_ID || '-',
                    namaProduk: item.Product_Name || '-',
                    kategori: item.Kategori || '-',
                    departemen: item.Dept || '-',
                    batch: Array.isArray(item.Batch_Nos) ? item.Batch_Nos.length : 0,
                    rataRataPCT: item.PCTAverage || 0,
                  }));
                }}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/pct-monthly"
          element={
            <ProtectedRoute>
              <PCTReportPage
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
                  // Keep the raw PCT value for calculations (use 'pct' for the key expected by PCTReportPage)
                  rataRataPCT: item.PCT || 0,
                }));
              }}
              />
            </ProtectedRoute>
          }
        />
        <Route path="/stock-forecast" element={<ProtectedRoute><StockForecastDashboard /></ProtectedRoute>} />
        <Route path="/ai" element={<ProtectedRoute><AIChat /></ProtectedRoute>} />
      </Routes>
      </AuthHandler>
      </AuthProvider>
    </BrowserRouter>
  );
}
    