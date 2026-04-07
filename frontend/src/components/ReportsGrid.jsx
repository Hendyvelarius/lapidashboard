import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { FaChartLine, FaClipboardList, FaBoxOpen, FaRegFileAlt, FaFlask, FaIndustry, FaArchive, FaTachometerAlt } from "react-icons/fa";
import "../App.css";
import Modal from "./Modal";

const cards = [
  {
    icon: <FaTachometerAlt size={36} color="#4f8cff" />,
    title: "Summary",
    desc: "Dashboard ringkasan keseluruhan performa pabrik.",
    route: "/summary",
  },
  {
    icon: <FaClipboardList size={36} color="#38e6c5" />,
    title: "Production",
    desc: "Informasi proses produksi secara keseluruhan.",
    route: "/production",
  },
  {
    icon: <FaIndustry size={36} color="#8b5cf6" />,
    title: "Line PN1",
    desc: "Dashboard produksi pabrik untuk production line PN1.",
    route: "/line-pn1",
  },
  {
    icon: <FaIndustry size={36} color="#ec4899" />,
    title: "Line PN2",
    desc: "Dashboard produksi pabrik untuk production line PN2.",
    route: "/line-pn2",
  },
  {
    icon: <FaFlask size={36} color="#22c55e" />,
    title: "Quality",
    desc: "Dashboard quality: monitoring produk dan material.",
    group: true,
    items: [
      { key: "product", label: "Product", desc: "Quality monitoring untuk produk jadi.", icon: <FaFlask size={20} color="#22c55e" />, route: "/quality" },
      { key: "material", label: "Material", desc: "Quality Control: monitoring material masuk, inspeksi, dan release.", icon: <FaClipboardList size={20} color="#e57373" />, route: "/quality-control" },
    ],
  },
  {
    icon: <FaArchive size={36} color="#94a3b8" />,
    title: "Legacy",
    desc: "Laporan PCT, Finished Goods, dan Work In Progress.",
    group: true,
    items: [
      { key: "pct", label: "Product Cycle Time", desc: "Waktu produksi dari awal hingga akhir.", icon: <FaChartLine size={20} color="#a259ff" />, modal: true },
      { key: "fg", label: "Finished Goods", desc: "Laporan prediksi, penjualan, dan stok produk.", icon: <FaRegFileAlt size={20} color="#ffb347" />, route: "/stock-forecast" },
      { key: "wip", label: "Work In Progress", desc: "Batch produk dalam proses pengerjaan.", icon: <FaBoxOpen size={20} color="#4f8cff" />, route: "/wip" },
    ],
  },
];

const pctReports = [
  { title: "PCT Yearly", desc: "Informasi PCT tiap jenis produk dalam 12 bulan terakhir." },
  { title: "PCT Monthly", desc: "Informasi PCT setiap produk dalam periode 1 bulan terakhir." },
];

function GroupCard({ card, onItemClick }) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef(null);
  const cardRef = useRef(null);

  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 200);
  };

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return (
    <div
      className="report-card report-card-group"
      ref={cardRef}
      tabIndex={0}
      role="button"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      <div className="report-card-icon">{card.icon}</div>
      <div className="report-card-title">{card.title}</div>
      <div className="report-card-desc">{card.desc}</div>
      <div className="report-card-arrow">▾</div>

      {open && (
        <div className="group-popup" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          <div className="group-popup-header">
            <span className="group-popup-title">{card.title}</span>
            <button className="group-popup-close" onClick={(e) => { e.stopPropagation(); setOpen(false); }} aria-label="Close">✕</button>
          </div>
          <div className="group-popup-items">
            {card.items.map((item) => (
              <div
                key={item.key}
                className="group-popup-item"
                tabIndex={0}
                role="button"
                onClick={(e) => { e.stopPropagation(); onItemClick(item); setOpen(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onItemClick(item); setOpen(false); } }}
              >
                <div className="group-popup-item-icon">{item.icon}</div>
                <div className="group-popup-item-text">
                  <div className="group-popup-item-label">{item.label}</div>
                  <div className="group-popup-item-desc">{item.desc}</div>
                </div>
                <div className="group-popup-item-arrow">→</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportsGrid() {
  const [pctModalOpen, setPctModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleCardClick = (card) => {
    if (card.route) {
      navigate(card.route);
    }
  };

  const handleGroupItemClick = (item) => {
    if (item.modal) {
      setPctModalOpen(true);
    } else if (item.route) {
      navigate(item.route);
    }
  };

  const handlePctReportClick = (reportTitle) => {
    setPctModalOpen(false);
    if (reportTitle === "PCT Yearly") {
      navigate("/reports/pcttahunan");
    }
    if (reportTitle === "PCT Monthly") {
      navigate("/reports/pct-monthly");
    }
  };

  return (
    <div className="reports-grid-container">
      <h2 className="reports-title">Silahkan pilih <span style={{color: '#4f8cff'}}>kategori</span> dashboard.</h2>
      <div className="reports-grid">
        {cards.map((card, idx) =>
          card.group ? (
            <GroupCard key={idx} card={card} onItemClick={handleGroupItemClick} />
          ) : (
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
          )
        )}
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
