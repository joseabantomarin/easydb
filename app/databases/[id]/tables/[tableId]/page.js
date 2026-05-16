"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { EditIcon, TrashIcon } from "@/app/icons";

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

  useEffect(() => {
    fetchData();
  }, [tableId]);

  useEffect(() => {
    setPage(1);
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
    if (editingRecordId) {
      await fetch(`/api/records/${editingRecordId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: formValues }),
      });
      setShowForm(false);
      setEditingRecordId(null);
      setFormValues({});
      fetchData();
    } else {
      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_id: parseInt(tableId), values: formValues }),
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

  function formatDecimal(value, decimals) {
    const n = parseFloat(value);
    if (!Number.isFinite(n)) return "-";
    return n.toLocaleString("es-PE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function getDisplayValue(field, value) {
    if (field.type === "decimal") {
      if (value === null || value === undefined || value === "") return "-";
      return formatDecimal(value, getDecimals(field));
    }
    if (!value) return "-";
    if (field.type === "link") {
      return linkedLabel(field.id, value);
    }
    if (field.type === "image") return value ? "Ver imagen" : "-";
    return value;
  }

  function columnWidth(field) {
    if (Number.isFinite(field.width) && field.width > 0) return `${field.width}px`;
    switch (field.type) {
      case "date":
      case "number":
      case "decimal":
        return "100px";
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

  function exportValue(field, value) {
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
      fields.map((f) => csvCell(exportValue(f, r.values?.[f.id]))).join(";")
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

  function decimalSums(rows = records) {
    const sums = {};
    fields.forEach((f) => {
      if (f.type !== "decimal") return;
      let sum = 0;
      rows.forEach((r) => {
        const v = r.values?.[f.id];
        const n = parseFloat(v);
        if (Number.isFinite(n)) sum += n;
      });
      sums[f.id] = sum;
    });
    return sums;
  }

  function searchableText(field, record) {
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
    <div>
      <div className="mb-6">
        <Link href={`/databases/${id}`} className="text-blue-600 hover:underline text-sm">
          &larr; Volver a tablas
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold truncate">{table.name}</h1>
        <div className="flex gap-2">
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
    const hasDecimals = fields.some((f) => f.type === "decimal");
    const colCount = fields.length + 2;

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
              <col style={{ width: "80px" }} />
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
                      className={`border border-gray-200 px-3 py-2 text-left truncate cursor-pointer select-none hover:bg-gray-200 ${active ? "text-blue-700" : ""}`}
                      title="Click para ordenar"
                    >
                      {field.name}<span className="text-xs">{arrow}</span>
                    </th>
                  );
                })}
                <th className="border border-gray-200 px-2 py-2 text-center sticky right-0 bg-gray-100 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)] z-10">

                </th>
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
                      className={`border border-gray-200 px-3 py-2 ${field.type === "decimal" ? "text-right font-mono text-blue-800" : ""}`}
                    >
                      {field.type === "decimal" ? formatDecimal(grandSums[field.id], getDecimals(field)) : ""}
                    </td>
                  ))}
                  <td className="border border-gray-200 px-3 py-2 sticky right-0 bg-blue-100 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)] z-10"></td>
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
    return (
      <tr key={record.id} className="group hover:bg-gray-50">
        <td className="border border-gray-200 px-3 py-2 text-gray-500">{num}</td>
        {fields.map((field) => {
          const alignRight = field.type === "decimal" || field.type === "number";
          const isMemo = field.type === "memo";
          return (
            <td
              key={field.id}
              className={`border border-gray-200 px-3 py-2 align-top ${alignRight ? "text-right font-mono" : ""} ${isMemo ? "whitespace-pre-wrap" : "truncate"}`}
            >
              {getDisplayValue(field, record.values[field.id])}
            </td>
          );
        })}
        <td className="border border-gray-200 px-2 py-1 sticky right-0 bg-white group-hover:bg-gray-50 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)] z-10">
          <div className="flex gap-1 justify-center">
            <button
              onClick={() => openEditForm(record)}
              className="text-gray-500 hover:text-blue-600 p-1.5 rounded hover:bg-blue-50"
              title="Editar"
              aria-label="Editar"
            >
              <EditIcon />
            </button>
            <button
              onClick={() => deleteRecord(record.id)}
              className="text-gray-500 hover:text-red-600 p-1.5 rounded hover:bg-red-50"
              title="Eliminar"
              aria-label="Eliminar"
            >
              <TrashIcon />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  function renderGroupedRows(groups, groupField) {
    const colCount = fields.length + 2;
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
                className={`border border-gray-200 px-3 py-2 ${field.type === "decimal" ? "text-right font-mono text-amber-800" : ""}`}
              >
                {field.type === "decimal" ? formatDecimal(g.sums[field.id], getDecimals(field)) : ""}
              </td>
            ))}
            <td className="border border-gray-200 px-3 py-2 sticky right-0 bg-amber-50 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)] z-10"></td>
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
        return (
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="URL de la imagen"
            className={inputClass}
          />
        );
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

  function displayCell(field, value) {
    if (value === null || value === undefined || value === "") return "-";
    if (field.type === "decimal") return formatDecimal(value, getDecimals(field));
    if (field.type === "link") return linkedLabel(field.id, value);
    if (field.type === "image") return "(img)";
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
    const valuesWithLink = { ...itemValues, [linkFieldId]: String(parentId) };
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
                    <td key={f.id} className={`border border-gray-200 px-2 py-1 ${f.type === "decimal" || f.type === "number" ? "text-right font-mono" : ""}`}>
                      {displayCell(f, it.values?.[f.id])}
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
      return <input type="url" value={value} onChange={(e) => onChange(e.target.value)} placeholder="URL" className={cls} />;
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
