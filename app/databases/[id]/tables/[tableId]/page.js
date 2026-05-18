"use client";

import { useState, useEffect, use, useRef, createContext, useContext } from "react";
import Link from "next/link";
import { EditIcon, TrashIcon } from "@/app/icons";

const LightboxContext = createContext({ open: () => {} });

function imageUrl(value) {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `/api/files/${value}`;
}

function Lightbox({ url, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 cursor-zoom-out"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-full cursor-default"
      />
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 text-white text-3xl bg-black/40 hover:bg-black/60 rounded-full w-11 h-11 flex items-center justify-center"
        aria-label="Cerrar"
      >
        ×
      </button>
      <a
        href={url}
        download
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white bg-black/40 hover:bg-black/60 rounded-full px-4 py-2 text-sm"
        title="Descargar"
      >
        ⬇ Descargar
      </a>
    </div>
  );
}

function ImageField({ value, onChange }) {
  const galleryRef = useRef(null);
  const filesRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const { open: openLightbox } = useContext(LightboxContext);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (file.size > 25 * 1024 * 1024) {
      setError("Máximo 25 MB");
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al subir");
        return;
      }
      onChange(data.filename);
    } catch {
      setError("Error de red");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const url = imageUrl(value);
  const isLocal = value && !value.startsWith("http");

  return (
    <div className="flex items-start gap-3">
      <div
        onClick={url ? () => openLightbox(url) : undefined}
        className={`w-[100px] h-[100px] border border-gray-300 rounded bg-gray-50 flex items-center justify-center overflow-hidden shrink-0 ${url ? "cursor-zoom-in" : ""}`}
        title={url ? "Click para ampliar" : ""}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs text-gray-400">sin imagen</span>
        )}
      </div>
      <div className="flex flex-col gap-2 items-start">
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          disabled={uploading}
          className="hidden"
        />
        <input
          ref={filesRef}
          type="file"
          onChange={handleFile}
          disabled={uploading}
          className="hidden"
        />
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            disabled={uploading}
            className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50"
            title="Elegir desde galería de fotos"
          >
            🖼️ Galería
          </button>
          <button
            type="button"
            onClick={() => filesRef.current?.click()}
            disabled={uploading}
            className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1.5 rounded disabled:opacity-50"
            title="Explorador de archivos (incluye cámara y capturas)"
          >
            📁 Archivos
          </button>
        </div>
        {uploading && <span className="text-xs text-gray-500">Subiendo…</span>}
        {value && !uploading && (
          <div className="flex gap-2">
            {isLocal && (
              <a
                href={url}
                download={value}
                className="text-xs bg-green-100 hover:bg-green-200 text-green-800 border border-green-300 rounded px-2 py-1"
                title="Descargar imagen"
              >
                ⬇ Descargar
              </a>
            )}
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-xs text-red-600 hover:underline"
            >
              Quitar
            </button>
          </div>
        )}
        {error && <span className="text-xs text-red-600">{error}</span>}
        <span className="text-xs text-gray-400">
          Se reduce automáticamente para que pese ≤ 2 MB
        </span>
      </div>
    </div>
  );
}

