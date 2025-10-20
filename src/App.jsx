import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { jsPDF } from "jspdf";
import "./App.css";
import Tambah from './Tambah';
import Edit from './Edit';



// Replace ROSTER constant with INITIAL_ROSTER and add ROLE_OPTIONS
const INITIAL_ROSTER = [
  { name: "Budi", role: "Pembina" },
  { name: "Citra", role: "Pelatih" },
  { name: "Dewi", role: "Ketua" },
  { name: "Eka", role: "Wakil" },
  { name: "Fajar", role: "Sekretaris" },
  { name: "Ahmad", role: "Siswa" },
  { name: "Gita", role: "Siswa" },
  { name: "Hadi", role: "Siswa" },
  { name: "Intan", role: "Siswa" }
];

const ROLE_OPTIONS = ["Pembina", "Pelatih", "Ketua", "Wakil", "Sekretaris", "Siswa"];

const ATTENDANCE_STATUS = {
  PENDING: 'ALFA',
  PRESENT: 'HADIR',
  SICK: 'SAKIT',
  PERMIT: 'IZIN'
};
const ADMIN_PASSWORD = "admin123"; // Make sure this matches what you want to use

export default function App() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayStr);
  const [role, setRole] = useState("Siswa");
  const [selectedName, setSelectedName] = useState(INITIAL_ROSTER[0].name);
  const [entries, setEntries] = useState(() => {
    try {
      const raw = localStorage.getItem("attendance_entries_v4");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [view, setView] = useState("today");
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem("attendance_is_admin") === "1";
  });
  const [approvedForSign, setApprovedForSign] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('approved_for_sign')) || {};
    } catch {
      return {};
    }
  });
  const [rosterList, setRosterList] = useState(() => {
    try {
      const saved = localStorage.getItem("roster_data");
      return saved ? JSON.parse(saved) : INITIAL_ROSTER;
    } catch {
      return INITIAL_ROSTER;
    }
  });
  const signatureRef = useRef(null);

  useEffect(() => { localStorage.setItem("attendance_entries_v4", JSON.stringify(entries)); }, [entries]);
  useEffect(() => {
    if (isAdmin) localStorage.setItem("attendance_is_admin", "1");
    else localStorage.removeItem("attendance_is_admin");
  }, [isAdmin]);
  // Save approved signers to localStorage
  useEffect(() => {
    localStorage.setItem('approved_for_sign', JSON.stringify(approvedForSign));
  }, [approvedForSign]);
  useEffect(() => {
    localStorage.setItem("roster_data", JSON.stringify(rosterList));
  }, [rosterList]);

  // helper: find entry by name+date
  function findEntry(name, tanggal) {
    return entries.find(e => e.name === name && e.tanggal === tanggal) || null;
  }

  // Helper to check if user is approved for signing
  const canSign = (name, date) => {
    return approvedForSign[`${date}-${name}`] === true;
  };

  // Admin function to approve signing
  const approveForSigning = (name, date) => {
    if (!isAdmin) return;
    setApprovedForSign(prev => ({
      ...prev,
      [`${date}-${name}`]: true
    }));
  };

  // Admin function to set attendance status
  const setAttendanceStatus = (name, date, status) => {
    if (!isAdmin) {
      alert('Hanya admin yang dapat mengubah status kehadiran');
      return;
    }
    
    setEntries(prev => {
      const existingIdx = prev.findIndex(e => e.name === name && e.tanggal === date);
      const newEntry = {
        id: Date.now(),
        tanggal: date,
        name,
        status,
        role: 'Siswa',
        signature: null
      };

      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = { ...copy[existingIdx], status };
        return copy;
      }

      return [newEntry, ...prev];
    });
  };

  // add/update signature for selectedName on current date
  function addOrUpdateSignature(signatureDataUrl) {
    if (!selectedName) return alert("Pilih nama dari daftar.");

    // cari entri yang sudah ada untuk nama + tanggal
    const existingIdx = entries.findIndex(e => e.name === selectedName && e.tanggal === date);
    const existing = existingIdx >= 0 ? entries[existingIdx] : null;

    // hanya izinkan tanda tangan jika status sudah HADIR
    if (!existing || existing.status !== ATTENDANCE_STATUS.PRESENT) {
      return alert("Tanda tangan hanya diperbolehkan untuk yang berstatus HADIR. Minta admin ubah status terlebih dahulu.");
    }

    // update signature pada entri yang sudah ada
    setEntries(prev => {
      const copy = [...prev];
      copy[existingIdx] = { ...copy[existingIdx], signature: signatureDataUrl, status: ATTENDANCE_STATUS.PRESENT };
      return copy;
    });

    signatureRef.current?.clear?.();
  }

  // admin-only immediate delete
  function deleteEntry(id) {
    if (!isAdmin) return alert("Hanya admin yang bisa menghapus entri.");
    if (!confirm("Hapus entri ini?")) return;
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  // admin applies updates immediately; non-admin creates pending edit
  function updateEntry(targetName, targetDate, updates) {
    if (!isAdmin) {
      alert("Hanya admin yang dapat mengubah data.");
      return;
    }

    setEntries(prev => {
      const existing = prev.find(e => e.name === targetName && e.tanggal === targetDate);
      if (existing) {
        return prev.map(e => e.id === existing.id ? { ...e, ...updates } : e);
      } else {
        return [{ id: Date.now(), tanggal: targetDate, role: updates.role || "Siswa", name: updates.name || targetName, signature: updates.signature || null }, ...prev];
      }
    });
  }

  function downloadCSV() {
    if (!entries.length) return alert("Belum ada data untuk diekspor.");
    const header = ["id", "tanggal", "peran", "nama", "signature_dataurl"];
    const rows = entries.map((e) => [
      e.id,
      e.tanggal,
      e.role,
      `"${e.name.replace(/"/g, '""')}"`,
      e.signature ? `"${e.signature}"` : "",
    ]);
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `absensi_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPDF(entriesToExport, fileName) {
    if (!entriesToExport.length) return alert("Belum ada data untuk PDF.");
    
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text("Absensi Voli", doc.internal.pageSize.width/2, 15, { align: 'center' });
    
    // Table settings
    const startY = 30;
    const margin = 10;
    const pageWidth = doc.internal.pageSize.width;
    const cellPadding = 3;
    
    // Define columns
    const columns = ['No', 'Nama', 'Status', 'Tanggal', 'Tanda Tangan'];
    const colWidths = [10, 40, 25, 25, 50];
    
    // Draw table header
    doc.setFillColor(240, 240, 240);
    doc.setDrawColor(0);
    doc.setLineWidth(0.1);
    doc.rect(margin, startY, pageWidth - (margin * 2), 10, 'FD');
    
    doc.setFontSize(10);
    doc.setTextColor(0);
    
    let xPos = margin;
    columns.forEach((col, i) => {
      doc.text(col, xPos + cellPadding, startY + 7);
      xPos += colWidths[i];
    });
    
    // Draw table content
    let yPos = startY + 10;
    
    entriesToExport.forEach((entry, index) => {
      // Check if we need a new page
      if (yPos > 270) {
        doc.addPage();
        yPos = startY;
        
        // Redraw header on new page
        doc.rect(margin, startY, pageWidth - (margin * 2), 10, 'FD');
        xPos = margin;
        columns.forEach((col, i) => {
          doc.text(col, xPos + cellPadding, startY + 7);
          xPos += colWidths[i];
        });
        yPos = startY + 10;
      }
      
      // Draw row
      doc.setDrawColor(200);
      doc.rect(margin, yPos, pageWidth - (margin * 2), 20);
      
      // Fill row content
      xPos = margin;
      
      // No
      doc.text((index + 1).toString(), xPos + cellPadding, yPos + 7);
      xPos += colWidths[0];
      
      // Nama
      doc.text(entry.name, xPos + cellPadding, yPos + 7);
      xPos += colWidths[1];
      
      // Status
      doc.text(entry.status || 'ALFA', xPos + cellPadding, yPos + 7);
      xPos += colWidths[2];
      
      // Tanggal
      doc.text(entry.tanggal, xPos + cellPadding, yPos + 7);
      xPos += colWidths[3];
      
      // Tanda Tangan
      if (entry.signature) {
        doc.addImage(
          entry.signature, 
          'PNG', 
          xPos + cellPadding, 
          yPos + 2, 
          40, 
          16
        );
      } else {
        doc.text('(Tidak ada tanda tangan)', xPos + cellPadding, yPos + 7);
      }
      
      yPos += 20;
    });
    
    // Add footer with date
    doc.setFontSize(8);
    doc.text(
      `Dicetak pada: ${new Date().toLocaleString('id-ID')}`,
      pageWidth - margin,
      doc.internal.pageSize.height - 10,
      { align: 'right' }
    );
    
    doc.save(fileName);
  }

  // build view rows for a date: always show ROSTER names (prepopulated)
  function rowsForDate(tgl) {
    return INITIAL_ROSTER.map(person => {
      const e = entries.find(x => x.name === person.name && x.tanggal === tgl);
      return e ? { ...e } : { id: `${tgl}|${person.name}`, tanggal: tgl, role: "Siswa", name: person.name, signature: null };
    });
  }

  function handleNameInputChange(e) {
    const name = e.target.value;
    const person = rosterList.find(p => p.name === name);
    setSelectedName(name);
    if (person) {
      setRole(person.role);
    }
  }

  function handleAdminLogin() {
    const pass = window.prompt("Masukkan kata sandi admin:");
    if (pass === ADMIN_PASSWORD) {
      setIsAdmin(true);
      localStorage.setItem("attendance_is_admin", "1");
      window.alert("Login admin berhasil.");
    } else if (pass !== null) { // Only show error if user didn't cancel
      window.alert("Kata sandi salah.");
    }
  }

  function handleAdminLogout() {
    setIsAdmin(false);
    localStorage.removeItem("attendance_is_admin");
    window.alert("Logout admin berhasil.");
  }

  // Add roster management functions
  function handleAddPerson() {
    if (!isAdmin) return;
    const name = prompt("Masukkan nama:");
    if (!name) return;
    
    const role = prompt(`Masukkan peran (${ROLE_OPTIONS.join('/')}):`);
    if (!role || !ROLE_OPTIONS.includes(role)) return;
    
    setRosterList(prev => [...prev, { name, role }]);
  }

  // Update handleEditPerson function
  function handleEditPerson(oldName) {
    if (!isAdmin) return;

    const person = rosterList.find(p => p.name === oldName);
    if (!person) return;

    const name = prompt("Masukkan nama baru:", oldName);
    if (!name) return;

    const role = prompt(`Masukkan peran baru (${ROLE_OPTIONS.join('/')})`, person.role);
    if (!role || !ROLE_OPTIONS.includes(role)) return;

    // Update roster and all related entries
    setRosterList(prev => {
    const newRoster = prev.map(p => p.name === oldName ? { name, role } : p);
    localStorage.setItem("roster_data", JSON.stringify(newRoster));
    return newRoster;
  });

  // Update semua entri terkait
  setEntries(prev => prev.map(e => e.name === oldName ? { ...e, name, role } : e));
}

  function handleDeletePerson(name) {
  if (!isAdmin) return;
  if (!confirm(`Hapus ${name} dari daftar?`)) return;

  setRosterList(prev => {
    const newRoster = prev.filter(p => p.name !== name);
    localStorage.setItem("roster_data", JSON.stringify(newRoster));
    return newRoster;
  });

  setEntries(prev => prev.filter(e => e.name !== name));
}

  return (
    <div className="container">
      <h1>Absensi Voli</h1>

      <nav className="navbar">
  <button 
    type="button"
    onClick={() => setView("today")} 
    className={view === "today" ? "active" : ""}
  >
    Hari Ini
  </button>
  <button 
    type="button"
    onClick={() => setView("history")} 
    className={view === "history" ? "active" : ""}
  >
    History
  </button>

  <button 
    type="button"
    className="admin-button"
    onClick={isAdmin ? handleAdminLogout : handleAdminLogin}
    style={{
      marginLeft: "auto",
      background: isAdmin ? "#ef4444" : "var(--primary)",
      cursor: "pointer",
      zIndex: 100
    }}
  >
    {isAdmin ? "Logout Admin" : "Login Admin"}
  </button>
</nav>

      {view === "today" && (
        <>
          <div className="form">
            <div>
              <label>Tanggal</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div>
              <label>Peran</label>
              <select value={role} disabled>
                {ROLE_OPTIONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="name-input">
              <label>Nama</label>
              <select value={selectedName} onChange={handleNameInputChange}>
                {rosterList.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <SignatureInput ref={signatureRef} width={400} height={150} />

          <div className="buttons button-group">
            <button onClick={() => {
              const sig = signatureRef.current?.getDataUrl?.();
              addOrUpdateSignature(sig);
            }}>Simpan Absensi</button>

            <button onClick={() => { signatureRef.current?.clear?.(); }}>Ulangi Tanda Tangan</button>

            <button onClick={downloadCSV}>Export CSV</button>

            <button onClick={() => exportPDF(rowsForDate(date).filter(r => r.signature), `absensi_${date}.pdf`)}>Export PDF</button>

            {isAdmin ? (
              <button onClick={() => { if (!confirm("Hapus semua entri?")) return; setEntries([]); }} style={{ background: "#ef4444" }}>Hapus Semua</button>
            ) : null}
          </div>

          <AttendanceTable
            date={date}
            roster={rosterList}
            entries={entries}
            isAdmin={isAdmin}
            onDelete={deleteEntry}
            onUpdate={updateEntry}
            canSign={canSign}
            onApproveSign={approveForSigning}
            onSetStatus={setAttendanceStatus}
            attendanceStatus={ATTENDANCE_STATUS}
            onEditPerson={handleEditPerson}
            onDeletePerson={handleDeletePerson}
          />
        </>
      )}

      {view === "history" && (
        <>
          {Object.keys(entries.reduce((acc,e)=>{ acc[e.tanggal]=1; return acc; }, {})).concat(/* ensure current date present */[date]).filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=> b.localeCompare(a)).map((tgl) => (
            <div key={tgl} className="history-section" style={{ width: "100%", marginBottom: "2rem" }}>
              <h2>{tgl}</h2>
              <div style={{ display: "flex", gap: "1rem", marginBottom: "0.5rem" }}>
                <button className="pdf-btn" onClick={() => exportPDF(rowsForDate(tgl).filter(r=>r.signature), `absensi_${tgl}.pdf`)}>Export PDF</button>
                {isAdmin && <button onClick={() => {
                  if (!confirm(`Hapus semua entri pada ${tgl}?`)) return;
                  setEntries(prev => prev.filter(e => e.tanggal !== tgl));
                }} style={{ background: "#ef4444" }} className="admin-button">Hapus Tanggal</button>}
              </div>
              <AttendanceTable
                date={tgl}
                roster={rosterList}
                entries={entries}
                isAdmin={isAdmin}
                onDelete={deleteEntry}
                onUpdate={updateEntry}
                canSign={canSign}
                onApproveSign={approveForSigning}
                onSetStatus={setAttendanceStatus}
                attendanceStatus={ATTENDANCE_STATUS}
              />
            </div>
          ))}
          {entries.length === 0 && <p>Belum ada data history.</p>}
        </>
      )}

      {isAdmin && (
        <div style={{ marginBottom: "1rem" }} className="button-group">
          <button 
            onClick={() => window.location.href = "/tambah"}
            style={{ background: "green" }}
          >
            Tambah Orang Baru
          </button>
        </div>
      )}
    </div>
  );
}

function AttendanceTable({ 
  date, 
  roster, 
  entries, 
  isAdmin, 
  onDelete, 
  onUpdate,
  canSign,
  onApproveSign,
  onSetStatus,
  attendanceStatus,
  onEditPerson,
  onDeletePerson
}) {
  // Sort roster by role priority
  const sortedRoster = [...roster].sort((a, b) => {
    const priority = {
      "Pembina": 1,
      "Pelatih": 2,
      "Ketua": 3,
      "Wakil": 4,
      "Sekretaris": 5,
      "Siswa": 6
    };
    return (priority[a.role] || 99) - (priority[b.role] || 99);
  });

  const rows = sortedRoster.map(person => {
    const entry = entries.find(e => e.name === person.name && e.tanggal === date);
    return entry || {
      id: `${date}|${person.name}`,
      tanggal: date,
      role: person.role,
      name: person.name,
      signature: null,
      status: attendanceStatus.PENDING
    };
  });

  return (
    <table>
      <thead>
        <tr>
          <th>Nama</th>
          <th>Peran</th>
          <th>Status</th>
          <th>Tanggal</th>
          <th>Tanda Tangan</th>
          {isAdmin && <th>Aksi</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.id}>
            <td>{row.name}</td>
            <td>{row.role}</td>
            <td>
              {isAdmin ? (
                <select
                  value={row.status || attendanceStatus.PENDING}
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    if (newStatus !== attendanceStatus.PRESENT) {
                      onUpdate(row.name, row.tanggal, { 
                        status: newStatus, 
                        signature: null,
                        role: row.role // preserve existing role
                      });
                    } else {
                      onUpdate(row.name, row.tanggal, { 
                        status: newStatus,
                        role: row.role // preserve existing role
                      });
                    }
                  }}
                >
                  {Object.values(attendanceStatus).map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              ) : (
                <span className={`status-${(row.status || attendanceStatus.PENDING).toLowerCase()}`}>
                  {row.status || attendanceStatus.PENDING}
                </span>
              )}
            </td>
            <td>{row.tanggal}</td>
            <td className="signature-cell" style={{ minWidth: 160 }}>
              {row.status === attendanceStatus.PRESENT ? (
                row.signature ? (
                  <img 
                    src={row.signature} 
                    alt="ttd" 
                    width="140" 
                    style={{ borderRadius: 6, border: "1px solid var(--border)" }} 
                  />
                ) : (
                  <em>{canSign(row.name, row.tanggal) ? "Belum tanda tangan" : "Menunggu persetujuan admin"}</em>
                )
              ) : (
                <span className="center-dash">-</span>
              )}
            </td>

            {isAdmin && (
              <td>
                <div style={{ display: "flex", gap: 8 }}>
                  {row.status === attendanceStatus.PRESENT && !canSign(row.name, row.tanggal) && (
                    <button 
                      onClick={() => onApproveSign(row.name, row.tanggal)} 
                      style={{ background: "green" }}
                    >
                      Izinkan TTD
                    </button>
                  )}
                  <button 
                    onClick={() => window.location.href = `/edit/${encodeURIComponent(row.name)}`}
                    style={{ background: "#0ea5e9" }}
                    className=""
                  >
                    Edit Data
                  </button>
                  <button 
                    onClick={() => onDeletePerson(row.name)} 
                    style={{ background: "#ef4444" }}
                  >
                    Hapus
                  </button>
                </div>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const SignatureInput = forwardRef(function SignatureInput({ initialDataUrl = null, width = 400, height = 150 }, ref) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
    if (initialDataUrl) {
      const img = new Image();
      img.onload = () => { 
        ctx.clearRect(0, 0, canvas.width, canvas.height); 
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height); 
        setHasDrawn(true); 
      };
      img.src = initialDataUrl;
    }
  }, [initialDataUrl]);

  useImperativeHandle(ref, () => ({
    clear: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
    },
    getDataUrl: () => {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) return null;
      return canvas.toDataURL("image/png");
    }
  }));

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const client = e.touches ? e.touches[0] : e;
    return { 
      x: client.clientX - rect.left, 
      y: client.clientY - rect.top 
    };
  };

  const start = (e) => {
    setIsDrawing(true);
    setHasDrawn(true);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    const pos = getPos(e);
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const end = () => setIsDrawing(false);

  return (
    <div className="signature">
      <label className="signature-label">Tanda Tangan</label>
      <canvas 
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={start}
        onMouseMove={draw}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={draw}
        onTouchEnd={end}
        style={{ 
          border: "1px dashed var(--border)",
          borderRadius: 6 
        }}
      />
    </div>
  );
});
