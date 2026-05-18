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
    id: "recetas",
    name: "Recetas de cocina",
    description: "Recetas con ingredientes, costo estimado, foto del platillo y evaluación",
    tables: [
      {
        slug: "recetas",
        name: "Recetas",
        fields: [
          { slug: "nombre", name: "Nombre", type: "text" },
          { slug: "foto", name: "Foto", type: "image" },
          { slug: "tiempo_min", name: "Tiempo (min)", type: "number", width: 100 },
          { slug: "pasos", name: "Pasos", type: "memo" },
          { slug: "evaluacion", name: "Evaluación", type: "dropdown", choices: ["★", "★★", "★★★", "★★★★", "★★★★★"] },
          { slug: "ingredientes", name: "Ingredientes", type: "detalle", detalleTable: "ingredientes", detalleLinkField: "receta" },
          { slug: "costo_estimado", name: "Costo estimado", type: "agregacion", aggDetalleField: "ingredientes", aggOperation: "SUM", aggTargetField: "subtotal", aggDecimals: 2 },
        ],
        records: [
          { slug: "lomo_saltado", values: { nombre: "Lomo saltado", tiempo_min: "30", pasos: "1. Cortar el lomo en tiras.\n2. Saltear con cebolla y tomate.\n3. Agregar sillao y vinagre.\n4. Servir con papas fritas y arroz.", evaluacion: "★★★★★" } },
          { slug: "ensalada_quinua", values: { nombre: "Ensalada de quinua", tiempo_min: "20", pasos: "1. Cocer la quinua.\n2. Mezclar con tomate, palta y limón.\n3. Sazonar.", evaluacion: "★★★★" } },
        ],
      },
      {
        slug: "ingredientes",
        name: "Ingredientes",
        fields: [
          { slug: "receta", name: "Receta", type: "link", linkTable: "recetas" },
          { slug: "nombre", name: "Ingrediente", type: "text" },
          { slug: "cantidad", name: "Cantidad", type: "decimal", decimals: 2, width: 90 },
          { slug: "unidad", name: "Unidad", type: "dropdown", choices: ["g", "kg", "ml", "L", "unid.", "cda.", "cdta.", "taza"] },
          { slug: "precio_unit", name: "Precio unit.", type: "decimal", decimals: 2 },
          { slug: "subtotal", name: "Subtotal", type: "formula", expr: "[cantidad]*[precio_unit]", decimals: 2 },
        ],
        records: [
          { values: { receta: "lomo_saltado", nombre: "Lomo de res", cantidad: "0.5", unidad: "kg", precio_unit: "35.00" } },
          { values: { receta: "lomo_saltado", nombre: "Cebolla", cantidad: "1", unidad: "unid.", precio_unit: "1.50" } },
          { values: { receta: "lomo_saltado", nombre: "Tomate", cantidad: "2", unidad: "unid.", precio_unit: "2.00" } },
          { values: { receta: "ensalada_quinua", nombre: "Quinua", cantidad: "200", unidad: "g", precio_unit: "0.02" } },
          { values: { receta: "ensalada_quinua", nombre: "Palta", cantidad: "1", unidad: "unid.", precio_unit: "4.00" } },
        ],
      },
    ],
  },

  {
    id: "planificador_comidas",
    name: "Planificador de comidas",
    description: "Plan semanal de comidas y lista de compras",
    tables: [
      {
        slug: "recetas",
        name: "Recetas",
        fields: [
          { slug: "nombre", name: "Nombre", type: "text" },
          { slug: "tipo", name: "Tipo", type: "dropdown", choices: ["Desayuno", "Almuerzo", "Cena", "Snack"] },
          { slug: "notas", name: "Notas", type: "memo" },
        ],
        records: [
          { slug: "avena", values: { nombre: "Avena con frutas", tipo: "Desayuno", notas: "Rápido y nutritivo" } },
          { slug: "pollo_arroz", values: { nombre: "Pollo con arroz", tipo: "Almuerzo", notas: "" } },
          { slug: "sopa_verduras", values: { nombre: "Sopa de verduras", tipo: "Cena", notas: "Ligera" } },
        ],
      },
      {
        slug: "plan",
        name: "Plan",
        fields: [
          { slug: "fecha", name: "Fecha", type: "date" },
          { slug: "momento", name: "Momento", type: "dropdown", choices: ["Desayuno", "Almuerzo", "Cena", "Snack"] },
          { slug: "receta", name: "Receta", type: "link", linkTable: "recetas" },
          { slug: "comensales", name: "Comensales", type: "number", width: 100 },
        ],
        records: [
          { values: { fecha: "2026-05-18", momento: "Desayuno", receta: "avena", comensales: "2" } },
          { values: { fecha: "2026-05-18", momento: "Almuerzo", receta: "pollo_arroz", comensales: "2" } },
          { values: { fecha: "2026-05-18", momento: "Cena", receta: "sopa_verduras", comensales: "2" } },
          { values: { fecha: "2026-05-19", momento: "Almuerzo", receta: "pollo_arroz", comensales: "4" } },
        ],
      },
      {
        slug: "compras",
        name: "Lista de compras",
        fields: [
          { slug: "item", name: "Item", type: "text" },
          { slug: "cantidad", name: "Cantidad", type: "text", width: 100 },
          { slug: "categoria", name: "Categoría", type: "dropdown", choices: ["Frutas", "Verduras", "Carnes", "Lácteos", "Abarrotes", "Otros"] },
          { slug: "comprado", name: "Comprado", type: "boolean" },
        ],
        records: [
          { values: { item: "Avena", cantidad: "500 g", categoria: "Abarrotes", comprado: "0" } },
          { values: { item: "Pollo", cantidad: "1 kg", categoria: "Carnes", comprado: "0" } },
          { values: { item: "Zanahoria", cantidad: "3 unid.", categoria: "Verduras", comprado: "1" } },
        ],
      },
    ],
  },

  {
    id: "habitos",
    name: "Control de hábitos",
    description: "Hábitos, seguimiento diario y progreso acumulado",
    tables: [
      {
        slug: "habitos",
        name: "Hábitos",
        fields: [
          { slug: "nombre", name: "Hábito", type: "text" },
          { slug: "frecuencia", name: "Frecuencia", type: "dropdown", choices: ["Diario", "3x por semana", "Semanal", "Mensual"] },
          { slug: "meta", name: "Meta", type: "text" },
          { slug: "seguimiento", name: "Seguimiento", type: "detalle", detalleTable: "seguimiento", detalleLinkField: "habito" },
          { slug: "dias_cumplidos", name: "Días cumplidos", type: "agregacion", aggDetalleField: "seguimiento", aggOperation: "SUM", aggTargetField: "cumplido", aggDecimals: 0 },
        ],
        records: [
          { slug: "agua", values: { nombre: "Tomar 2L de agua", frecuencia: "Diario", meta: "8 vasos al día" } },
          { slug: "lectura", values: { nombre: "Leer 30 min", frecuencia: "Diario", meta: "1 libro al mes" } },
          { slug: "ejercicio", values: { nombre: "Ejercicio", frecuencia: "3x por semana", meta: "" } },
        ],
      },
      {
        slug: "seguimiento",
        name: "Seguimiento",
        fields: [
          { slug: "habito", name: "Hábito", type: "link", linkTable: "habitos" },
          { slug: "fecha", name: "Fecha", type: "date" },
          { slug: "cumplido", name: "Cumplido", type: "boolean" },
          { slug: "notas", name: "Notas", type: "memo" },
        ],
        records: [
          { values: { habito: "agua", fecha: "2026-05-15", cumplido: "1", notas: "" } },
          { values: { habito: "agua", fecha: "2026-05-16", cumplido: "1", notas: "" } },
          { values: { habito: "agua", fecha: "2026-05-17", cumplido: "0", notas: "Día con mucho café" } },
          { values: { habito: "lectura", fecha: "2026-05-15", cumplido: "1", notas: "" } },
          { values: { habito: "ejercicio", fecha: "2026-05-16", cumplido: "1", notas: "Pesas" } },
        ],
      },
    ],
  },

  {
    id: "gimnasio",
    name: "Rutina de gimnasio",
    description: "Ejercicios, series/reps/peso por sesión y progreso por semana",
    tables: [
      {
        slug: "ejercicios",
        name: "Ejercicios",
        fields: [
          { slug: "nombre", name: "Ejercicio", type: "text" },
          { slug: "grupo", name: "Grupo muscular", type: "dropdown", choices: ["Pecho", "Espalda", "Piernas", "Hombros", "Brazos", "Core", "Cardio"] },
          { slug: "notas", name: "Notas", type: "memo" },
        ],
        records: [
          { slug: "press_banca", values: { nombre: "Press banca", grupo: "Pecho", notas: "Calentar antes" } },
          { slug: "sentadilla", values: { nombre: "Sentadilla", grupo: "Piernas", notas: "" } },
          { slug: "dominadas", values: { nombre: "Dominadas", grupo: "Espalda", notas: "Asistidas si es necesario" } },
        ],
      },
      {
        slug: "sesiones",
        name: "Sesiones",
        fields: [
          { slug: "fecha", name: "Fecha", type: "date" },
          { slug: "ejercicio", name: "Ejercicio", type: "link", linkTable: "ejercicios" },
          { slug: "series", name: "Series", type: "number", width: 80 },
          { slug: "reps", name: "Reps", type: "number", width: 80 },
          { slug: "peso", name: "Peso (kg)", type: "decimal", decimals: 1, width: 100 },
          { slug: "volumen", name: "Volumen", type: "formula", expr: "[series]*[reps]*[peso]", decimals: 1 },
        ],
        records: [
          { values: { fecha: "2026-05-12", ejercicio: "press_banca", series: "4", reps: "8", peso: "60.0" } },
          { values: { fecha: "2026-05-12", ejercicio: "sentadilla", series: "4", reps: "10", peso: "80.0" } },
          { values: { fecha: "2026-05-15", ejercicio: "press_banca", series: "4", reps: "8", peso: "62.5" } },
          { values: { fecha: "2026-05-15", ejercicio: "dominadas", series: "3", reps: "8", peso: "0" } },
        ],
      },
    ],
  },

  {
    id: "suscripciones",
    name: "Control de suscripciones",
    description: "Servicios contratados, costo mensual y fecha de próximo pago",
    tables: [
      {
        slug: "suscripciones",
        name: "Suscripciones",
        fields: [
          { slug: "servicio", name: "Servicio", type: "text" },
          { slug: "categoria", name: "Categoría", type: "dropdown", choices: ["Streaming", "Software", "Hosting", "Música", "Productividad", "Otros"] },
          { slug: "costo_mensual", name: "Costo mensual", type: "decimal", decimals: 2 },
          { slug: "fecha_pago", name: "Próximo pago", type: "date" },
          { slug: "renovacion_auto", name: "Renovación auto.", type: "boolean" },
          { slug: "notas", name: "Notas", type: "memo" },
        ],
        records: [
          { values: { servicio: "Netflix", categoria: "Streaming", costo_mensual: "44.90", fecha_pago: "2026-06-05", renovacion_auto: "1", notas: "Plan estándar" } },
          { values: { servicio: "Spotify", categoria: "Música", costo_mensual: "19.90", fecha_pago: "2026-05-28", renovacion_auto: "1", notas: "" } },
          { values: { servicio: "Hosting Hostinger", categoria: "Hosting", costo_mensual: "12.00", fecha_pago: "2027-01-15", renovacion_auto: "0", notas: "Pago anual" } },
        ],
      },
    ],
  },

  {
    id: "tareas",
    name: "Gestión de tareas",
    description: "Lista de tareas con estado, prioridad y fecha límite",
    tables: [
      {
        slug: "tareas",
        name: "Tareas",
        fields: [
          { slug: "titulo", name: "Tarea", type: "text" },
          { slug: "descripcion", name: "Descripción", type: "memo" },
          { slug: "estado", name: "Estado", type: "dropdown", choices: ["Pendiente", "En proceso", "Terminado", "Cancelado"] },
          { slug: "prioridad", name: "Prioridad", type: "dropdown", choices: ["Baja", "Media", "Alta", "Crítica"] },
          { slug: "fecha_limite", name: "Fecha límite", type: "date" },
          { slug: "asignado", name: "Asignado a", type: "text", width: 150 },
        ],
        records: [
          { values: { titulo: "Preparar presentación cliente", descripcion: "Slides + demo", estado: "En proceso", prioridad: "Alta", fecha_limite: "2026-05-20", asignado: "Jose" } },
          { values: { titulo: "Responder correos pendientes", descripcion: "", estado: "Pendiente", prioridad: "Media", fecha_limite: "2026-05-18", asignado: "Jose" } },
          { values: { titulo: "Backup mensual", descripcion: "Copia a disco externo", estado: "Terminado", prioridad: "Baja", fecha_limite: "2026-05-01", asignado: "Jose" } },
        ],
      },
    ],
  },

  {
    id: "proyectos",
    name: "Seguimiento de proyectos",
    description: "Proyectos divididos en fases con avance % calculado automáticamente",
    tables: [
      {
        slug: "proyectos",
        name: "Proyectos",
        fields: [
          { slug: "nombre", name: "Proyecto", type: "text" },
          { slug: "responsable", name: "Responsable", type: "text", width: 150 },
          { slug: "fecha_inicio", name: "Inicio", type: "date" },
          { slug: "fecha_fin", name: "Fin estimado", type: "date" },
          { slug: "fases", name: "Fases", type: "detalle", detalleTable: "fases", detalleLinkField: "proyecto" },
          { slug: "avance", name: "Avance %", type: "agregacion", aggDetalleField: "fases", aggOperation: "AVG", aggTargetField: "avance", aggDecimals: 0 },
        ],
        records: [
          { slug: "web_corp", values: { nombre: "Sitio web corporativo", responsable: "Ana", fecha_inicio: "2026-04-01", fecha_fin: "2026-06-30" } },
          { slug: "migracion", values: { nombre: "Migración ERP", responsable: "Carlos", fecha_inicio: "2026-05-01", fecha_fin: "2026-09-30" } },
        ],
      },
      {
        slug: "fases",
        name: "Fases",
        fields: [
          { slug: "proyecto", name: "Proyecto", type: "link", linkTable: "proyectos" },
          { slug: "nombre", name: "Fase", type: "text" },
          { slug: "estado", name: "Estado", type: "dropdown", choices: ["No iniciado", "En proceso", "Terminado", "Bloqueado"] },
          { slug: "avance", name: "Avance %", type: "decimal", decimals: 0, width: 100 },
          { slug: "notas", name: "Notas", type: "memo" },
        ],
        records: [
          { values: { proyecto: "web_corp", nombre: "Diseño", estado: "Terminado", avance: "100", notas: "Aprobado por cliente" } },
          { values: { proyecto: "web_corp", nombre: "Maquetación", estado: "En proceso", avance: "60", notas: "" } },
          { values: { proyecto: "web_corp", nombre: "Despliegue", estado: "No iniciado", avance: "0", notas: "" } },
          { values: { proyecto: "migracion", nombre: "Análisis", estado: "Terminado", avance: "100", notas: "" } },
          { values: { proyecto: "migracion", nombre: "Migración datos", estado: "En proceso", avance: "30", notas: "" } },
        ],
      },
    ],
  },

  {
    id: "horas_trabajadas",
    name: "Control de horas trabajadas",
    description: "Registro de horas por cliente y proyecto con total automático",
    tables: [
      {
        slug: "clientes",
        name: "Clientes",
        fields: [
          { slug: "nombre", name: "Cliente", type: "text" },
          { slug: "tarifa", name: "Tarifa (hora)", type: "decimal", decimals: 2 },
        ],
        records: [
          { slug: "acme", values: { nombre: "ACME S.A.C.", tarifa: "80.00" } },
          { slug: "globex", values: { nombre: "Globex", tarifa: "120.00" } },
        ],
      },
      {
        slug: "proyectos",
        name: "Proyectos",
        fields: [
          { slug: "nombre", name: "Proyecto", type: "text" },
          { slug: "cliente", name: "Cliente", type: "link", linkTable: "clientes" },
          { slug: "registros", name: "Registros", type: "detalle", detalleTable: "registros", detalleLinkField: "proyecto" },
          { slug: "total_horas", name: "Total horas", type: "agregacion", aggDetalleField: "registros", aggOperation: "SUM", aggTargetField: "horas", aggDecimals: 2 },
          { slug: "total_facturable", name: "Total $", type: "agregacion", aggDetalleField: "registros", aggOperation: "SUM", aggTargetField: "subtotal", aggDecimals: 2 },
        ],
        records: [
          { slug: "p_acme_web", values: { nombre: "Sitio web ACME", cliente: "acme" } },
          { slug: "p_globex_api", values: { nombre: "API Globex", cliente: "globex" } },
        ],
      },
      {
        slug: "registros",
        name: "Horas",
        fields: [
          { slug: "fecha", name: "Fecha", type: "date" },
          { slug: "proyecto", name: "Proyecto", type: "link", linkTable: "proyectos" },
          { slug: "descripcion", name: "Descripción", type: "text" },
          { slug: "horas", name: "Horas", type: "decimal", decimals: 2, width: 90 },
          { slug: "tarifa", name: "Tarifa", type: "decimal", decimals: 2 },
          { slug: "subtotal", name: "Subtotal", type: "formula", expr: "[horas]*[tarifa]", decimals: 2 },
        ],
        records: [
          { values: { fecha: "2026-05-13", proyecto: "p_acme_web", descripcion: "Diseño de landing", horas: "4.5", tarifa: "80.00" } },
          { values: { fecha: "2026-05-14", proyecto: "p_acme_web", descripcion: "Maquetación", horas: "6.0", tarifa: "80.00" } },
          { values: { fecha: "2026-05-15", proyecto: "p_globex_api", descripcion: "Endpoints auth", horas: "5.0", tarifa: "120.00" } },
        ],
      },
    ],
  },

  {
    id: "tickets",
    name: "Gestión de tickets/incidencias",
    description: "Tickets de soporte con prioridad, estado y responsable",
    tables: [
      {
        slug: "tickets",
        name: "Tickets",
        fields: [
          { slug: "titulo", name: "Problema", type: "text" },
          { slug: "descripcion", name: "Descripción", type: "memo" },
          { slug: "fecha", name: "Fecha", type: "date" },
          { slug: "prioridad", name: "Prioridad", type: "dropdown", choices: ["Baja", "Media", "Alta", "Crítica"] },
          { slug: "estado", name: "Estado", type: "dropdown", choices: ["Abierto", "En progreso", "En espera", "Resuelto", "Cerrado"] },
          { slug: "responsable", name: "Responsable", type: "text", width: 150 },
          { slug: "accion", name: "Acción tomada", type: "memo" },
        ],
        records: [
          { values: { titulo: "No carga la página de reportes", descripcion: "Timeout al generar reporte mensual", fecha: "2026-05-12", prioridad: "Alta", estado: "En progreso", responsable: "Ana", accion: "Revisando consultas SQL lentas" } },
          { values: { titulo: "Logo desalineado en factura PDF", descripcion: "Se ve corrido a la izquierda", fecha: "2026-05-15", prioridad: "Baja", estado: "Abierto", responsable: "Carlos", accion: "" } },
          { values: { titulo: "No llega correo de bienvenida", descripcion: "Usuarios nuevos no reciben email", fecha: "2026-05-10", prioridad: "Crítica", estado: "Resuelto", responsable: "Ana", accion: "Se reconfiguró el SMTP" } },
        ],
      },
    ],
  },

  {
    id: "inspecciones",
    name: "Checklist de inspección",
    description: "Inspecciones de equipos con checklist de ítems y firma del responsable",
    tables: [
      {
        slug: "inspecciones",
        name: "Inspecciones",
        fields: [
          { slug: "equipo", name: "Equipo", type: "text" },
          { slug: "ubicacion", name: "Ubicación", type: "text" },
          { slug: "responsable", name: "Responsable", type: "text", width: 150 },
          { slug: "fecha", name: "Fecha", type: "date" },
          { slug: "firma", name: "Firma", type: "image" },
          { slug: "items", name: "Ítems revisados", type: "detalle", detalleTable: "items", detalleLinkField: "inspeccion" },
          { slug: "total_fallas", name: "Fallas", type: "agregacion", aggDetalleField: "items", aggOperation: "SUM", aggTargetField: "tiene_falla", aggDecimals: 0 },
        ],
        records: [
          { slug: "insp_montacargas", values: { equipo: "Montacargas MC-01", ubicacion: "Almacén 1", responsable: "Pedro Quispe", fecha: "2026-05-15" } },
          { slug: "insp_generador", values: { equipo: "Generador G-02", ubicacion: "Cuarto eléctrico", responsable: "Luis Mora", fecha: "2026-05-16" } },
        ],
      },
      {
        slug: "items",
        name: "Ítems",
        fields: [
          { slug: "inspeccion", name: "Inspección", type: "link", linkTable: "inspecciones" },
          { slug: "descripcion", name: "Ítem a revisar", type: "text" },
          { slug: "estado", name: "Estado", type: "dropdown", choices: ["OK", "Falla", "N/A"] },
          { slug: "tiene_falla", name: "Marcar falla", type: "boolean" },
          { slug: "observacion", name: "Observación", type: "memo" },
        ],
        records: [
          { values: { inspeccion: "insp_montacargas", descripcion: "Nivel de aceite", estado: "OK", tiene_falla: "0", observacion: "" } },
          { values: { inspeccion: "insp_montacargas", descripcion: "Frenos", estado: "OK", tiene_falla: "0", observacion: "" } },
          { values: { inspeccion: "insp_montacargas", descripcion: "Luces de seguridad", estado: "Falla", tiene_falla: "1", observacion: "Foco posterior fundido" } },
          { values: { inspeccion: "insp_generador", descripcion: "Combustible", estado: "OK", tiene_falla: "0", observacion: "" } },
          { values: { inspeccion: "insp_generador", descripcion: "Batería", estado: "Falla", tiene_falla: "1", observacion: "Voltaje bajo, reemplazar" } },
        ],
      },
    ],
  },

  {
    id: "activos",
    name: "Seguimiento de activos (patrimonio)",
    description: "Inventario de activos con historial de movimientos y mantenimiento",
    tables: [
      {
        slug: "activos",
        name: "Activos",
        fields: [
          { slug: "codigo", name: "Código", type: "text", width: 100 },
          { slug: "nombre", name: "Nombre", type: "text" },
          { slug: "categoria", name: "Categoría", type: "dropdown", choices: ["Mobiliario", "Cómputo", "Vehículo", "Maquinaria", "Otros"] },
          { slug: "ubicacion", name: "Ubicación actual", type: "text" },
          { slug: "estado", name: "Estado", type: "dropdown", choices: ["Operativo", "En mantenimiento", "Dado de baja", "Asignado"] },
          { slug: "valor", name: "Valor (S/)", type: "decimal", decimals: 2 },
          { slug: "foto", name: "Foto", type: "image" },
          { slug: "historial", name: "Historial", type: "detalle", detalleTable: "historial", detalleLinkField: "activo" },
        ],
        records: [
          { slug: "lap001", values: { codigo: "LAP-001", nombre: "Laptop Dell Latitude 5520", categoria: "Cómputo", ubicacion: "Oficina Gerencia", estado: "Asignado", valor: "4500.00" } },
          { slug: "veh001", values: { codigo: "VEH-001", nombre: "Camioneta Hilux ABC-123", categoria: "Vehículo", ubicacion: "Garage central", estado: "Operativo", valor: "120000.00" } },
        ],
      },
      {
        slug: "historial",
        name: "Historial",
        fields: [
          { slug: "activo", name: "Activo", type: "link", linkTable: "activos" },
          { slug: "fecha", name: "Fecha", type: "date" },
          { slug: "evento", name: "Evento", type: "dropdown", choices: ["Compra", "Asignación", "Traslado", "Mantenimiento", "Reparación", "Baja"] },
          { slug: "descripcion", name: "Descripción", type: "text" },
          { slug: "costo", name: "Costo", type: "decimal", decimals: 2 },
          { slug: "notas", name: "Notas", type: "memo" },
        ],
        records: [
          { values: { activo: "lap001", fecha: "2025-08-10", evento: "Compra", descripcion: "Adquisición inicial", costo: "4500.00", notas: "" } },
          { values: { activo: "lap001", fecha: "2025-08-12", evento: "Asignación", descripcion: "Asignada a Gerencia", costo: "0", notas: "" } },
          { values: { activo: "veh001", fecha: "2024-01-15", evento: "Compra", descripcion: "Concesionario Toyota", costo: "120000.00", notas: "" } },
          { values: { activo: "veh001", fecha: "2026-03-20", evento: "Mantenimiento", descripcion: "Cambio aceite y filtros", costo: "350.00", notas: "" } },
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
