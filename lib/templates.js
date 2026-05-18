// Plantillas de bases de datos.
//
// Convenciones del formato:
//   Cada tabla y cada campo tienen un `slug` único dentro de la plantilla
//   para que los campos relacionales (link/detalle/agregacion) y los valores
//   de registros referencien por nombre lógico y no por id.
//
//   Tipos soportados por field.type:
//     text, memo, number, date, dropdown, image, boolean,
//     decimal      → { decimals }
//     link         → { linkTable: "tableSlug" }
//     detalle      → { detalleTable: "tableSlug", detalleLinkField: "fieldSlug" }
//     formula      → { expr: "[campo1]*[campo2]", decimals }
//     agregacion   → { aggDetalleField, aggOperation, aggTargetField, aggDecimals }
//     dropdown     → { choices: ["a","b"] }
//
//   Registros: { slug?, values: { fieldSlug: valor, ... } }
//   Para link/detalle el valor es el slug del registro referenciado.

const TEMPLATES = [
  {
    id: "gastos",
    name: "Gastos personales",
    description: "Categorías y gastos diarios — ideal para empezar",
    tables: [
      {
        slug: "categorias",
        name: "Categorías",
        fields: [
          { slug: "nombre", name: "Nombre", type: "text" },
        ],
        records: [
          { slug: "comida", values: { nombre: "Comida" } },
          { slug: "transporte", values: { nombre: "Transporte" } },
          { slug: "ocio", values: { nombre: "Ocio" } },
        ],
      },
      {
        slug: "gastos",
        name: "Gastos",
        fields: [
          { slug: "fecha", name: "Fecha", type: "date" },
          { slug: "categoria", name: "Categoría", type: "link", linkTable: "categorias" },
          { slug: "concepto", name: "Concepto", type: "text" },
          { slug: "monto", name: "Monto", type: "decimal", decimals: 2 },
        ],
        records: [
          { values: { fecha: "2026-05-15", categoria: "comida", concepto: "Almuerzo", monto: "25.50" } },
          { values: { fecha: "2026-05-15", categoria: "transporte", concepto: "Taxi al trabajo", monto: "12.00" } },
          { values: { fecha: "2026-05-16", categoria: "ocio", concepto: "Cine", monto: "30.00" } },
        ],
      },
    ],
  },

  {
    id: "facturacion",
    name: "Facturación",
    description: "Clientes, facturas con items (cantidad × precio) y total automático",
    tables: [
      {
        slug: "clientes",
        name: "Clientes",
        fields: [
          { slug: "nombre", name: "Nombre", type: "text" },
          { slug: "dni_ruc", name: "DNI/RUC", type: "text", width: 140 },
          { slug: "email", name: "Email", type: "text" },
          { slug: "telefono", name: "Teléfono", type: "text", width: 140 },
        ],
        records: [
          { slug: "juan", values: { nombre: "Juan Pérez", dni_ruc: "10456789012", email: "juan@example.com", telefono: "987654321" } },
          { slug: "acme", values: { nombre: "ACME S.A.C.", dni_ruc: "20123456789", email: "ventas@acme.pe", telefono: "014567890" } },
        ],
      },
      {
        slug: "facturas",
        name: "Facturas",
        fields: [
          { slug: "numero", name: "Número", type: "text", width: 100 },
          { slug: "fecha", name: "Fecha", type: "date" },
          { slug: "cliente", name: "Cliente", type: "link", linkTable: "clientes" },
          { slug: "items", name: "Items", type: "detalle", detalleTable: "factura_items", detalleLinkField: "factura" },
          { slug: "total", name: "Total", type: "agregacion", aggDetalleField: "items", aggOperation: "SUM", aggTargetField: "subtotal", aggDecimals: 2 },
        ],
        records: [
          { slug: "f001", values: { numero: "F-001", fecha: "2026-05-10", cliente: "juan" } },
          { slug: "f002", values: { numero: "F-002", fecha: "2026-05-12", cliente: "acme" } },
        ],
      },
      {
        slug: "factura_items",
        name: "Items factura",
        fields: [
          { slug: "factura", name: "Factura", type: "link", linkTable: "facturas" },
          { slug: "producto", name: "Producto", type: "text" },
          { slug: "cantidad", name: "Cantidad", type: "decimal", decimals: 0, width: 90 },
          { slug: "precio", name: "Precio", type: "decimal", decimals: 2 },
          { slug: "subtotal", name: "Subtotal", type: "formula", expr: "[cantidad]*[precio]", decimals: 2 },
        ],
        records: [
          { values: { factura: "f001", producto: "Hosting mensual", cantidad: "1", precio: "50.00" } },
          { values: { factura: "f001", producto: "Dominio anual", cantidad: "1", precio: "60.00" } },
          { values: { factura: "f002", producto: "Consultoría (horas)", cantidad: "8", precio: "120.00" } },
          { values: { factura: "f002", producto: "Setup inicial", cantidad: "1", precio: "200.00" } },
        ],
      },
    ],
  },

  {
    id: "biblioteca",
    name: "Biblioteca",
    description: "Autores, libros y préstamos con devolución",
    tables: [
      {
        slug: "autores",
        name: "Autores",
        fields: [
          { slug: "nombre", name: "Nombre", type: "text" },
          { slug: "nacionalidad", name: "Nacionalidad", type: "text", width: 150 },
        ],
        records: [
          { slug: "vargas_llosa", values: { nombre: "Mario Vargas Llosa", nacionalidad: "Peruana" } },
          { slug: "garcia_marquez", values: { nombre: "Gabriel García Márquez", nacionalidad: "Colombiana" } },
        ],
      },
      {
        slug: "libros",
        name: "Libros",
        fields: [
          { slug: "titulo", name: "Título", type: "text" },
          { slug: "autor", name: "Autor", type: "link", linkTable: "autores" },
          { slug: "genero", name: "Género", type: "dropdown", choices: ["Novela", "Ensayo", "Poesía", "Técnico", "Infantil"] },
          { slug: "anio", name: "Año", type: "number", width: 80 },
          { slug: "portada", name: "Portada", type: "image" },
        ],
        records: [
          { slug: "ciudad_perros", values: { titulo: "La ciudad y los perros", autor: "vargas_llosa", genero: "Novela", anio: "1963" } },
          { slug: "cien_anios", values: { titulo: "Cien años de soledad", autor: "garcia_marquez", genero: "Novela", anio: "1967" } },
        ],
      },
      {
        slug: "prestamos",
        name: "Préstamos",
        fields: [
          { slug: "libro", name: "Libro", type: "link", linkTable: "libros" },
          { slug: "prestatario", name: "Prestatario", type: "text" },
          { slug: "fecha_prestamo", name: "Fecha préstamo", type: "date" },
          { slug: "fecha_devolucion", name: "Fecha devolución", type: "date" },
          { slug: "devuelto", name: "Devuelto", type: "boolean" },
          { slug: "notas", name: "Notas", type: "memo" },
        ],
        records: [
          { values: { libro: "ciudad_perros", prestatario: "Ana López", fecha_prestamo: "2026-05-01", fecha_devolucion: "2026-05-15", devuelto: "1", notas: "" } },
          { values: { libro: "cien_anios", prestatario: "Carlos Ruiz", fecha_prestamo: "2026-05-10", fecha_devolucion: "", devuelto: "0", notas: "Recordarle al final del mes" } },
        ],
      },
    ],
  },

  {
    id: "inventario",
    name: "Inventario",
    description: "Productos, movimientos de entrada/salida y stock calculado automáticamente",
    tables: [
      {
        slug: "categorias",
        name: "Categorías",
        fields: [
          { slug: "nombre", name: "Nombre", type: "text" },
          { slug: "descripcion", name: "Descripción", type: "memo" },
        ],
        records: [
          { slug: "bebidas", values: { nombre: "Bebidas", descripcion: "Líquidos y refrescos" } },
          { slug: "snacks", values: { nombre: "Snacks", descripcion: "Pasabocas envasados" } },
        ],
      },
      {
        slug: "productos",
        name: "Productos",
        fields: [
          { slug: "codigo", name: "Código", type: "text", width: 100 },
          { slug: "nombre", name: "Nombre", type: "text" },
          { slug: "categoria", name: "Categoría", type: "link", linkTable: "categorias" },
          { slug: "foto", name: "Foto", type: "image" },
          { slug: "precio", name: "Precio", type: "decimal", decimals: 2 },
          { slug: "stock_minimo", name: "Stock mín.", type: "decimal", decimals: 0, width: 90 },
          { slug: "movimientos", name: "Movimientos", type: "detalle", detalleTable: "movimientos", detalleLinkField: "producto" },
          { slug: "stock", name: "Stock", type: "agregacion", aggDetalleField: "movimientos", aggOperation: "SUM", aggTargetField: "variacion", aggDecimals: 0 },
        ],
        records: [
          { slug: "p001", values: { codigo: "P001", nombre: "Agua mineral 500ml", categoria: "bebidas", precio: "2.50", stock_minimo: "20" } },
          { slug: "p002", values: { codigo: "P002", nombre: "Galletas chocolate", categoria: "snacks", precio: "3.00", stock_minimo: "30" } },
        ],
      },
      {
        slug: "movimientos",
        name: "Movimientos",
        fields: [
          { slug: "producto", name: "Producto", type: "link", linkTable: "productos" },
          { slug: "tipo", name: "Tipo", type: "dropdown", choices: ["Entrada", "Salida"] },
          { slug: "entradas", name: "Entradas", type: "decimal", decimals: 0, width: 90 },
          { slug: "salidas", name: "Salidas", type: "decimal", decimals: 0, width: 90 },
          { slug: "variacion", name: "Variación", type: "formula", expr: "[entradas]-[salidas]", decimals: 0 },
          { slug: "fecha", name: "Fecha", type: "date" },
          { slug: "notas", name: "Notas", type: "memo" },
        ],
        records: [
          { values: { producto: "p001", tipo: "Entrada", entradas: "100", salidas: "0", fecha: "2026-05-01", notas: "Compra inicial" } },
          { values: { producto: "p001", tipo: "Salida", entradas: "0", salidas: "12", fecha: "2026-05-10", notas: "" } },
          { values: { producto: "p002", tipo: "Entrada", entradas: "50", salidas: "0", fecha: "2026-05-03", notas: "" } },
        ],
      },
    ],
  },
];

