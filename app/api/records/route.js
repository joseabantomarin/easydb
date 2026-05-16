import { getDb } from "@/lib/db";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const tableId = searchParams.get("table_id");
  if (!tableId) {
    return Response.json({ error: "table_id es requerido" }, { status: 400 });
  }

  const db = getDb();
  const fields = db.prepare("SELECT * FROM fields WHERE table_id = ? ORDER BY position").all(tableId);
  const records = db.prepare("SELECT * FROM records WHERE table_id = ? ORDER BY created_at DESC").all(tableId);

  const recordsWithValues = records.map((record) => {
    const values = db
      .prepare("SELECT rv.*, f.name as field_name, f.type as field_type FROM record_values rv JOIN fields f ON rv.field_id = f.id WHERE rv.record_id = ?")
      .all(record.id);
    const valuesMap = {};
    values.forEach((v) => {
      valuesMap[v.field_id] = v.value;
    });
    return { ...record, values: valuesMap };
  });

  return Response.json({ fields, records: recordsWithValues });
}

export async function POST(request) {
  const { table_id, values } = await request.json();
  if (!table_id) {
    return Response.json({ error: "table_id es requerido" }, { status: 400 });
  }

  const db = getDb();
  const tableExists = db.prepare("SELECT id FROM tables_ WHERE id = ?").get(table_id);
  if (!tableExists) {
    return Response.json({ error: "Tabla no encontrada" }, { status: 404 });
  }

  const insertRecord = db.prepare("INSERT INTO records (table_id) VALUES (?)");
  const insertValue = db.prepare("INSERT INTO record_values (record_id, field_id, value) VALUES (?, ?, ?)");

  const transaction = db.transaction(() => {
    const result = insertRecord.run(table_id);
    const recordId = result.lastInsertRowid;

    if (values && typeof values === "object") {
      for (const [fieldId, value] of Object.entries(values)) {
        insertValue.run(recordId, parseInt(fieldId), value ?? "");
      }
    }

    return recordId;
  });

  const recordId = transaction();
  const record = db.prepare("SELECT * FROM records WHERE id = ?").get(recordId);
  return Response.json(record, { status: 201 });
}
