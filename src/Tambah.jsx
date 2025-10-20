import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const ROLE_OPTIONS = [
  "Pembina",
  "Pelatih",
  "Ketua",
  "Wakil",
  "Sekretaris",
  "Siswa",
];

export default function Tambah() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("Siswa");
  const [roster, setRoster] = useState([]);

  useEffect(() => {
    const admin = localStorage.getItem("attendance_is_admin") === "1";
    setIsAdmin(admin);
    const saved = localStorage.getItem("roster_data");
    setRoster(saved ? JSON.parse(saved) : []);
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (!isAdmin) {
      alert("Hanya admin yang bisa menambah data!");
      return;
    }
    if (!name.trim()) return alert("Nama tidak boleh kosong.");
    const exists = roster.some(
      (p) => p.name.toLowerCase() === name.toLowerCase()
    );
    if (exists) return alert("Nama sudah ada di daftar.");

    const newPerson = { name, role };
    const updated = [...roster, newPerson];
    setRoster(updated);
    localStorage.setItem("roster_data", JSON.stringify(updated));
    alert("Data berhasil ditambahkan!");
    navigate("/");
  }

  if (!isAdmin) {
    return (
      <div className="form-page">
        <h2>Akses Ditolak</h2>
        <p>Hanya admin yang dapat menambah data.</p>
        <button onClick={() => navigate("/")}>Kembali</button>
      </div>
    );
  }

  return (
    <div className="form-page">
      <h2>Tambah Orang Baru</h2>
      <form onSubmit={handleSubmit} className="form-container">
        <label>Nama</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Masukkan nama"
        />

        <label>Peran</label>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <div className="form-buttons">
          <button type="submit" className="save-btn">
            Simpan
          </button>
          <button type="button" onClick={() => navigate("/")}>
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}
