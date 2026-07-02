import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Tv, Workflow, ChevronRight, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { generateTVModeToken, clearAuthData } from '../utils/auth';
import { hasPageAccess } from '../config/AccessSettings';
import './SettingsModal.css';

const SettingsModal = ({ onClose }) => {
  const { user, decryptUserInfo } = useAuth();
  const navigate = useNavigate();
  const [tvModeEnabled, setTvModeEnabled] = useState(false);
  const [division, setDivision] = useState('PL');
  const [expiry, setExpiry] = useState('1week');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  // Check if currently in TV Mode
  const isInTVMode = user?.log_NIK === 'TV';

  // TV Mode is restricted to the IT (NT) department (or an existing TV Mode session).
  const hasNTAccess = user?.emp_DeptID === 'NT' || isInTVMode;

  // Alur Proses Group configuration access (PL / MS / NT) — driven by AccessSettings.
  const canConfigureAlur = hasPageAccess('alur-config', user);

  useEffect(() => {
    if (user && isInTVMode) {
      setDivision(user.emp_DeptID || 'PL');
    }
  }, [user, isInTVMode]);

  const handleSaveSettings = async () => {
    setIsSubmitting(true);
    try {
      const success = generateTVModeToken(division, expiry);
      if (success) {
        await decryptUserInfo();
        onClose();
      }
    } catch (error) {
      console.error('Error updating settings:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDisableTVMode = () => {
    clearAuthData();
    window.location.href = 'http://192.168.1.24/lms/';
  };

  const openAlurConfig = () => {
    if (!canConfigureAlur) return;
    onClose();
    navigate('/alur-config');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content settings-modal-pro">
        <div className="modal-header">
          <span className="modal-title">⚙️ Pengaturan</span>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="modal-body">
          <div className="settings-cards">

            {/* ============================ TV MODE ============================ */}
            <div className="settings-card">
              <div className="settings-card-head">
                <div className="settings-card-icon amber"><Tv size={22} /></div>
                <div className="settings-card-title-wrap">
                  <h3 className="settings-card-title">
                    TV Mode
                    {isInTVMode && <span className="settings-badge active">Aktif</span>}
                    {!hasNTAccess && <span className="settings-badge restricted">Terbatas</span>}
                  </h3>
                  <p className="settings-card-desc">
                    Buat sesi tampilan jangka panjang untuk layar televisi / monitor dashboard.
                  </p>
                </div>
              </div>

              {hasNTAccess ? (
                <div className="settings-card-body">
                  {isInTVMode ? (
                    <>
                      <div className="settings-note success" style={{ marginBottom: '0.9rem' }}>
                        <strong>✓ TV Mode sedang aktif</strong>
                        <div style={{ marginTop: '0.35rem' }}>Divisi: {user?.emp_DeptID || 'Unknown'}</div>
                      </div>
                      <button className="settings-btn danger block" onClick={() => setShowDisableConfirm(true)}>
                        Nonaktifkan TV Mode
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="settings-inline-row" style={{ marginBottom: tvModeEnabled ? '0.9rem' : 0 }}>
                        <span style={{ fontSize: '0.86rem', fontWeight: 500, color: '#374151' }}>Aktifkan TV Mode</span>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={tvModeEnabled}
                            onChange={(e) => setTvModeEnabled(e.target.checked)}
                          />
                          <span className="slider round"></span>
                        </label>
                      </div>

                      {tvModeEnabled && (
                        <>
                          <div className="settings-field">
                            <label>Divisi</label>
                            <select className="settings-select" value={division} onChange={(e) => setDivision(e.target.value)}>
                              <option value="PL">PL</option>
                              <option value="PN1">PN1</option>
                              <option value="PN2">PN2</option>
                              <option value="Quality">Quality</option>
                            </select>
                          </div>
                          <div className="settings-field">
                            <label>Masa Berlaku Sesi</label>
                            <select className="settings-select" value={expiry} onChange={(e) => setExpiry(e.target.value)}>
                              <option value="1week">1 Minggu</option>
                              <option value="1month">1 Bulan</option>
                              <option value="6months">6 Bulan</option>
                              <option value="1year">1 Tahun</option>
                            </select>
                          </div>
                          <div className="settings-note warn" style={{ marginBottom: '0.9rem' }}>
                            <strong>Catatan:</strong> Mengaktifkan TV Mode membuat sesi baru untuk divisi terpilih.
                            Sesi akan berakhir setelah durasi yang dipilih.
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button className="settings-btn ghost" onClick={onClose} disabled={isSubmitting}>Batal</button>
                            <button className="settings-btn primary" onClick={handleSaveSettings} disabled={isSubmitting}>
                              {isSubmitting ? 'Menyimpan...' : 'Simpan & Aktifkan'}
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="settings-card-body">
                  <div className="settings-note muted">
                    Fitur ini hanya tersedia untuk departemen IT (NT).
                  </div>
                </div>
              )}
            </div>

            {/* ================= KONFIGURASI ALUR PROSES GROUP ================= */}
            <div className="settings-card">
              <div className="settings-card-head">
                <div className="settings-card-icon violet"><Workflow size={22} /></div>
                <div className="settings-card-title-wrap">
                  <h3 className="settings-card-title">
                    Konfigurasi Alur Proses Group
                    {!canConfigureAlur && <span className="settings-badge restricted">Terbatas</span>}
                  </h3>
                  <p className="settings-card-desc">
                    Atur pengelompokan tahapan proses — tentukan tahapan mana masuk ke kategori mana
                    (mis. Timbang, Proses, Kemas Primer, Kemas Sekunder, QC, Mikro, QA).
                  </p>
                </div>
              </div>

              <div className="settings-card-body">
                {canConfigureAlur ? (
                  <>
                    <button className="settings-btn primary block" onClick={openAlurConfig}>
                      Buka Konfigurasi <ChevronRight size={16} />
                    </button>
                    <div className="settings-access-hint">Akses: departemen PL, MS, NT.</div>
                  </>
                ) : (
                  <div className="settings-note muted" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Lock size={15} />
                    Fitur ini hanya tersedia untuk departemen PL, MS, dan NT.
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Disable TV Mode Confirmation */}
      {showDisableConfirm && (
        <div className="modal-overlay" style={{ zIndex: 1001 }}>
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <span className="modal-title">⚠️ Nonaktifkan TV Mode</span>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', lineHeight: 1.6 }}>
                Menonaktifkan TV Mode akan mengeluarkan Anda dan mengalihkan ke halaman login LMS.
              </p>
              <p style={{ marginBottom: '1.5rem', lineHeight: 1.6, color: '#6b7280' }}>
                Anda perlu login kembali dengan kredensial Anda untuk mengakses dashboard.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button className="settings-btn ghost" onClick={() => setShowDisableConfirm(false)}>Batal</button>
                <button className="settings-btn danger" onClick={confirmDisableTVMode}>Nonaktifkan & Keluar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsModal;
