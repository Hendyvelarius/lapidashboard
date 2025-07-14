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
    icon: <FaClipboardList size={36} color="#38e6c5" />, // Order Fulfillment
    title: "Order Fulfillment",
    desc: "Pemenuhan produksi sesuai dengan target.",
  },
  {
    icon: <FaBoxOpen size={36} color="#4f8cff" />, // Work In Progress
    title: "Work In Progress",
    desc: "Produk dalam tahap pengerjaan.",
  },
  {
    icon: <FaRegFileAlt size={36} color="#ffb347" />,
    title: "Document Report",
    desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  },
  {
    icon: <FaRegImage size={36} color="#6a5acd" />,
    title: "Image Analysis",
    desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  },
  {
    icon: <FaRegPlayCircle size={36} color="#43a047" />,
    title: "Video Review",
    desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  },
  {
    icon: <FaRegFolderOpen size={36} color="#e57373" />,
    title: "Archive",
    desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  },
  {
    icon: <FaCog size={36} color="#222" />,
    title: "Settings",
    desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  },
];


const pctReports = [
  { title: "PCT Yearly", desc: "Informasi PCT tiap jenis produk dalam 12 bulan terakhir." },
  { title: "PCT Monthly", desc: "Informasi PCT setiap produk dalam periode 1 bulan terakhir." },
];

export default function ReportsGrid() {
  const [pctModalOpen, setPctModalOpen] = useState(false);
  const navigate = useNavigate();

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
      <h2 className="reports-title">Silahkan pilih <span style={{color: '#4f8cff'}}>kategori</span> laporan.</h2>
      <div className="reports-grid">
        {cards.map((card, idx) => (
          <div
            className="report-card"
            key={idx}
            tabIndex={0}
            role="button"
            onClick={() => card.modal ? setPctModalOpen(true) : null}
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
