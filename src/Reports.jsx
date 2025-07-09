import React from "react";
import Sidebar from "./components/Sidebar";
import ReportsGrid from "./components/ReportsGrid";
import "./App.css";

export default function Reports() {
  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="content-area" style={{ position: "relative" }}>
        <ReportsGrid />
      </main>
    </div>
  );
}
