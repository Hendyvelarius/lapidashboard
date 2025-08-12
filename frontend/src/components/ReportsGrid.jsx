import React, { useState } from "react";
import { useNavigate } from "react-router";
import { FaChartLine, FaClipboardList, FaCog, FaBoxOpen, FaRegFileAlt, FaRegImage, FaRegPlayCircle, FaRegFolderOpen } from "react-icons/fa";
import "../App.css";
import Modal from "./Modal";

const cards = [
  {
    icon: <FaChartLine size={36} color="#a259ff" />, // Product Cycle Time
    title: "Product Cycle Time",
    desc: "Waktu produksi dari awal hingga akhir.",
    modal: true,
  },
  {
    icon: <FaRegFileAlt size={36} color="#ffb347" />,
    title: "Finished Goods",
    desc: "Laporan prediksi, penjualan, dan stok produk.",
  },
  {
    icon: <FaClipboardList size={36} color="#38e6c5" />, // Order Fulfillment
    title: "In Construction",
    desc: "Work in progress, coming soon.",
  },
  {
    icon: <FaBoxOpen size={36} color="#4f8cff" />, // Work In Progress
    title: "In Construction",
    desc: "Work in progress, coming soon.",
  },

  {
    icon: <FaRegImage size={36} color="#6a5acd" />,
    title: "In Construction",
    desc: "Work in progress, coming soon.",
  },
  {
    icon: <FaRegPlayCircle size={36} color="#43a047" />,
    title: "In Construction",
    desc: "Work in progress, coming soon.",
  },
  {
    icon: <FaRegFolderOpen size={36} color="#e57373" />,
    title: "In Construction",
    desc: "Work in progress, coming soon.",
  },
  {
    icon: <FaCog size={36} color="#222" />,
    title: "In Construction",
    desc: "Work in progress, coming soon.",
  },
];


const pctReports = [
  { title: "PCT Yearly", desc: "Informasi PCT tiap jenis produk dalam 12 bulan terakhir." },
  { title: "PCT Monthly", desc: "Informasi PCT setiap produk dalam periode 1 bulan terakhir." },
];

export default function ReportsGrid() {
  const [pctModalOpen, setPctModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleCardClick = (card) => {
    if (card.title === "Product Cycle Time" && card.modal) {
      setPctModalOpen(true);
    } else if (card.title === "Finished Goods") {
      navigate("/stock-forecast");
    }
    // Add more navigation cases for other cards here later
  };

  const handlePctReportClick = (reportTitle) => {
    setPctModalOpen(false);
    if (reportTitle === "PCT Yearly") {
      navigate("/reports/pcttahunan");
    }
    if (reportTitle === "PCT Monthly") {
      navigate("/reports/pct-monthly");
    }
    // Add more navigation cases for other PCT reports here later
  };

  return (
    <div className="reports-grid-container">
      <h2 className="reports-title">Silahkan pilih <span style={{color: '#4f8cff'}}>kategori</span> dashboard.</h2>
      <div className="reports-grid">
        {cards.map((card, idx) => (
          <div
            className="report-card"
            key={idx}
            tabIndex={0}
            role="button"
            onClick={() => handleCardClick(card)}
          >
            <div className="report-card-icon">{card.icon}</div>
            <div className="report-card-title">{card.title}</div>
            <div className="report-card-desc">{card.desc}</div>
            <div className="report-card-arrow">→</div>
          </div>
        ))}
      </div>
      <Modal open={pctModalOpen} onClose={() => setPctModalOpen(false)} title="Laporan PCT (Product Cycle Time)">
        <div className="modal-list">
          {pctReports.map((r, i) => (
            <div 
              className="modal-list-item" 
              key={i} 
              tabIndex={0} 
              role="button"
              onClick={() => handlePctReportClick(r.title)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handlePctReportClick(r.title);
                }
              }}
            >
              <div className="modal-list-item-title">{r.title}</div>
              <div className="modal-list-item-desc">{r.desc}</div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
