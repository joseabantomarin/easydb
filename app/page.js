"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { EditIcon, TrashIcon } from "@/app/icons";

export default function Home() {
  const [databases, setDatabases] = useState([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    fetchDatabases();
  }, []);

  async function fetchDatabases() {
    const res = await fetch("/api/databases");
    const data = await res.json();
    setDatabases(data);
    setLoading(false);
  }

  async function createDatabase(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    await fetch("/api/databases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setNewName("");
    fetchDatabases();
  }

  async function deleteDatabase(id) {
    if (!confirm("¿Eliminar esta base de datos y todos sus datos?")) return;
    await fetch(`/api/databases/${id}`, { method: "DELETE" });
    fetchDatabases();
  }

  async function saveEdit(id) {
    if (!editName.trim()) return;
    await fetch(`/api/databases/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setEditingId(null);
    fetchDatabases();
  }

  if (loading) {
    return <p className="text-gray-500">Cargando...</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Mis Bases de Datos</h1>
        <Link
          href="/manual"
          className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-3 py-1.5 rounded"
        >
          📖 Cómo usarlo
        </Link>
      </div>

      <form onSubmit={createDatabase} className="flex gap-3 mb-8">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nombre de la nueva base de datos"
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Crear
        </button>
      </form>

      {databases.length === 0 ? (
        <p className="text-gray-500 text-center py-12">
          No hay bases de datos. Crea una para empezar.
        </p>
      ) : (
        <div className="grid gap-4">
          {databases.map((db) => (
            <div
              key={db.id}
              className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:shadow transition"
            >
              {editingId === db.id ? (
                <div className="flex gap-2 flex-1 mr-4">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit(db.id)}
                    className="flex-1 border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={() => saveEdit(db.id)}
                    className="text-green-600 hover:text-green-800 font-medium"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <Link
                  href={`/databases/${db.id}`}
                  className="text-lg font-medium text-blue-600 hover:underline flex-1"
                >
                  {db.name}
                </Link>
              )}
              {editingId !== db.id && (
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditingId(db.id);
                      setEditName(db.name);
                    }}
                    className="text-gray-500 hover:text-blue-600 p-2 rounded hover:bg-blue-50"
                    title="Editar"
                    aria-label="Editar"
                  >
                    <EditIcon />
                  </button>
                  <button
                    onClick={() => deleteDatabase(db.id)}
                    className="text-gray-500 hover:text-red-600 p-2 rounded hover:bg-red-50"
                    title="Eliminar"
                    aria-label="Eliminar"
                  >
                    <TrashIcon />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