export function listTemplates() {
  return TEMPLATES.map((t) => ({ id: t.id, name: t.name, description: t.description }));
}

export function getTemplate(id) {
  return TEMPLATES.find((t) => t.id === id) || null;
}

// Convierte la definición de campo en la representación que se inserta
// en la columna `options` (texto JSON). Recibe los maps tableIds y fieldIds
// (por slug) y el map de tablas por slug para resolver agregaciones.
function serializeOptions(field, ctx) {
  const { tableIds, fieldIds, tablesBySlug, currentTableSlug } = ctx;
  switch (field.type) {
    case "decimal":
      return JSON.stringify({ decimals: field.decimals ?? 2 });
    case "dropdown":
      return JSON.stringify(field.choices || []);
    case "link": {
      const tid = tableIds[field.linkTable];
      if (!tid) throw new Error(`linkTable desconocido: ${field.linkTable}`);
      return JSON.stringify(String(tid));
    }
    case "detalle": {
      const tid = tableIds[field.detalleTable];
      const lfid = fieldIds[field.detalleTable]?.[field.detalleLinkField];
      if (!tid || !lfid) throw new Error(`detalle inválido en ${currentTableSlug}.${field.slug}`);
      return JSON.stringify({ table_id: tid, link_field_id: lfid });
    }
    case "formula":
      return JSON.stringify({ expr: field.expr || "", decimals: field.decimals ?? 2 });
    case "agregacion": {
      const detFieldId = fieldIds[currentTableSlug]?.[field.aggDetalleField];
      const detField = tablesBySlug.get(currentTableSlug)?.fields.find((f) => f.slug === field.aggDetalleField);
      if (!detField) throw new Error(`Agregación sin detalle válido en ${currentTableSlug}.${field.slug}`);
      const childTableSlug = detField.detalleTable;
      const targetFieldId = fieldIds[childTableSlug]?.[field.aggTargetField];
      if (!detFieldId || !targetFieldId) throw new Error(`Agregación inválida en ${currentTableSlug}.${field.slug}`);
      return JSON.stringify({
        detail_field_id: detFieldId,
        operation: field.aggOperation || "SUM",
        target_field_id: targetFieldId,
        decimals: field.aggDecimals ?? 2,
      });
    }
    default:
      return null;
  }
}