export default function TablePage({ params }) {
  const { id, tableId } = use(params);
  const [table, setTable] = useState(null);
  const [allFields, setAllFields] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formValues, setFormValues] = useState({});
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [linkedTables, setLinkedTables] = useState({});

  // Derived: fields visible as columns in main grid (excludes detalle), and detalle-only fields
  const fields = allFields.filter((f) => f.type !== "detalle");
  const detalleFields = allFields.filter((f) => f.type === "detalle");

  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState("");
  const [groupMode, setGroupMode] = useState("day");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortField, setSortField] = useState("");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  // { [aggregationFieldId]: { [parentRecordId]: number } }
  const [aggregations, setAggregations] = useState({});

  useEffect(() => {
    fetchData();
  }, [tableId]);

  useEffect(() => {
    setPage(1);
    setSelectedRecordId(null);
  }, [search, groupBy, groupMode, dateFrom, dateTo, pageSize]);

  useEffect(() => {
    setDateFrom("");
    setDateTo("");
  }, [groupBy]);

  async function fetchData() {
    const [tableRes, recordsRes] = await Promise.all([
      fetch(`/api/tables/${tableId}`),
      fetch(`/api/records?table_id=${tableId}`),
    ]);
    const tableData = await tableRes.json();
    const recordsData = await recordsRes.json();

    setTable(tableData);
    setAllFields(tableData.fields || []);
    setRecords(recordsData.records || []);
    setLoading(false);

    const linkFields = (tableData.fields || []).filter((f) => f.type === "link" && f.options);
    for (const field of linkFields) {
      const linkedTableId = JSON.parse(field.options);
      const res = await fetch(`/api/records?table_id=${linkedTableId}`);
      const data = await res.json();
      setLinkedTables((prev) => ({
        ...prev,
        [field.id]: { fields: data.fields || [], records: data.records || [] },
      }));
    }

    await loadAggregations(tableData.fields || []);
  }

  async function loadAggregations(fieldsList) {
    const aggFields = fieldsList.filter((f) => f.type === "agregacion" && f.options);
    if (aggFields.length === 0) return;

    const next = {};
    for (const f of aggFields) {
      let cfg;
      try { cfg = JSON.parse(f.options); } catch { continue; }
      const detField = fieldsList.find((x) => x.id === cfg.detail_field_id);
      if (!detField || !detField.options) continue;
      let detCfg;
      try { detCfg = JSON.parse(detField.options); } catch { continue; }
      const childTableId = parseInt(detCfg.table_id);
      const linkFieldId = parseInt(detCfg.link_field_id);
      if (!childTableId || !linkFieldId) continue;

      const res = await fetch(`/api/records?table_id=${childTableId}`);
      if (!res.ok) continue;
      const data = await res.json();
      const childFields = data.fields || [];
      const targetField = childFields.find((x) => x.id === cfg.target_field_id);

      const evalChildExpr = (expr, item) => {
        if (!expr) return NaN;
        const numFor = (fld) => {
          if (fld.type === "boolean") {
            const raw = item.values?.[fld.id];
            return raw === "1" || raw === 1 ? 1 : 0;
          }
          if (fld.type === "formula") {
            try {
              const c = JSON.parse(fld.options || "{}");
              return evalChildExpr(c.expr, item);
            } catch { return NaN; }
          }
          return parseFloat(item.values?.[fld.id]);
        };
        let body = expr.replace(/\[([^\]]+)\]/g, (_, name) => {
          const fld = childFields.find((x) => x.name === name);
          if (!fld) return "0";
          const v = numFor(fld);
          return Number.isFinite(v) ? String(v) : "0";
        });
        if (!/^[\d\s+\-*/().]+$/.test(body)) return NaN;
        try {
          // eslint-disable-next-line no-new-func
          const r = Function(`return (${body})`)();
          return Number.isFinite(r) ? r : NaN;
        } catch { return NaN; }
      };

      const numericValueFor = (item) => {
        if (!targetField) return parseFloat(item.values?.[cfg.target_field_id]);
        if (targetField.type === "formula") {
          try {
            const c = JSON.parse(targetField.options || "{}");
            return evalChildExpr(c.expr, item);
          } catch { return NaN; }
        }
        if (targetField.type === "boolean") {
          const raw = item.values?.[targetField.id];
          return raw === "1" || raw === 1 ? 1 : 0;
        }
        return parseFloat(item.values?.[targetField.id]);
      };

      const byParent = {};
      for (const cr of data.records || []) {
        const pid = cr.values?.[linkFieldId];
        if (pid === null || pid === undefined || pid === "") continue;
        const k = String(parseInt(pid));
        if (!byParent[k]) byParent[k] = [];
        byParent[k].push(cr);
      }

      const perParent = {};
      for (const [pid, kids] of Object.entries(byParent)) {
        if (cfg.operation === "COUNT") {
          perParent[pid] = kids.length;
          continue;
        }
        const nums = kids.map(numericValueFor).filter((n) => Number.isFinite(n));
        if (nums.length === 0) { perParent[pid] = 0; continue; }
        if (cfg.operation === "SUM") perParent[pid] = nums.reduce((a, b) => a + b, 0);
        else if (cfg.operation === "AVG") perParent[pid] = nums.reduce((a, b) => a + b, 0) / nums.length;
        else if (cfg.operation === "MIN") perParent[pid] = Math.min(...nums);
        else if (cfg.operation === "MAX") perParent[pid] = Math.max(...nums);
      }
      next[f.id] = perParent;
    }
    setAggregations(next);
  }

  function linkedLabel(fieldId, recordId) {
    const linked = linkedTables[fieldId];
    if (!linked) return `#${recordId}`;
    const record = linked.records.find((r) => String(r.id) === String(recordId));
    if (!record) return `#${recordId}`;
    const parts = linked.fields
      .slice(0, 2)
      .map((f) => record.values?.[f.id])
      .filter((v) => v !== undefined && v !== null && v !== "");
    return parts.length > 0 ? parts.join(" | ") : `#${recordId}`;
  }

  function openNewForm() {
    setFormValues({});
    setEditingRecordId(null);
    setShowForm(true);
  }

  function openEditForm(record) {
    setFormValues(record.values || {});
    setEditingRecordId(record.id);
    setShowForm(true);
  }

  async function saveRecord(e) {
    e.preventDefault();
    // No enviar campos calculados (formula/agregacion) ni detalle
    const computedTypes = new Set(["formula", "agregacion", "detalle"]);
    const cleanValues = {};
    for (const [fid, v] of Object.entries(formValues)) {
      const f = allFields.find((x) => String(x.id) === String(fid));
      if (!f || computedTypes.has(f.type)) continue;
      cleanValues[fid] = v;
    }
    if (editingRecordId) {
      await fetch(`/api/records/${editingRecordId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: cleanValues }),
      });
      setShowForm(false);
      setEditingRecordId(null);
      setFormValues({});
      fetchData();
    } else {
      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_id: parseInt(tableId), values: cleanValues }),
      });
      const created = await res.json();
      await fetchData();
      if (detalleFields.length > 0 && created && created.id) {
        setEditingRecordId(created.id);
        setShowForm(true);
      } else {
        setShowForm(false);
        setEditingRecordId(null);
        setFormValues({});
      }
    }
  }

  async function deleteRecord(recordId) {
    if (!confirm("¿Eliminar este registro?")) return;
    await fetch(`/api/records/${recordId}`, { method: "DELETE" });
    fetchData();
  }

  function getDecimals(field) {
    if (!field.options) return 2;
    try {
      const parsed = JSON.parse(field.options);
      const n = parseInt(parsed?.decimals, 10);
      return Number.isFinite(n) && n >= 0 ? n : 2;
    } catch {
      return 2;
    }
  }

  function evalFormula(expr, record) {
    if (!expr) return null;
    // Reemplaza [nombre_campo] por valor numerico del record
    let body = expr.replace(/\[([^\]]+)\]/g, (_, name) => {
      const f = fields.find((x) => x.name === name);
      if (!f) return "0";
      // Permitimos referenciar otros formula/agregacion/boolean
      const v = cellNumericValue(f, record);
      return Number.isFinite(v) ? String(v) : "0";
    });
    if (!/^[\d\s+\-*/().]+$/.test(body)) return null;
    try {
      // eslint-disable-next-line no-new-func
      const result = Function(`return (${body})`)();
      return Number.isFinite(result) ? result : null;
    } catch {
      return null;
    }
  }

  function cellNumericValue(field, record) {
    if (field.type === "boolean") {
      const raw = record.values?.[field.id];
      return raw === "1" || raw === 1 ? 1 : 0;
    }
    if (field.type === "formula") {
      try {
        const cfg = JSON.parse(field.options || "{}");
        const r = evalFormula(cfg.expr, record);
        return r ?? NaN;
      } catch { return NaN; }
    }
    if (field.type === "agregacion") {
      return Number(aggregations[field.id]?.[String(record.id)] ?? NaN);
    }
    const v = record.values?.[field.id];
    return parseFloat(v);
  }

  function aggregationDecimals(field) {
    try {
      const cfg = JSON.parse(field.options || "{}");
      const n = parseInt(cfg.decimals, 10);
      return Number.isFinite(n) && n >= 0 ? n : 2;
    } catch { return 2; }
  }

  function formatDecimal(value, decimals) {
    const n = parseFloat(value);
    if (!Number.isFinite(n)) return "-";
    return n.toLocaleString("es-PE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function getDisplayValue(field, value, record) {
    if (field.type === "boolean") {
      return value === "1" || value === 1 ? "✓" : "—";
    }
    if (field.type === "formula") {
      const cfg = (() => { try { return JSON.parse(field.options || "{}"); } catch { return {}; } })();
      const result = record ? evalFormula(cfg.expr, record) : null;
      if (result === null || !Number.isFinite(result)) return "-";
      return formatDecimal(result, cfg.decimals ?? 2);
    }
    if (field.type === "agregacion") {
      const v = record ? aggregations[field.id]?.[String(record.id)] : null;
      if (v === null || v === undefined || !Number.isFinite(Number(v))) return "0";
      return formatDecimal(v, aggregationDecimals(field));
    }
    if (field.type === "decimal") {
      if (value === null || value === undefined || value === "") return "-";
      return formatDecimal(value, getDecimals(field));
    }
    if (!value) return "-";
    if (field.type === "link") {
      return linkedLabel(field.id, value);
    }
    if (field.type === "image") {
      const url = imageUrl(value);
      if (!url) return "-";
      // eslint-disable-next-line @next/next/no-img-element
      return (
        <img
          src={url}
          alt=""
          onClick={(e) => { e.stopPropagation(); setLightboxUrl(url); }}
          className="w-12 h-12 object-cover rounded border border-gray-200 cursor-zoom-in"
          title="Click para ampliar"
        />
      );
    }
    return value;
  }

  function columnWidth(field) {
    if (Number.isFinite(field.width) && field.width > 0) return `${field.width}px`;
    switch (field.type) {
      case "date":
      case "number":
      case "decimal":
      case "formula":
      case "agregacion":
        return "100px";
      case "boolean":
        return "70px";
      case "text":
      case "memo":
        return "300px";
      case "dropdown":
        return "180px";
      case "image":
      case "link":
        return "200px";
      default:
        return "150px";
    }
  }

  function exportValue(field, value, record) {
    if (field.type === "boolean") return value === "1" || value === 1 ? "Sí" : "No";
    if (field.type === "formula" && record) {
      const cfg = (() => { try { return JSON.parse(field.options || "{}"); } catch { return {}; } })();
      const r = evalFormula(cfg.expr, record);
      return r === null || !Number.isFinite(r) ? "" : String(r);
    }
    if (field.type === "agregacion" && record) {
      const v = aggregations[field.id]?.[String(record.id)];
      return v === null || v === undefined ? "0" : String(v);
    }
    if (value === null || value === undefined || value === "") return "";
    if (field.type === "link") return linkedLabel(field.id, value);
    if (field.type === "decimal" || field.type === "number") {
      const n = parseFloat(value);
      return Number.isFinite(n) ? String(n) : "";
    }
    return String(value);
  }

  function csvCell(value) {
    const s = value == null ? "" : String(value);
    if (s.includes(";") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  function exportCSV() {
    const rows = filteredRecords();
    const headers = fields.map((f) => csvCell(f.name));
    const data = rows.map((r) =>
      fields.map((f) => csvCell(exportValue(f, r.values?.[f.id], r))).join(";")
    );
    const csv = "﻿" + [headers.join(";"), ...data].join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    const safeName = (table?.name || "tabla").replace(/[^a-z0-9_-]/gi, "_");
    a.href = url;
    a.download = `${safeName}_${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function isNumericColumn(f) {
    return f.type === "decimal" || f.type === "formula" || f.type === "agregacion";
  }

  function decimalSums(rows = records) {
    const sums = {};
    fields.forEach((f) => {
      if (!isNumericColumn(f)) return;
      let sum = 0;
      rows.forEach((r) => {
        const n = cellNumericValue(f, r);
        if (Number.isFinite(n)) sum += n;
      });
      sums[f.id] = sum;
    });
    return sums;
  }

  function numericDecimals(field) {
    if (field.type === "decimal") return getDecimals(field);
    if (field.type === "formula") {
      try { return JSON.parse(field.options || "{}").decimals ?? 2; } catch { return 2; }
    }
    if (field.type === "agregacion") return aggregationDecimals(field);
    return 2;
  }

  function searchableText(field, record) {
    if (field.type === "boolean") {
      const raw = record.values?.[field.id];
      return raw === "1" || raw === 1 ? "si yes" : "no";
    }
    if (field.type === "formula") {
      const cfg = (() => { try { return JSON.parse(field.options || "{}"); } catch { return {}; } })();
      const r = evalFormula(cfg.expr, record);
      return r === null ? "" : String(r);
    }
    if (field.type === "agregacion") {
      const v = aggregations[field.id]?.[String(record.id)];
      return v === null || v === undefined ? "" : String(v);
    }
    const raw = record.values?.[field.id];
    if (raw === null || raw === undefined || raw === "") return "";
    if (field.type === "link") return linkedLabel(field.id, raw);
    if (field.type === "image") return "";
    if (field.type === "decimal") return formatDecimal(raw, getDecimals(field));
    return String(raw);
  }

  function filteredRecords() {
    const q = search.trim().toLowerCase();
    const groupField = fields.find((f) => String(f.id) === String(groupBy));
    const useRange = groupField && groupField.type === "date" && (dateFrom || dateTo);

    const filtered = records.filter((r) => {
      if (q && !fields.some((f) => searchableText(f, r).toLowerCase().includes(q))) {
        return false;
      }
      if (useRange) {
        const raw = r.values?.[groupField.id];
        const d = typeof raw === "string" ? raw.slice(0, 10) : "";
        if (!d) return false;
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;
      }
      return true;
    });

    const sf = fields.find((f) => String(f.id) === String(sortField));
    if (sf) {
      const sign = sortDir === "desc" ? -1 : 1;
      filtered.sort((a, b) => sign * compareForSort(sf, a, b));
    }
    return filtered;
  }

  function compareForSort(field, a, b) {
    // Tipos calculados/boolean: compara numericamente con cellNumericValue
    if (field.type === "boolean" || field.type === "formula" || field.type === "agregacion") {
      const na = cellNumericValue(field, a);
      const nb = cellNumericValue(field, b);
      const aE = !Number.isFinite(na);
      const bE = !Number.isFinite(nb);
      if (aE && bE) return 0;
      if (aE) return 1;
      if (bE) return -1;
      return na - nb;
    }

    const va = a.values?.[field.id];
    const vb = b.values?.[field.id];
    const ae = va === undefined || va === null || va === "";
    const be = vb === undefined || vb === null || vb === "";
    if (ae && be) return 0;
    if (ae) return 1;
    if (be) return -1;

    if (field.type === "number" || field.type === "decimal") {
      const na = parseFloat(va);
      const nb = parseFloat(vb);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    }
    const sa = field.type === "link" ? linkedLabel(field.id, va) : String(va);
    const sb = field.type === "link" ? linkedLabel(field.id, vb) : String(vb);
    return sa.localeCompare(sb, "es", { numeric: true, sensitivity: "base" });
  }

  function toggleSort(fieldId) {
    if (String(sortField) !== String(fieldId)) {
      setSortField(fieldId);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortField("");
      setSortDir("asc");
    }
  }

  function groupKey(record, field) {
    const raw = record.values?.[field.id];
    if (raw === null || raw === undefined || raw === "") return "(vacío)";
    if (field.type === "date" && typeof raw === "string") {
      if (groupMode === "year") return raw.slice(0, 4);
      if (groupMode === "month") return raw.slice(0, 7);
      return raw.slice(0, 10);
    }
    if (field.type === "link") return linkedLabel(field.id, raw);
    return String(raw);
  }

  function buildGroups(rows) {
    const groupField = fields.find((f) => String(f.id) === String(groupBy));
    if (!groupField) return null;
    const map = new Map();
    rows.forEach((r) => {
      const k = groupKey(r, groupField);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    });
    const groups = Array.from(map.entries()).map(([key, rs]) => ({
      key,
      records: rs,
      sums: decimalSums(rs),
    }));
    groups.sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));
    return groups;
  }

  if (loading) return <p className="text-gray-500">Cargando...</p>;
  if (!table) return <p className="text-red-500">Tabla no encontrada.</p>;

  return (
    <LightboxContext.Provider value={{ open: setLightboxUrl }}>
    <div>
      {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
      <div className="mb-6">
        <Link href={`/databases/${id}`} className="text-blue-600 hover:underline text-sm">
          &larr; Volver a tablas
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold truncate">{table.name}</h1>
        <div className="flex gap-2 items-center">
          {selectedRecordId && (() => {
            const sel = records.find((r) => r.id === selectedRecordId);
            if (!sel) return null;
            return (
              <>
                <button
                  type="button"
                  onClick={() => openEditForm(sel)}
                  className="flex items-center gap-1 bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200 px-3 py-2 rounded-lg"
                  title="Editar fila seleccionada"
                  aria-label="Editar"
                >
                  <EditIcon /><span className="hidden sm:inline text-sm">Editar</span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteRecord(sel.id)}
                  className="flex items-center gap-1 bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 px-3 py-2 rounded-lg"
                  title="Eliminar fila seleccionada"
                  aria-label="Eliminar"
                >
                  <TrashIcon /><span className="hidden sm:inline text-sm">Eliminar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRecordId(null)}
                  className="text-gray-500 hover:text-gray-700 px-2 py-2 text-sm"
                  title="Quitar selección"
                >
                  ×
                </button>
                <span className="w-px h-6 bg-gray-300 mx-1" />
              </>
            );
          })()}
          <button
            type="button"
            onClick={exportCSV}
            disabled={records.length === 0}
            className="bg-green-700 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
            title="Exportar a Excel (CSV)"
            aria-label="Exportar"
          >
            📥<span className="hidden sm:inline sm:ml-1">Exportar</span>
          </button>
          <button
            onClick={openNewForm}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Nuevo Registro
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-8">
          <form
            onSubmit={saveRecord}
            className="border border-gray-200 rounded-lg p-6 bg-gray-50"
          >
            <h2 className="font-semibold mb-4">
              {editingRecordId ? "Editar Registro" : "Nuevo Registro"}
            </h2>
            {fields.map((field) => (
              <div key={field.id} className="mb-3">
                <label className="block text-sm font-medium mb-1">{field.name}</label>
                {renderFieldInput(field, formValues[field.id] || "", (val) =>
                  setFormValues({ ...formValues, [field.id]: val })
                )}
              </div>
            ))}
            <div className="flex gap-3 mt-4">
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
              >
                {editingRecordId ? "Guardar" : "Crear"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingRecordId(null);
                }}
                className="text-gray-500 hover:text-gray-700 px-4 py-2"
              >
                Cancelar
              </button>
            </div>
          </form>

          {detalleFields.length > 0 && (
            <div className="mt-4 border border-gray-200 rounded-lg p-6 bg-gray-50 space-y-6">
              {detalleFields.map((df) => (
                <DetalleSubgrid
                  key={df.id}
                  detalleField={df}
                  parentId={editingRecordId}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {!showForm && (
        records.length === 0 ? (
          <p className="text-gray-500 text-center py-12">
            No hay registros. Crea uno para empezar.
          </p>
        ) : (
          renderGrid()
        )
      )}
    </div>
    </LightboxContext.Provider>
  );

  function renderGrid() {
    const filtered = filteredRecords();
    const groupField = fields.find((f) => String(f.id) === String(groupBy));
    const groups = groupField ? buildGroups(filtered) : null;
    const totalUnits = groups ? groups.length : filtered.length;
    const pageCount = Math.max(1, Math.ceil(totalUnits / pageSize));
    const currentPage = Math.min(page, pageCount);
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pagedGroups = groups ? groups.slice(start, end) : null;
    const pagedRecords = groups ? null : filtered.slice(start, end);
    const grandSums = decimalSums(filtered);
    const hasDecimals = fields.some((f) => isNumericColumn(f));
    const colCount = fields.length + 1;

    return (
      <>
        <div className="flex flex-wrap gap-3 items-center mb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Buscar..."
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
          />

          <label className="text-sm text-gray-600 flex items-center gap-2">
            Agrupar por:
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Ninguno</option>
              {fields
                .filter((f) => f.type !== "image" && f.type !== "memo")
                .map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
            </select>
          </label>

          {groupField && groupField.type === "date" && (
            <>
              <label className="text-sm text-gray-600 flex items-center gap-2">
                Por:
                <select
                  value={groupMode}
                  onChange={(e) => setGroupMode(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="day">Día</option>
                  <option value="month">Mes</option>
                  <option value="year">Año</option>
                </select>
              </label>
              <label className="text-sm text-gray-600 flex items-center gap-1">
                Del:
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="text-sm text-gray-600 flex items-center gap-1">
                Al:
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={() => { setDateFrom(""); setDateTo(""); }}
                  className="text-xs text-blue-600 hover:underline"
                  title="Limpiar rango"
                >
                  limpiar
                </button>
              )}
            </>
          )}

          <label className="text-sm text-gray-600 flex items-center gap-2 ml-auto">
            Por página:
            <select
              value={pageSize}
              onChange={(e) => setPageSize(parseInt(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded">
          <table className="border-collapse text-sm" style={{ tableLayout: "fixed", width: "max-content", minWidth: "100%" }}>
            <colgroup>
              <col style={{ width: "40px" }} />
              {fields.map((f) => (
                <col key={f.id} style={{ width: columnWidth(f) }} />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-200 px-3 py-2 text-left">#</th>
                {fields.map((field) => {
                  const active = String(sortField) === String(field.id);
                  const arrow = active ? (sortDir === "asc" ? " ▲" : " ▼") : "";
                  return (
                    <th
                      key={field.id}
                      onClick={() => toggleSort(field.id)}
                      className={`border border-gray-200 px-3 py-2 text-left break-words cursor-pointer select-none hover:bg-gray-200 ${active ? "text-blue-700" : ""}`}
                      title="Click para ordenar"
                    >
                      {field.name}<span className="text-xs">{arrow}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {groups
                ? renderGroupedRows(pagedGroups, groupField)
                : pagedRecords.map((record, i) => renderRow(record, start + i + 1))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="border border-gray-200 px-3 py-6 text-center text-gray-400">
                    Sin resultados para "{search}"
                  </td>
                </tr>
              )}
            </tbody>
            {hasDecimals && filtered.length > 0 && (
              <tfoot>
                <tr className="bg-blue-100 font-bold">
                  <td className="border border-gray-200 px-3 py-2">Σ</td>
                  {fields.map((field) => (
                    <td
                      key={field.id}
                      className={`border border-gray-200 px-3 py-2 ${isNumericColumn(field) ? "text-right font-mono text-blue-800" : ""}`}
                    >
                      {isNumericColumn(field) ? formatDecimal(grandSums[field.id], numericDecimals(field)) : ""}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mt-3 text-sm">
          <div className="text-gray-600">
            {groups ? (
              <>Mostrando {Math.min(start + 1, totalUnits)}-{Math.min(end, totalUnits)} de {totalUnits} grupos ({filtered.length} registros)</>
            ) : (
              <>Mostrando {Math.min(start + 1, totalUnits)}-{Math.min(end, totalUnits)} de {totalUnits} registros</>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50"
            >
              ◄ Anterior
            </button>
            <span className="text-gray-600">Página {currentPage} de {pageCount}</span>
            <button
              onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
              disabled={currentPage >= pageCount}
              className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50"
            >
              Siguiente ►
            </button>
          </div>
        </div>
      </>
    );
  }

  function renderRow(record, num) {
    const selected = selectedRecordId === record.id;
    return (
      <tr
        key={record.id}
        onClick={() => setSelectedRecordId((cur) => (cur === record.id ? null : record.id))}
        className={`cursor-pointer ${selected ? "bg-blue-100 hover:bg-blue-100" : "hover:bg-gray-50"}`}
      >
        <td className={`border border-gray-200 px-3 py-2 ${selected ? "text-blue-700 font-semibold" : "text-gray-500"}`}>{num}</td>
        {fields.map((field) => {
          const alignRight = isNumericColumn(field) || field.type === "number";
          const isMemo = field.type === "memo";
          return (
            <td
              key={field.id}
              className={`border border-gray-200 px-3 py-2 align-top break-words ${alignRight ? "text-right font-mono" : ""} ${isMemo ? "whitespace-pre-wrap" : "whitespace-normal"}`}
            >
              {getDisplayValue(field, record.values[field.id], record)}
            </td>
          );
        })}
      </tr>
    );
  }

  function renderGroupedRows(groups, groupField) {
    const colCount = fields.length + 1;
    const rows = [];
    let n = 0;
    for (const g of groups) {
      rows.push(
        <tr key={`gh-${g.key}`} className="bg-amber-50">
          <td colSpan={colCount} className="border border-gray-200 px-3 py-2 font-semibold text-amber-900 sticky left-0">
            {groupField.name}: {g.key} <span className="text-amber-700 font-normal">({g.records.length} {g.records.length === 1 ? "registro" : "registros"})</span>
          </td>
        </tr>
      );
      for (const r of g.records) {
        n += 1;
        rows.push(renderRow(r, n));
      }
      if (fields.some((f) => f.type === "decimal")) {
        rows.push(
          <tr key={`gs-${g.key}`} className="bg-amber-50/60 font-semibold">
            <td className="border border-gray-200 px-3 py-2 text-amber-700">Σ</td>
            {fields.map((field) => (
              <td
                key={field.id}
                className={`border border-gray-200 px-3 py-2 ${isNumericColumn(field) ? "text-right font-mono text-amber-800" : ""}`}
              >
                {isNumericColumn(field) ? formatDecimal(g.sums[field.id], numericDecimals(field)) : ""}
              </td>
            ))}
          </tr>
        );
      }
    }
    return rows;
  }

  function renderFieldInput(field, value, onChange) {
    const inputClass =
      "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

    switch (field.type) {
      case "boolean":
        return (
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value === "1" || value === 1 || value === true}
              onChange={(e) => onChange(e.target.checked ? "1" : "0")}
              className="w-5 h-5 accent-blue-600"
            />
            <span className="text-sm text-gray-600">Sí</span>
          </label>
        );
      case "formula": {
        const cfg = (() => { try { return JSON.parse(field.options || "{}"); } catch { return {}; } })();
        const result = evalFormula(cfg.expr, { id: editingRecordId, values: formValues });
        const display = result === null || !Number.isFinite(result) ? "—" : formatDecimal(result, cfg.decimals ?? 2);
        return (
          <div className="bg-gray-100 border border-gray-300 rounded px-3 py-2 text-sm font-mono text-right text-gray-700">
            {display}
            <span className="text-xs text-gray-400 ml-2 font-sans">(calculado)</span>
          </div>
        );
      }
      case "agregacion": {
        const v = editingRecordId ? aggregations[field.id]?.[String(editingRecordId)] : null;
        const display = v === null || v === undefined ? (editingRecordId ? "0" : "—")
          : formatDecimal(v, aggregationDecimals(field));
        return (
          <div className="bg-gray-100 border border-gray-300 rounded px-3 py-2 text-sm font-mono text-right text-gray-700">
            {display}
            <span className="text-xs text-gray-400 ml-2 font-sans">(calculado)</span>
          </div>
        );
      }
      case "text":
        return (
          <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
        );
      case "memo":
        return (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className={inputClass}
          />
        );
      case "decimal": {
        const decimals = getDecimals(field);
        const step = decimals > 0 ? "0." + "0".repeat(decimals - 1) + "1" : "1";
        return (
          <input
            type="number"
            step={step}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass + " text-right font-mono"}
          />
        );
      }
      case "number":
        return (
          <input
            type="number"
            step="any"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
          />
        );
      case "date":
        return (
          <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
        );
      case "dropdown": {
        const options = field.options ? JSON.parse(field.options) : [];
        return (
          <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
            <option value="">Seleccionar...</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      }
      case "image":
        return <ImageField value={value} onChange={onChange} />;
      case "link": {
        const linked = linkedTables[field.id]?.records || [];
        return (
          <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
            <option value="">Seleccionar registro...</option>
            {linked.map((r) => (
              <option key={r.id} value={r.id}>
                {linkedLabel(field.id, r.id)}
              </option>
            ))}
          </select>
        );
      }
      default:
        return (
          <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
        );
    }
  }
}

function DetalleSubgrid({ detalleField, parentId }) {
  const { open: openLightbox } = useContext(LightboxContext);
  const cfg = (() => {
    try { return JSON.parse(detalleField.options || "{}"); } catch { return {}; }
  })();
  const childTableId = cfg.table_id ? parseInt(cfg.table_id) : null;
  const linkFieldId = cfg.link_field_id ? parseInt(cfg.link_field_id) : null;

  const [childFields, setChildFields] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linkedTables, setLinkedTables] = useState({});
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemValues, setItemValues] = useState({});
  const [editingItemId, setEditingItemId] = useState(null);

  useEffect(() => {
    if (!parentId || !childTableId) {
      setLoading(false);
      return;
    }
    loadAll();
  }, [parentId, childTableId]);

  async function loadAll() {
    setLoading(true);
    const [tableRes, recordsRes] = await Promise.all([
      fetch(`/api/tables/${childTableId}`),
      fetch(`/api/records?table_id=${childTableId}`),
    ]);
    const tableData = await tableRes.json();
    const recordsData = await recordsRes.json();
    const allChildFields = tableData.fields || [];
    setChildFields(allChildFields);

    const filtered = (recordsData.records || []).filter((r) => {
      const v = r.values?.[linkFieldId];
      if (v === null || v === undefined || v === "") return false;
      return Number(v) === Number(parentId);
    });
    setItems(filtered);

    const linkFs = allChildFields.filter((f) => f.type === "link" && f.options && f.id !== linkFieldId);
    for (const lf of linkFs) {
      const lid = JSON.parse(lf.options);
      const lr = await fetch(`/api/records?table_id=${lid}`);
      const ld = await lr.json();
      setLinkedTables((prev) => ({ ...prev, [lf.id]: { fields: ld.fields || [], records: ld.records || [] } }));
    }
    setLoading(false);
  }

  function linkedLabel(fieldId, recordId) {
    const linked = linkedTables[fieldId];
    if (!linked) return `#${recordId}`;
    const record = linked.records.find((r) => String(r.id) === String(recordId));
    if (!record) return `#${recordId}`;
    const parts = linked.fields.slice(0, 2)
      .map((f) => record.values?.[f.id])
      .filter((v) => v !== undefined && v !== null && v !== "");
    return parts.length > 0 ? parts.join(" | ") : `#${recordId}`;
  }

  function getDecimals(field) {
    if (!field.options) return 2;
    try {
      const parsed = JSON.parse(field.options);
      const n = parseInt(parsed?.decimals, 10);
      return Number.isFinite(n) && n >= 0 ? n : 2;
    } catch { return 2; }
  }

  function formatDecimal(value, decimals) {
    const n = parseFloat(value);
    if (!Number.isFinite(n)) return "-";
    return n.toLocaleString("es-PE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function childCellNumeric(field, item) {
    if (field.type === "boolean") {
      const raw = item.values?.[field.id];
      return raw === "1" || raw === 1 ? 1 : 0;
    }
    if (field.type === "formula") {
      try {
        const c = JSON.parse(field.options || "{}");
        const r = evalChildFormula(c.expr, item);
        return r ?? NaN;
      } catch { return NaN; }
    }
    return parseFloat(item.values?.[field.id]);
  }

  function evalChildFormula(expr, item) {
    if (!expr) return null;
    let body = expr.replace(/\[([^\]]+)\]/g, (_, name) => {
      const f = childFields.find((x) => x.name === name);
      if (!f) return "0";
      const v = childCellNumeric(f, item);
      return Number.isFinite(v) ? String(v) : "0";
    });
    if (!/^[\d\s+\-*/().]+$/.test(body)) return null;
    try {
      // eslint-disable-next-line no-new-func
      const result = Function(`return (${body})`)();
      return Number.isFinite(result) ? result : null;
    } catch { return null; }
  }

  function displayCell(field, value, item) {
    if (field.type === "boolean") return value === "1" || value === 1 ? "✓" : "—";
    if (field.type === "formula") {
      const c = (() => { try { return JSON.parse(field.options || "{}"); } catch { return {}; } })();
      const r = item ? evalChildFormula(c.expr, item) : null;
      if (r === null || !Number.isFinite(r)) return "-";
      return formatDecimal(r, c.decimals ?? 2);
    }
    if (field.type === "agregacion") {
      return "—";
    }
    if (value === null || value === undefined || value === "") return "-";
    if (field.type === "decimal") return formatDecimal(value, getDecimals(field));
    if (field.type === "link") return linkedLabel(field.id, value);
    if (field.type === "image") {
      const url = imageUrl(value);
      if (!url) return "-";
      // eslint-disable-next-line @next/next/no-img-element
      return (
        <img
          src={url}
          alt=""
          onClick={() => openLightbox(url)}
          className="w-10 h-10 object-cover rounded cursor-zoom-in"
          title="Click para ampliar"
        />
      );
    }
    return String(value);
  }

  function openNew() {
    setItemValues({});
    setEditingItemId(null);
    setShowItemForm(true);
  }

  function openEdit(item) {
    const v = { ...(item.values || {}) };
    setItemValues(v);
    setEditingItemId(item.id);
    setShowItemForm(true);
  }

  async function saveItem(e) {
    e.preventDefault();
    const computedTypes = new Set(["formula", "agregacion", "detalle"]);
    const cleanItemValues = {};
    for (const [fid, v] of Object.entries(itemValues)) {
      const f = childFields.find((x) => String(x.id) === String(fid));
      if (!f || computedTypes.has(f.type)) continue;
      cleanItemValues[fid] = v;
    }
    const valuesWithLink = { ...cleanItemValues, [linkFieldId]: String(parentId) };
    if (editingItemId) {
      await fetch(`/api/records/${editingItemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: valuesWithLink }),
      });
    } else {
      await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_id: childTableId, values: valuesWithLink }),
      });
    }
    setShowItemForm(false);
    setEditingItemId(null);
    setItemValues({});
    loadAll();
  }

  async function deleteItem(itemId) {
    if (!confirm("¿Eliminar este item?")) return;
    await fetch(`/api/records/${itemId}`, { method: "DELETE" });
    loadAll();
  }

  if (!parentId) {
    return (
      <div>
        <h3 className="font-semibold text-sm mb-2">{detalleField.name}</h3>
        <p className="text-sm text-gray-500 italic bg-amber-50 border border-amber-200 rounded p-3">
          💡 Guarda el registro primero (botón Crear arriba) para poder agregar items en {detalleField.name}.
        </p>
      </div>
    );
  }

  if (!childTableId || !linkFieldId) {
    return (
      <div className="text-sm text-red-600">
        Configuración incompleta en el campo "{detalleField.name}"
      </div>
    );
  }

  if (loading) return <p className="text-sm text-gray-500">Cargando {detalleField.name}...</p>;

  // Campos a mostrar en la sub-grilla (excluye el back-ref)
  const visibleFields = childFields.filter((f) => f.id !== linkFieldId && f.type !== "detalle");
  const hasDecimals = visibleFields.some((f) => f.type === "decimal");

  const sums = {};
  visibleFields.forEach((f) => {
    if (f.type !== "decimal") return;
    let s = 0;
    items.forEach((it) => {
      const n = parseFloat(it.values?.[f.id]);
      if (Number.isFinite(n)) s += n;
    });
    sums[f.id] = s;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">{detalleField.name} <span className="text-gray-400 font-normal">({items.length})</span></h3>
        <button
          type="button"
          onClick={openNew}
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
        >
          + Nuevo item
        </button>
      </div>

      {showItemForm && (
        <div className="border border-blue-300 rounded p-3 mb-2 bg-blue-50">
          <p className="font-medium text-sm mb-2">{editingItemId ? "Editar item" : "Nuevo item"}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {visibleFields.map((field) => (
              <div key={field.id}>
                <label className="block text-xs font-medium mb-1">{field.name}</label>
                <ItemInput
                  field={field}
                  value={itemValues[field.id] || ""}
                  onChange={(v) => setItemValues((prev) => ({ ...prev, [field.id]: v }))}
                  linkedTables={linkedTables}
                  linkedLabel={linkedLabel}
                  getDecimals={getDecimals}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={saveItem}
              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
            >
              {editingItemId ? "Guardar" : "Agregar"}
            </button>
            <button
              type="button"
              onClick={() => { setShowItemForm(false); setEditingItemId(null); }}
              className="text-gray-500 px-2 py-1 text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Sin items todavía.</p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded">
          <table className="text-sm border-collapse" style={{ tableLayout: "fixed", width: "max-content", minWidth: "100%" }}>
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-200 px-2 py-1 text-left w-10">#</th>
                {visibleFields.map((f) => (
                  <th key={f.id} className="border border-gray-200 px-2 py-1 text-left">{f.name}</th>
                ))}
                <th className="border border-gray-200 px-2 py-1 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={it.id} className="hover:bg-gray-50">
                  <td className="border border-gray-200 px-2 py-1 text-gray-500">{i + 1}</td>
                  {visibleFields.map((f) => (
                    <td key={f.id} className={`border border-gray-200 px-2 py-1 ${f.type === "decimal" || f.type === "number" || f.type === "formula" ? "text-right font-mono" : ""}`}>
                      {displayCell(f, it.values?.[f.id], it)}
                    </td>
                  ))}
                  <td className="border border-gray-200 px-1 py-1">
                    <div className="flex gap-1 justify-center">
                      <button type="button" onClick={() => openEdit(it)} title="Editar" className="text-gray-500 hover:text-blue-600 p-1"><EditIcon /></button>
                      <button type="button" onClick={() => deleteItem(it.id)} title="Eliminar" className="text-gray-500 hover:text-red-600 p-1"><TrashIcon /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {hasDecimals && (
              <tfoot>
                <tr className="bg-blue-50 font-bold">
                  <td className="border border-gray-200 px-2 py-1">Σ</td>
                  {visibleFields.map((f) => (
                    <td key={f.id} className={`border border-gray-200 px-2 py-1 ${f.type === "decimal" ? "text-right font-mono text-blue-700" : ""}`}>
                      {f.type === "decimal" ? formatDecimal(sums[f.id], getDecimals(f)) : ""}
                    </td>
                  ))}
                  <td className="border border-gray-200 px-2 py-1"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}

function ItemInput({ field, value, onChange, linkedTables, getDecimals }) {
  const cls = "w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  switch (field.type) {
    case "boolean":
      return (
        <label className="inline-flex items-center gap-2 cursor-pointer py-1">
          <input
            type="checkbox"
            checked={value === "1" || value === 1 || value === true}
            onChange={(e) => onChange(e.target.checked ? "1" : "0")}
            className="w-5 h-5 accent-blue-600"
          />
          <span className="text-sm text-gray-600">Sí</span>
        </label>
      );
    case "formula":
    case "agregacion":
      return (
        <div className="bg-gray-100 border border-gray-300 rounded px-2 py-1 text-sm text-gray-500 italic">
          (calculado al guardar)
        </div>
      );
    case "text":
      return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={cls} />;
    case "memo":
      return <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} className={cls} />;
    case "number":
      return <input type="number" step="any" value={value} onChange={(e) => onChange(e.target.value)} className={cls} />;
    case "decimal": {
      const d = getDecimals(field);
      const step = d > 0 ? "0." + "0".repeat(d - 1) + "1" : "1";
      return <input type="number" step={step} value={value} onChange={(e) => onChange(e.target.value)} className={cls + " text-right font-mono"} />;
    }
    case "date":
      return <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className={cls} />;
    case "dropdown": {
      const opts = field.options ? JSON.parse(field.options) : [];
      return (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={cls}>
          <option value="">Seleccionar...</option>
          {opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    case "image":
      return <ImageField value={value} onChange={onChange} />;
    case "link": {
      const linked = linkedTables[field.id]?.records || [];
      const linkedFields = linkedTables[field.id]?.fields || [];
      const label = (r) => {
        const parts = linkedFields.slice(0, 2)
          .map((f) => r.values?.[f.id])
          .filter((v) => v !== undefined && v !== null && v !== "");
        return parts.length > 0 ? parts.join(" | ") : `#${r.id}`;
      };
      return (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={cls}>
          <option value="">Seleccionar...</option>
          {linked.map((r) => <option key={r.id} value={r.id}>{label(r)}</option>)}
        </select>
      );
    }
    default:
      return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={cls} />;
  }
}
