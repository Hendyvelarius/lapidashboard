import React from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import { AuthProvider } from "./context/AuthContext";
import { HelpProvider } from "./context/HelpContext";
import ProtectedRoute from "./components/ProtectedRoute";
import App from "./App";
import Reports from "./Reports";
import PCTReportPage from "./components/PCTReportPage";
import WIPReportPage from "./components/WIPReportPage";
import StockForecastDashboard from "./components/StockForecastDashboard";
import SummaryDashboard from "./components/SummaryDashboard";
import ProductionDashboard from "./components/ProductionDashboard";
import LinePN1Dashboard from "./components/LinePN1Dashboard";
import LinePN2Dashboard from "./components/LinePN2Dashboard";
import QualityDashboard from "./components/QualityDashboard";
import LandingPage from "./components/LandingPage";

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
        <HelpProvider>
        <AuthHandler>
          <Routes>
            <Route path="/" element={<ProtectedRoute pageName="home"><LandingPage /></ProtectedRoute>} />
            {/* <Route path="/beta" element={<ProtectedRoute pageName="beta"><App /></ProtectedRoute>} /> */}
            <Route path="/eDashboard" element={<ProtectedRoute pageName="home"><LandingPage /></ProtectedRoute>} />
            <Route path="/summary" element={<ProtectedRoute pageName="summary"><SummaryDashboard /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute pageName="reports"><Reports /></ProtectedRoute>} />
        <Route
          path="/reports/pcttahunan"
          element={
            <ProtectedRoute pageName="pct-reports">
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
            <ProtectedRoute pageName="pct-reports">
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
        <Route path="/wip" element={<ProtectedRoute pageName="wip"><WIPReportPage /></ProtectedRoute>} />
        <Route path="/production" element={<ProtectedRoute pageName="production"><ProductionDashboard /></ProtectedRoute>} />
        <Route path="/line-pn1" element={<ProtectedRoute pageName="line-pn1"><LinePN1Dashboard /></ProtectedRoute>} />
        <Route path="/line-pn2" element={<ProtectedRoute pageName="line-pn2"><LinePN2Dashboard /></ProtectedRoute>} />
        <Route path="/quality" element={<ProtectedRoute pageName="quality"><QualityDashboard /></ProtectedRoute>} />
        <Route path="/stock-forecast" element={<ProtectedRoute pageName="stock-forecast"><StockForecastDashboard /></ProtectedRoute>} />
      </Routes>
      </AuthHandler>
      </HelpProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
    