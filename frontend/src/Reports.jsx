import React from "react";
import Sidebar from "./components/Sidebar";
import ReportsGrid from "./components/ReportsGrid";
import "./App.css";

export default function Reports() {
  return (
    <div className="dashboard-container" style={{ minHeight: '100vh' }}>
      <Sidebar />
      <main className="content-area" style={{ position: "relative", minHeight: 'calc(100vh - 3rem)' }}>
        <ReportsGrid />
      </main>
    </div>
  );
}
