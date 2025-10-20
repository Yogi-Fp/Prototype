import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import Tambah from "./Tambah";
import Edit from "./Edit";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/Tambah" element={<Tambah />} />
        <Route path="/Edit/:name" element={<Edit />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
