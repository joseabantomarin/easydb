"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { EditIcon, TrashIcon } from "@/app/icons";

const FIELD_TYPES = [
  { value: "text", label: "Texto" },
  { value: "memo", label: "Memo" },
  { value: "number", label: "Número" },
  { value: "decimal", label: "Decimal" },
  { value: "date", label: "Fecha" },
  { value: "dropdown", label: "Desplegable" },
  { value: "image", label: "Imagen" },
  { value: "link", label: "Enlace" },
  { value: "detalle", label: "Detalle (sub-grilla)" },
];

function emptyField() {
  return { name: "", type: "text", options: "", width: "", linkFieldId: "" };
}

function defaultWidth(type) {
  switch (type) {
    case "date":
    case "number":
    case "decimal":
      return 100;
    case "text":
    case "memo":
      return 300;
    case "dropdown":
      return 180;
    case "image":
    case "link":
      return 200;
    default:
      return 150;
  }
}

export default function DatabasePage({ params }) {
  const { id } = use(params);
  const [database, setDatabase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTableId, setEditingTableId] = useState(null);
  const [tableName, setTableName] = useState("");
  const [fields, setFields] = useState([emptyField()]);
  const [allTables, setAllTables] = useState([]);
  const [tableFieldsCache, setTableFieldsCache] = useState({});

  useEffect(() => {
    fetchDatabase();
  }, [id]);

  useEffect(() => {
    fields.forEach((f) => {
      if (f.type === "detalle" && f.options) {
        ensureTableFields(parseInt(f.options));
      }
    });
  }, [fields]);

  async function ensureTableFields(tableId) {
    if (!tableId || tableFieldsCache[tableId]) return;
    const res = await fetch(`/api/tables/${tableId}`);
    if (!res.ok) return;
    const data = await res.json();
    setTableFieldsCache((prev) => ({ ...prev, [tableId]: data.fields || [] }));
  }

  async function fetchDatabase() {
    const res = await fetch(`/api/databases/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setDatabase(data);
    setAllTables(data.tables || []);
    setLoading(false);
  }

  function resetForm() {
    setTableName("");
    setFields([emptyField()]);
    setEditingTableId(null);
    setShowForm(false);
  }

  function openCreateForm() {
    resetForm();
    setShowForm(true);
  }

  async function openEditForm(table) {
    const res = await fetch(`/api/tables/${table.id}`);
    if (!res.ok) return;
    const data = await res.json();
    setEditingTableId(table.id);
    setTableName(data.name);
    const loaded = (data.fields || []).map((f) => {
      let optionsStr = "";
      let linkFieldId = "";
      if (f.options) {
        try {
          const parsed = JSON.parse(f.options);
          if (Array.isArray(parsed)) optionsStr = parsed.join(", ");
          else if (f.type === "decimal" && parsed && typeof parsed === "object") optionsStr = String(parsed.decimals ?? "");
          else if (f.type === "detalle" && parsed && typeof parsed === "object") {
            optionsStr = String(parsed.table_id ?? "");
            linkFieldId = String(parsed.link_field_id ?? "");
          } else optionsStr = String(parsed);
        } catch {
          optionsStr = f.options;
        }
      }
      return {
        id: f.id,
        name: f.name,
        type: f.type,
        options: optionsStr,
        width: f.width != null ? String(f.width) : "",
        linkFieldId,
      };
    });
    setFields(loaded);
    loaded
      .filter((f) => f.type === "detalle" && f.options)
      .forEach((f) => ensureTableFields(parseInt(f.options)));
    if (fields.length === 0) setFields([emptyField()]);
    setShowForm(true);
  }

  function addField() {
    setFields([...fields, emptyField()]);
  }

  function removeField(index) {
    setFields(fields.filter((_, i) => i !== index));
  }

  function updateField(index, key, value) {
    setFields((prev) => {
      const updated = [...prev];
      const prevType = updated[index].type;
      updated[index] = { ...updated[index], [key]: value };
      if (key === "type" && prevType !== value) {
        updated[index].options = "";
        updated[index].linkFieldId = "";
      }
      return updated;
    });
  }

  async function autoCreateBackRef(fieldIndex) {
    const f = fields[fieldIndex];
    const childTableId = parseInt(f.options);
    if (!childTableId || !editingTableId) return;

    const parentTable = allTables.find((t) => t.id === editingTableId);
    if (!parentTable) return;

    const res = await fetch(`/api/tables/${childTableId}`);
    if (!res.ok) return;
    const childTable = await res.json();
    const existingFields = childTable.fields || [];

    // nombre sin colisiones
    const baseName = parentTable.name.toLowerCase().replace(/\s+/g, "_");
    let name = baseName;
    let n = 1;
    while (existingFields.some((ef) => ef.name === name)) {
      n += 1;
      name = `${baseName}_${n}`;
    }

    // preservar fields existentes con sus IDs (options parseado para que PUT lo re-serialice)
    const newFields = existingFields.map((ef) => {
      let parsedOpts = null;
      if (ef.options) {
        try { parsedOpts = JSON.parse(ef.options); } catch { parsedOpts = ef.options; }
      }
      return {
        id: ef.id,
        name: ef.name,
        type: ef.type,
        options: parsedOpts,
        width: ef.width,
      };
    });
    newFields.push({ name, type: "link", options: String(editingTableId) });

    const putRes = await fetch(`/api/tables/${childTableId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: childTable.name, fields: newFields }),
    });
    if (!putRes.ok) {
      alert("No se pudo crear el campo enlace automáticamente.");
      return;
    }

    // refrescar cache y seleccionar el nuevo back-ref
    const refreshed = await fetch(`/api/tables/${childTableId}`).then((r) => r.json());
    const newField = (refreshed.fields || []).find((rf) => rf.name === name);
    setTableFieldsCache((prev) => ({ ...prev, [childTableId]: refreshed.fields || [] }));
    if (newField) {
      const updated = [...fields];
      updated[fieldIndex] = { ...updated[fieldIndex], linkFieldId: String(newField.id) };
      setFields(updated);
    }
  }

  async function saveTable(e) {
    e.preventDefault();
    if (!tableName.trim() || fields.length === 0) return;

    const namedFields = fields.filter((f) => f.name.trim());

    const badDetalle = namedFields.find(
      (f) => f.type === "detalle" && (!f.options || !f.linkFieldId)
    );
    if (badDetalle) {
      alert(
        `El campo "${badDetalle.name}" (tipo Detalle) requiere:\n` +
          `1) Una tabla hijo seleccionada\n` +
          `2) Un campo enlace en esa tabla que apunte de regreso a esta tabla\n\n` +
          `Si no aparece el segundo selector, primero ve a la tabla hijo y agrega un campo tipo "Enlace" apuntando a esta tabla.`
      );
      return;
    }

    const badLink = namedFields.find((f) => f.type === "link" && !f.options);
    if (badLink) {
      alert(`El campo "${badLink.name}" (tipo Enlace) requiere seleccionar una tabla.`);
      return;
    }

    const validFields = namedFields.map((f) => {
      const w = parseInt(f.width, 10);
      let options = null;
      if (f.type === "dropdown") {
        options = f.options.split(",").map((o) => o.trim()).filter(Boolean);
      } else if (f.type === "link") {
        options = f.options;
      } else if (f.type === "decimal") {
        options = { decimals: Math.max(0, parseInt(f.options || "2", 10) || 0) };
      } else if (f.type === "detalle") {
        options = { table_id: f.options, link_field_id: f.linkFieldId };
      }
      return {
        id: f.id,
        name: f.name.trim(),
        type: f.type,
        options,
        width: Number.isFinite(w) && w > 0 ? w : null,
      };
    });

    if (validFields.length === 0) return;

    if (editingTableId) {
      await fetch(`/api/tables/${editingTableId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tableName.trim(), fields: validFields }),
      });
    } else {
      await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          database_id: parseInt(id),
          name: tableName.trim(),
          fields: validFields,
        }),
      });
    }

    resetForm();
    fetchDatabase();
  }

  async function deleteTable(tableId) {
    if (!confirm("¿Eliminar esta tabla y todos sus registros?")) return;
    await fetch(`/api/tables/${tableId}`, { method: "DELETE" });
    fetchDatabase();
  }

  if (loading) return <p className="text-gray-500">Cargando...</p>;
  if (!database) return <p className="text-red-500">Base de datos no encontrada.</p>;

  return (
    <div>
      <div className="mb-6">
        <Link href="/" className="text-blue-600 hover:underline text-sm">
          &larr; Volver
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold truncate">{database.name}</h1>
        <button
          onClick={showForm ? resetForm : openCreateForm}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          {showForm ? "Cancelar" : "Nueva Tabla"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={saveTable} className="border border-gray-200 rounded-lg p-6 mb-8 bg-gray-50">
          <h2 className="font-semibold mb-4">
            {editingTableId ? "Editar Tabla" : "Nueva Tabla"}
          </h2>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Nombre de la tabla</label>
            <input
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Clientes"
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Campos</label>
            {fields.map((field, i) => (
              <div key={field.id ?? `new-${i}`} className="flex flex-wrap gap-2 mb-2 items-start">
                <input
                  type="text"
                  value={field.name}
                  onChange={(e) => updateField(i, "name", e.target.value)}
                  placeholder="Nombre del campo"
                  className="flex-1 min-w-[140px] border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={field.type}
                  onChange={(e) => updateField(i, "type", e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {FIELD_TYPES.map((ft) => (
                    <option key={ft.value} value={ft.value}>
                      {ft.label}
                    </option>
                  ))}
                </select>
                {field.type === "dropdown" && (
                  <input
                    type="text"
                    value={field.options}
                    onChange={(e) => updateField(i, "options", e.target.value)}
                    placeholder="Opciones separadas por coma"
                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
                {field.type === "link" && (
                  <select
                    value={field.options}
                    onChange={(e) => updateField(i, "options", e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar tabla</option>
                    {allTables
                      .filter((t) => t.id !== editingTableId)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                )}
                {field.type === "detalle" && (
                  <>
                    <select
                      value={field.options}
                      onChange={(e) => {
                        updateField(i, "options", e.target.value);
                        updateField(i, "linkFieldId", "");
                        if (e.target.value) ensureTableFields(parseInt(e.target.value));
                      }}
                      className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">— elige tabla hijo —</option>
                      {allTables
                        .filter((t) => t.id !== editingTableId)
                        .map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                    {field.options && (() => {
                      const childFields = tableFieldsCache[field.options] || [];
                      const backRefs = childFields.filter(
                        (cf) => cf.type === "link" && cf.options && String(JSON.parse(cf.options)) === String(editingTableId)
                      );
                      if (backRefs.length === 0) {
                        if (!editingTableId) {
                          return (
                            <span className="text-xs text-amber-600 self-center">
                              ⚠ Guarda primero esta tabla
                            </span>
                          );
                        }
                        return (
                          <button
                            type="button"
                            onClick={() => autoCreateBackRef(i)}
                            className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-300 rounded px-3 py-2"
                            title="Crea automáticamente el campo enlace en la tabla hijo"
                          >
                            ⚡ Crear enlace automático
                          </button>
                        );
                      }
                      return (
                        <select
                          value={field.linkFieldId}
                          onChange={(e) => updateField(i, "linkFieldId", e.target.value)}
                          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">— elige campo enlace —</option>
                          {backRefs.map((cf) => (
                            <option key={cf.id} value={cf.id}>{cf.name}</option>
                          ))}
                        </select>
                      );
                    })()}
                  </>
                )}
                {field.type === "decimal" && (
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={field.options || "2"}
                    onChange={(e) => updateField(i, "options", e.target.value)}
                    placeholder="Decimales"
                    title="Número de decimales"
                    className="w-24 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
                <input
                  type="number"
                  min="40"
                  step="10"
                  value={field.width}
                  onChange={(e) => updateField(i, "width", e.target.value)}
                  placeholder={`Ancho (${defaultWidth(field.type)})`}
                  title="Ancho en px (vacío = por defecto)"
                  className="w-32 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeField(i)}
                    className="text-red-500 hover:text-red-700 px-2 py-2"
                    title="Eliminar campo"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addField}
              className="text-blue-600 hover:underline text-sm mt-1"
            >
              + Agregar campo
            </button>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
            >
              {editingTableId ? "Guardar cambios" : "Crear Tabla"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="text-gray-500 hover:text-gray-700 px-4 py-2"
            >
              Cancelar
            </button>
          </div>

          {editingTableId && (
            <p className="text-xs text-gray-500 mt-3">
              ⚠ Los campos eliminados también borrarán sus datos en los registros existentes.
            </p>
          )}
        </form>
      )}

      {allTables.length === 0 ? (
        <p className="text-gray-500 text-center py-12">
          No hay tablas. Crea una para empezar.
        </p>
      ) : (
        <div className="grid gap-4">
          {allTables.map((table) => (
            <div
              key={table.id}
              className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:shadow transition"
            >
              <Link
                href={`/databases/${id}/tables/${table.id}`}
                className="text-lg font-medium text-blue-600 hover:underline flex-1"
              >
                {table.name}
              </Link>
              <div className="flex gap-1">
                <button
                  onClick={() => openEditForm(table)}
                  className="text-gray-500 hover:text-blue-600 p-2 rounded hover:bg-blue-50"
                  title="Editar"
                  aria-label="Editar"
                >
                  <EditIcon />
                </button>
                <button
                  onClick={() => deleteTable(table.id)}
                  className="text-gray-500 hover:text-red-600 p-2 rounded hover:bg-red-50"
                  title="Eliminar"
                  aria-label="Eliminar"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
