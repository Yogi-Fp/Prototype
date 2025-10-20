import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import Tambah from "./Tambah";
import Edit from "./Edit";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/tambah" element={<Tambah />} />
        <Route path="/edit/:name" element={<Edit />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
