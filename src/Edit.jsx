import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./App.css"; // gunakan CSS utama kamu

const ROLE_OPTIONS = ["Pembina", "Pelatih", "Ketua", "Wakil", "Sekretaris", "Siswa"];

export default function Edit() {
  const { name } = useParams();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(
  localStorage.getItem("isAdmin") === "true"
);
  const [newName, setNewName] = useState("");
  const [role, setRole] = useState("Siswa");
  const [roster, setRoster] = useState([]);
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    const admin = localStorage.getItem("attendance_is_admin") === "1";
    setIsAdmin(admin);

    const savedRoster = localStorage.getItem("roster_data");
    const savedEntries = localStorage.getItem("attendance_entries_v4");
    const rosterData = savedRoster ? JSON.parse(savedRoster) : [];
    const entriesData = savedEntries ? JSON.parse(savedEntries) : [];

    setRoster(rosterData);
    setEntries(entriesData);

    const person = rosterData.find((p) => p.name === name);
    if (person) {
      setNewName(person.name);
      setRole(person.role);
    }
  }, [name]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!isAdmin) {
      alert("Hanya admin yang bisa mengedit data!");
      return;
    }

    if (!newName.trim()) return alert("Nama tidak boleh kosong.");

    const updatedRoster = roster.map((p) =>
      p.name === name ? { name: newName, role } : p
    );
    const updatedEntries = entries.map((e) =>
      e.name === name ? { ...e, name: newName, role } : e
    );

    localStorage.setItem("roster_data", JSON.stringify(updatedRoster));
    localStorage.setItem("attendance_entries_v4", JSON.stringify(updatedEntries));

    alert("Data berhasil diperbarui!");
    navigate("/");
  }

  if (!isAdmin) {
    return (
      <div className="form-page">
        <h2>Akses Ditolak</h2>
        <p>Hanya admin yang dapat mengedit data.</p>
        <button onClick={() => navigate("/")}>Kembali</button>
      </div>
    );
  }

  return (
    <div className="form-page">
      <h2>Edit Data</h2>
      <form onSubmit={handleSubmit} className="form-container">
        <label>Nama Baru</label>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Masukkan nama baru"
          required
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
            Simpan Perubahan
          </button>
          <button type="button" onClick={() => navigate("/")}>
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}
