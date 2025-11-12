import React, { useState } from "react";
import { useNavigate } from "react-router";
import { FaChartLine, FaClipboardList, FaCog, FaBoxOpen, FaRegFileAlt, FaRegImage, FaRegPlayCircle, FaRegFolderOpen, FaFlask, FaIndustry } from "react-icons/fa";
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
    icon: <FaBoxOpen size={36} color="#4f8cff" />, // Work In Progress
    title: "Work In Progress",
    desc: "Informasi mengenai batch produk yang dalam proses pengerjaan.",
  },
  {
    icon: <FaClipboardList size={36} color="#38e6c5" />, // Production
    title: "Production",
    desc: "Informasi proses produksi secara keseluruhan.",
  },
  {
    icon: <FaIndustry size={36} color="#8b5cf6" />, // Line PN1
    title: "Line PN1",
    desc: "Dashboard produksi pabrik untuk production line PN1.",
  },
  {
    icon: <FaIndustry size={36} color="#ec4899" />, // Line PN2
    title: "Line PN2",
    desc: "Dashboard produksi pabrik untuk production line PN2.",
  },
  {
    icon: <FaFlask size={36} color="#22c55e" />, // Quality
    title: "Quality",
    desc: "Dashboard produksi pabrik untuk QC, Lab Mikro, dan QA.",
  },
  {
    icon: <FaRegFolderOpen size={36} color="#e57373" />,
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
    } else if (card.title === "Work In Progress") {
      navigate("/wip");
    } else if (card.title === "Production") {
      navigate("/production");
    } else if (card.title === "Line PN1") {
      navigate("/line-pn1");
    } else if (card.title === "Line PN2") {
      navigate("/line-pn2");
    } else if (card.title === "Quality") {
      navigate("/quality");
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