// Anchos por defecto por tipo (mismo criterio que el editor del frontend).
function defaultWidth(type) {
  switch (type) {
    case "date":
    case "number":
    case "decimal":
    case "formula":
    case "agregacion":
      return 100;
    case "boolean":
      return 70;
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

export function materializeTemplate(db, template, databaseName, userId) {
  const tablesBySlug = new Map(template.tables.map((t) => [t.slug, t]));

  const insertDb = db.prepare("INSERT INTO databases (name, user_id) VALUES (?, ?)");
  const insertTable = db.prepare("INSERT INTO tables_ (database_id, name) VALUES (?, ?)");
  const insertField = db.prepare(
    "INSERT INTO fields (table_id, name, type, options, position, width) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const updateFieldOptions = db.prepare("UPDATE fields SET options = ? WHERE id = ?");
  const insertRecord = db.prepare("INSERT INTO records (table_id) VALUES (?)");
  const insertValue = db.prepare("INSERT INTO record_values (record_id, field_id, value) VALUES (?, ?, ?)");

  return db.transaction(() => {
    const dbResult = insertDb.run(databaseName, userId);
    const dbId = dbResult.lastInsertRowid;

    const tableIds = {};       // slug → id
    const fieldIds = {};       // tableSlug → { fieldSlug → id }
    const fieldRefs = {};      // tableSlug → { fieldSlug → field def } (para post-pass de options)

    // 1) Crear tablas y campos (options en null para tipos que requieren resolución de IDs).
    for (const t of template.tables) {
      const tRes = insertTable.run(dbId, t.name);
      tableIds[t.slug] = tRes.lastInsertRowid;
      fieldIds[t.slug] = {};
      fieldRefs[t.slug] = {};

      t.fields.forEach((f, i) => {
        const width = f.width ?? defaultWidth(f.type);
        const earlyTypes = new Set(["decimal", "dropdown"]);
        const ctx = { tableIds, fieldIds, tablesBySlug, currentTableSlug: t.slug };
        const initialOptions = earlyTypes.has(f.type) ? serializeOptions(f, ctx) : null;
        const fRes = insertField.run(tableIds[t.slug], f.name, f.type, initialOptions, i, width);
        fieldIds[t.slug][f.slug] = fRes.lastInsertRowid;
        fieldRefs[t.slug][f.slug] = f;
      });
    }

    // 2) Resolver options de tipos que dependen de IDs (link, detalle, formula, agregacion).
    for (const t of template.tables) {
      for (const f of t.fields) {
        if (!["link", "detalle", "formula", "agregacion"].includes(f.type)) continue;
        const ctx = { tableIds, fieldIds, tablesBySlug, currentTableSlug: t.slug };
        const opts = serializeOptions(f, ctx);
        updateFieldOptions.run(opts, fieldIds[t.slug][f.slug]);
      }
    }

    // 3) Crear registros (capturando slug → id).
    const recordIds = {};      // tableSlug → { recordSlug → id }
    for (const t of template.tables) {
      recordIds[t.slug] = {};
      (t.records || []).forEach((rec, i) => {
        const rRes = insertRecord.run(tableIds[t.slug]);
        const rid = rRes.lastInsertRowid;
        if (rec.slug) recordIds[t.slug][rec.slug] = rid;
        else recordIds[t.slug][`__auto_${i}`] = rid;
      });
    }

    // 4) Insertar record_values resolviendo referencias por slug en campos link.
    for (const t of template.tables) {
      (t.records || []).forEach((rec, recIdx) => {
        const myId = rec.slug ? recordIds[t.slug][rec.slug] : recordIds[t.slug][`__auto_${recIdx}`];
        for (const [fieldSlug, rawVal] of Object.entries(rec.values || {})) {
          const fid = fieldIds[t.slug]?.[fieldSlug];
          if (!fid) continue;
          const f = fieldRefs[t.slug][fieldSlug];
          let v = rawVal;
          if (f.type === "link" && rawVal) {
            const linkedId = recordIds[f.linkTable]?.[rawVal];
            v = linkedId ? String(linkedId) : "";
          }
          insertValue.run(myId, fid, v ?? "");
        }
      });
    }

    return dbId;
  })();
}
