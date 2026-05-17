import Link from "next/link";

export const metadata = {
  title: "Manual de Usuario — EasyDB",
  description: "Guía paso a paso para usar EasyDB",
};

// ---------- Mock components (replican la UI real con datos de ejemplo) ----------

function Frame({ title, children }) {
  return (
    <div className="my-6 border border-gray-300 rounded-lg overflow-hidden shadow-md">
      <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 text-xs text-gray-500 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <span className="ml-3 font-mono">{title}</span>
      </div>
      <div className="bg-white">
        <div className="bg-blue-600 text-white px-4 py-3 text-lg font-bold">EasyDB</div>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

function LoginMock() {
  return (
    <Frame title="https://easydb.openlinks.app/login">
      <div className="flex flex-col items-center justify-center py-8">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <h1 className="text-3xl font-bold mb-2">EasyDB</h1>
          <p className="text-gray-600 mb-8">Crea bases de datos sin saber programar.</p>
          <button className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg px-4 py-3 font-medium shadow-sm">
            <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.5 39.5 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.2 5.2C40.9 35.6 44 30.3 44 24c0-1.3-.1-2.3-.4-3.5z" />
            </svg>
            Iniciar sesión con Google
          </button>
        </div>
      </div>
    </Frame>
  );
}

function DatabasesMock() {
  const items = [
    { name: "Gastos" },
    { name: "Ventas" },
    { name: "Clientes" },
  ];
  return (
    <Frame title="https://easydb.openlinks.app/">
      <h2 className="text-2xl font-bold mb-6">Mis Bases de Datos</h2>
      <div className="flex gap-3 mb-8">
        <input type="text" placeholder="Nombre de la nueva base de datos" className="flex-1 border border-gray-300 rounded-lg px-4 py-2" readOnly />
        <button className="bg-blue-600 text-white px-6 py-2 rounded-lg">Crear</button>
      </div>
      <div className="grid gap-4">
        {items.map((db) => (
          <div key={db.name} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
            <span className="text-lg font-medium text-blue-600">{db.name}</span>
            <div className="flex gap-1">
              <span className="text-gray-500 p-2">✏️</span>
              <span className="text-gray-500 p-2">🗑️</span>
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

function TableEditorMock() {
  return (
    <Frame title="Editar tabla: Gastos">
      <h2 className="text-xl font-bold mb-4">Editar Tabla</h2>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Nombre de la tabla</label>
        <input className="w-full border border-gray-300 rounded px-3 py-2" value="Gastos" readOnly />
      </div>
      <label className="block text-sm font-medium mb-2">Campos</label>
      <div className="space-y-2">
        {[
          { name: "fecha", type: "Fecha", extra: "" },
          { name: "concepto", type: "Texto", extra: "" },
          { name: "monto", type: "Decimal", extra: "Dec: 2" },
          { name: "categoria", type: "Desplegable", extra: "Comida, Transporte, Servicios..." },
          { name: "pagado", type: "Sí/No", extra: "" },
          { name: "comprobante", type: "Imagen", extra: "" },
        ].map((f, i, arr) => (
          <div key={f.name} className="flex flex-wrap gap-2 items-center">
            <input className="flex-1 min-w-[140px] border border-gray-300 rounded px-3 py-2 text-sm" value={f.name} readOnly />
            <select className="border border-gray-300 rounded px-3 py-2 text-sm">
              <option>{f.type}</option>
            </select>
            {f.extra && <input className="border border-gray-300 rounded px-3 py-2 text-sm" value={f.extra} readOnly />}
            <div className="flex items-center gap-0.5 ml-auto text-gray-700 font-bold text-xl">
              <button className={`px-2.5 py-1 rounded ${i === 0 ? "opacity-30" : ""}`}>↑</button>
              <button className={`px-2.5 py-1 rounded ${i === arr.length - 1 ? "opacity-30" : ""}`}>↓</button>
              <button className="text-red-600 px-2.5 py-1 rounded">×</button>
            </div>
          </div>
        ))}
      </div>
      <button className="text-blue-600 text-sm mt-3">+ Agregar campo</button>
      <div className="flex gap-3 mt-5">
        <button className="bg-green-600 text-white px-6 py-2 rounded-lg">Guardar cambios</button>
        <button className="text-gray-500 px-4 py-2">Cancelar</button>
      </div>
    </Frame>
  );
}

function GridMock() {
  const rows = [
    { fecha: "2026-05-15", concepto: "Almuerzo restaurante", monto: 45.00, categoria: "Comida", pagado: true },
    { fecha: "2026-05-15", concepto: "Uber al trabajo", monto: 12.50, categoria: "Transporte", pagado: true },
    { fecha: "2026-05-14", concepto: "Recibo de luz", monto: 87.30, categoria: "Servicios", pagado: false },
    { fecha: "2026-05-14", concepto: "Café con cliente", monto: 8.50, categoria: "Comida", pagado: true },
    { fecha: "2026-05-13", concepto: "Internet del mes", monto: 65.00, categoria: "Servicios", pagado: true },
  ];
  const total = rows.reduce((a, b) => a + b.monto, 0);
  return (
    <Frame title="Gastos — Datos">
      <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Gastos</h1>
        <div className="flex gap-2">
          <button className="bg-green-700 text-white px-4 py-2 rounded-lg">📥 Exportar</button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">Nuevo Registro</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 items-center mb-3">
        <input type="text" placeholder="🔍 Buscar..." className="border border-gray-300 rounded px-3 py-2 text-sm w-64" readOnly />
        <label className="text-sm text-gray-600 flex items-center gap-2">
          Agrupar por:
          <select className="border border-gray-300 rounded px-2 py-1 text-sm">
            <option>fecha</option>
          </select>
        </label>
        <label className="text-sm text-gray-600 flex items-center gap-2">
          Por:
          <select className="border border-gray-300 rounded px-2 py-1 text-sm">
            <option>Día</option>
          </select>
        </label>
        <label className="text-sm text-gray-600 flex items-center gap-2 ml-auto">
          Por página:
          <select className="border border-gray-300 rounded px-2 py-1 text-sm">
            <option>25</option>
          </select>
        </label>
      </div>
      <div className="border border-gray-200 rounded overflow-x-auto">
        <table className="border-collapse text-sm w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-200 px-3 py-2 text-left">#</th>
              <th className="border border-gray-200 px-3 py-2 text-left">fecha</th>
              <th className="border border-gray-200 px-3 py-2 text-left">concepto</th>
              <th className="border border-gray-200 px-3 py-2 text-left">monto</th>
              <th className="border border-gray-200 px-3 py-2 text-left">categoria</th>
              <th className="border border-gray-200 px-3 py-2 text-left">pagado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="border border-gray-200 px-3 py-2 text-gray-500">{i + 1}</td>
                <td className="border border-gray-200 px-3 py-2">{r.fecha}</td>
                <td className="border border-gray-200 px-3 py-2">{r.concepto}</td>
                <td className="border border-gray-200 px-3 py-2 text-right font-mono">{r.monto.toFixed(2)}</td>
                <td className="border border-gray-200 px-3 py-2">{r.categoria}</td>
                <td className="border border-gray-200 px-3 py-2">{r.pagado ? "✓" : "—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-blue-100 font-bold">
              <td className="border border-gray-200 px-3 py-2">Σ</td>
              <td className="border border-gray-200 px-3 py-2"></td>
              <td className="border border-gray-200 px-3 py-2"></td>
              <td className="border border-gray-200 px-3 py-2 text-right font-mono text-blue-800">{total.toFixed(2)}</td>
              <td className="border border-gray-200 px-3 py-2"></td>
              <td className="border border-gray-200 px-3 py-2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex items-center justify-between mt-3 text-sm">
        <span className="text-gray-600">Mostrando 1-5 de 5 registros</span>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 border border-gray-300 rounded opacity-40">◄ Anterior</button>
          <span className="text-gray-600">Página 1 de 1</span>
          <button className="px-3 py-1 border border-gray-300 rounded opacity-40">Siguiente ►</button>
        </div>
      </div>
    </Frame>
  );
}

function MasterDetailMock() {
  const items = [
    { producto: "Laptop HP", cantidad: 1, precio: 3500.00, subtotal: 3500.00 },
    { producto: "Mouse Logitech", cantidad: 2, precio: 50.00, subtotal: 100.00 },
    { producto: "Teclado Mecánico", cantidad: 1, precio: 120.00, subtotal: 120.00 },
  ];
  const total = items.reduce((a, b) => a + b.subtotal, 0);
  return (
    <Frame title="Editar Factura F-001">
      <h2 className="font-semibold text-lg mb-4">Editar Registro</h2>
      <div className="space-y-3 max-w-md">
        <div>
          <label className="block text-sm font-medium mb-1">numero</label>
          <input className="w-full border border-gray-300 rounded px-3 py-2 text-sm" value="F-001" readOnly />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">fecha</label>
          <input className="w-full border border-gray-300 rounded px-3 py-2 text-sm" value="2026-05-16" readOnly />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">cliente</label>
          <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm"><option>Juan Pérez | jperez@email.com</option></select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">total (calculado)</label>
          <div className="bg-gray-100 border border-gray-300 rounded px-3 py-2 text-sm font-mono text-right text-gray-700">
            {total.toFixed(2)} <span className="text-xs text-gray-400 ml-2 font-sans">(calculado)</span>
          </div>
        </div>
      </div>
      <div className="flex gap-3 mt-4">
        <button className="bg-green-600 text-white px-6 py-2 rounded-lg">Guardar</button>
        <button className="text-gray-500 px-4 py-2">Cancelar</button>
      </div>

      <div className="mt-6 border border-gray-200 rounded-lg p-6 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">items <span className="text-gray-400 font-normal">({items.length})</span></h3>
          <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm">+ Nuevo item</button>
        </div>
        <div className="overflow-x-auto border border-gray-200 rounded bg-white">
          <table className="text-sm border-collapse w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-200 px-2 py-1 text-left w-10">#</th>
                <th className="border border-gray-200 px-2 py-1 text-left">producto</th>
                <th className="border border-gray-200 px-2 py-1 text-left">cantidad</th>
                <th className="border border-gray-200 px-2 py-1 text-left">precio</th>
                <th className="border border-gray-200 px-2 py-1 text-left">subtotal</th>
                <th className="border border-gray-200 px-2 py-1 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td className="border border-gray-200 px-2 py-1 text-gray-500">{i + 1}</td>
                  <td className="border border-gray-200 px-2 py-1">{it.producto}</td>
                  <td className="border border-gray-200 px-2 py-1 text-right font-mono">{it.cantidad.toFixed(2)}</td>
                  <td className="border border-gray-200 px-2 py-1 text-right font-mono">{it.precio.toFixed(2)}</td>
                  <td className="border border-gray-200 px-2 py-1 text-right font-mono">{it.subtotal.toFixed(2)}</td>
                  <td className="border border-gray-200 px-1 py-1 text-center text-gray-500">✏️ 🗑️</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-blue-50 font-bold">
                <td className="border border-gray-200 px-2 py-1">Σ</td>
                <td className="border border-gray-200 px-2 py-1"></td>
                <td className="border border-gray-200 px-2 py-1 text-right font-mono text-blue-700">{items.reduce((a, b) => a + b.cantidad, 0).toFixed(2)}</td>
                <td className="border border-gray-200 px-2 py-1"></td>
                <td className="border border-gray-200 px-2 py-1 text-right font-mono text-blue-700">{total.toFixed(2)}</td>
                <td className="border border-gray-200 px-2 py-1"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </Frame>
  );
}

function ImageMock() {
  return (
    <Frame title="Editar Registro — campo imagen">
      <label className="block text-sm font-medium mb-1">comprobante</label>
      <div className="flex items-start gap-3">
        <div className="w-[100px] h-[100px] border border-gray-300 rounded bg-gradient-to-br from-blue-200 to-purple-200 flex items-center justify-center overflow-hidden shrink-0">
          <span className="text-3xl">🧾</span>
        </div>
        <div className="flex flex-col gap-2 items-start">
          <div className="flex gap-2 flex-wrap">
            <button className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded">🖼️ Galería</button>
            <button className="text-sm bg-gray-200 text-gray-800 px-3 py-1.5 rounded">📁 Archivos</button>
          </div>
          <div className="flex gap-2">
            <span className="text-xs bg-green-100 text-green-800 border border-green-300 rounded px-2 py-1">⬇ Descargar</span>
            <span className="text-xs text-red-600">Quitar</span>
          </div>
          <span className="text-xs text-gray-400">Se reduce automáticamente para que pese ≤ 2 MB</span>
        </div>
      </div>
    </Frame>
  );
}

function SelectedRowMock() {
  const rows = [
    { fecha: "2026-05-15", concepto: "Almuerzo restaurante", monto: 45.00 },
    { fecha: "2026-05-15", concepto: "Uber al trabajo", monto: 12.50, selected: true },
    { fecha: "2026-05-14", concepto: "Recibo de luz", monto: 87.30 },
  ];
  return (
    <Frame title="Gastos — Fila seleccionada">
      <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Gastos</h1>
        <div className="flex gap-2 items-center">
          <button className="flex items-center gap-1 bg-blue-100 text-blue-700 border border-blue-300 px-3 py-2 rounded-lg text-sm">✏️ Editar</button>
          <button className="flex items-center gap-1 bg-red-100 text-red-700 border border-red-300 px-3 py-2 rounded-lg text-sm">🗑️ Eliminar</button>
          <button className="text-gray-500 px-2 py-2 text-sm">×</button>
          <span className="w-px h-6 bg-gray-300 mx-1" />
          <button className="bg-green-700 text-white px-4 py-2 rounded-lg">📥 Exportar</button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">Nuevo</button>
        </div>
      </div>
      <div className="border border-gray-200 rounded overflow-x-auto">
        <table className="border-collapse text-sm w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-200 px-3 py-2 text-left">#</th>
              <th className="border border-gray-200 px-3 py-2 text-left">fecha</th>
              <th className="border border-gray-200 px-3 py-2 text-left">concepto</th>
              <th className="border border-gray-200 px-3 py-2 text-left">monto</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={r.selected ? "bg-blue-100" : ""}>
                <td className={`border border-gray-200 px-3 py-2 ${r.selected ? "text-blue-700 font-semibold" : "text-gray-500"}`}>{i + 1}</td>
                <td className="border border-gray-200 px-3 py-2">{r.fecha}</td>
                <td className="border border-gray-200 px-3 py-2">{r.concepto}</td>
                <td className="border border-gray-200 px-3 py-2 text-right font-mono">{r.monto.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500 mt-2">↑ Toca cualquier fila para seleccionarla. Los iconos de editar y eliminar aparecen en la barra superior.</p>
    </Frame>
  );
}

// ---------- Layout helpers ----------

function Section({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-20 mt-12">
      <h2 className="text-2xl font-bold border-b border-gray-300 pb-2 mb-4">{title}</h2>
      <div className="prose-content space-y-3 text-gray-800">{children}</div>
    </section>
  );
}

function Toc() {
  const items = [
    ["intro", "1. ¿Qué es EasyDB?"],
    ["login", "2. Iniciar sesión"],
    ["primera-base", "3. Tu primera base de datos"],
    ["crear-tabla", "4. Crear una tabla"],
    ["tipos-campo", "5. Tipos de campos"],
    ["registros", "6. Trabajar con registros"],
    ["buscar", "7. Buscar, agrupar, ordenar"],
    ["exportar", "8. Exportar a Excel"],
    ["imagenes", "9. Imágenes"],
    ["master-detail", "10. Detalles (sub-grillas)"],
    ["formula", "11. Fórmulas y agregaciones"],
    ["reordenar", "12. Modificar la estructura"],
    ["tips", "13. Tips"],
  ];
  return (
    <nav className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h3 className="font-semibold mb-2 text-gray-700">Contenido</h3>
      <ul className="space-y-1 text-sm">
        {items.map(([id, label]) => (
          <li key={id}>
            <a href={`#${id}`} className="text-blue-600 hover:underline">{label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ---------- Main page ----------

export default function ManualPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex flex-wrap gap-3 items-center justify-between">
        <Link href="/" className="text-blue-600 hover:underline text-sm">&larr; Volver al inicio</Link>
        <a
          href="https://easydb.openlinks.app"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
        >
          Ir a la app →
        </a>
      </div>

      <h1 className="text-4xl font-bold mb-2">Manual de Usuario</h1>
      <p className="text-gray-600 mb-6">
        EasyDB es una aplicación web para que cualquier persona pueda <strong>crear sus propias bases de datos sin saber programar</strong>.
      </p>

      <Toc />

      <Section id="intro" title="1. ¿Qué es EasyDB?">
        <p>
          Imagina que necesitas registrar tus <strong>gastos personales</strong>, una <strong>lista de clientes</strong>,
          el <strong>inventario</strong> de tu negocio o las <strong>tareas pendientes</strong> de un proyecto.
          Normalmente terminas en una hoja de cálculo de Excel que se vuelve un caos con el tiempo.
        </p>
        <p>
          EasyDB te deja crear bases de datos reales: defines qué información quieres guardar
          (texto, números, fechas, imágenes, etc.), agregas registros, los buscas, los agrupas y los exportas
          a Excel cuando quieras — todo desde tu navegador, incluido el celular.
        </p>
      </Section>

      <Section id="login" title="2. Iniciar sesión">
        <p>Cada usuario tiene su propio espacio privado.</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Entra a <a href="https://easydb.openlinks.app" className="text-blue-600 hover:underline">https://easydb.openlinks.app</a></li>
          <li>Click en <strong>"Iniciar sesión con Google"</strong></li>
          <li>Elige tu cuenta de Google y autoriza el acceso</li>
        </ol>
        <LoginMock />
        <p>
          En la barra superior aparece tu avatar + nombre y un botón <strong>Salir</strong>.
          Solo tú ves tus bases de datos.
        </p>
      </Section>

      <Section id="primera-base" title="3. Tu primera base de datos">
        <p>En la página principal escribes un nombre y haces click en <strong>Crear</strong>.</p>
        <DatabasesMock />
        <p>
          Cada base puede contener varias tablas. Por ejemplo, una base <code>Negocio</code> puede tener tablas
          como <code>Clientes</code>, <code>Productos</code>, <code>Ventas</code>.
        </p>
      </Section>

      <Section id="crear-tabla" title="4. Crear una tabla">
        <p>Entra a tu base de datos y click en <strong>Nueva Tabla</strong>. Define el nombre y los campos.</p>
        <TableEditorMock />
        <p>
          Cada campo tiene un <strong>tipo</strong> que determina cómo se ingresa y se muestra (ver siguiente sección).
          Puedes agregar más campos con <strong>+ Agregar campo</strong>, reordenarlos con <strong>↑ ↓</strong> y
          eliminarlos con <strong>×</strong>.
        </p>
      </Section>

      <Section id="tipos-campo" title="5. Tipos de campos disponibles">
        <p>Hay 12 tipos. Estos son los más usados:</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left">Tipo</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Para qué sirve</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Ejemplo</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Texto", "Una línea de texto", "nombre, código, email"],
                ["Memo", "Texto largo (3 líneas)", "descripción, notas"],
                ["Número", "Cantidad entera o decimal", "año, cantidad"],
                ["Decimal", "Número con decimales fijos. Se totaliza automáticamente", "precio, monto"],
                ["Sí/No", "Casilla de verificación", "pagado, activo"],
                ["Fecha", "Selector de calendario", "fecha_emisión"],
                ["Desplegable", "Lista cerrada de opciones", "estado = Pendiente/Pagado"],
                ["Imagen", "Foto desde cámara o galería", "comprobante, foto_producto"],
                ["Enlace", "Referencia a registro de otra tabla", "cliente → tabla Clientes"],
                ["Detalle (sub-grilla)", "Lista de items hijos", "factura tiene varios items"],
                ["Fórmula (=)", "Cálculo con otros campos", "subtotal = [cantidad] * [precio]"],
                ["Agregación", "Suma/promedio desde un detalle", "total = SUM de subtotal"],
              ].map(([t, p, e]) => (
                <tr key={t}>
                  <td className="border border-gray-300 px-3 py-2 font-medium">{t}</td>
                  <td className="border border-gray-300 px-3 py-2">{p}</td>
                  <td className="border border-gray-300 px-3 py-2 text-gray-600 italic">{e}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="registros" title="6. Trabajar con registros">
        <p>Una vez creada la tabla, haces click en su nombre y empiezas a agregar registros.</p>
        <GridMock />
        <p>
          Para <strong>editar o eliminar</strong>: toca cualquier fila para seleccionarla. Los botones aparecen
          en la barra superior.
        </p>
        <SelectedRowMock />
      </Section>

      <Section id="buscar" title="7. Buscar, agrupar y ordenar">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>🔍 Buscador</strong>: filtra en todos los campos (no distingue mayúsculas).
          </li>
          <li>
            <strong>Agrupar por</strong>: organiza los registros por una columna. Cada grupo muestra su subtotal.
            Para fechas puedes elegir Día / Mes / Año y un rango Del / Al.
          </li>
          <li>
            <strong>Ordenar</strong>: click en el título de la columna (1er click ascendente ▲, 2do descendente ▼,
            3ro quita el orden).
          </li>
          <li>
            <strong>Paginación</strong>: al pie de la tabla, 10/25/50/100 por página.
          </li>
          <li>
            <strong>Σ Totales</strong>: las columnas numéricas se suman automáticamente al pie.
          </li>
        </ul>
      </Section>

      <Section id="exportar" title="8. Exportar a Excel">
        <p>
          Click en <strong>📥 Exportar</strong> arriba a la derecha. Descarga un archivo <code>.csv</code> con
          los registros que están filtrados/buscados actualmente.
        </p>
        <p>
          Formato Excel-friendly: codificación UTF-8 con BOM, separador <code>;</code>, números sin formateo
          para que Excel los reconozca como numéricos.
        </p>
      </Section>

      <Section id="imagenes" title="9. Imágenes">
        <p>Los campos tipo <strong>Imagen</strong> dejan subir fotos desde el celular o la PC.</p>
        <ImageMock />
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>🖼️ Galería</strong>: Google Photos / álbumes</li>
          <li><strong>📁 Archivos</strong>: explorador (incluye cámara, capturas y descargas)</li>
          <li>Cualquier tamaño hasta 25 MB se <strong>reduce automáticamente</strong> a ≤ 2 MB en el servidor</li>
          <li>Click sobre la imagen → se abre en pantalla completa con zoom</li>
          <li><strong>⬇ Descargar</strong>: baja la imagen optimizada</li>
        </ul>
      </Section>

      <Section id="master-detail" title="10. Detalles (sub-grillas)">
        <p>
          Para casos como <strong>Factura → Items</strong>: una factura tiene varios items. Esto se llama
          una relación <em>master-detail</em>.
        </p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Crea primero la tabla hijo (ej: <code>FacturaItem</code>) con sus campos</li>
          <li>En la tabla padre (<code>Factura</code>), agrega un campo tipo <strong>Detalle (sub-grilla)</strong></li>
          <li>Elige la tabla hijo. Si falta el campo de enlace de regreso, click <strong>⚡ Crear enlace automático</strong></li>
        </ol>
        <p>Cuando editas una factura, debajo del formulario ves la sub-grilla:</p>
        <MasterDetailMock />
      </Section>

      <Section id="formula" title="11. Fórmulas y agregaciones">
        <h3 className="text-lg font-semibold">Fórmula — calculada por fila</h3>
        <p>
          Sintaxis: <code>[nombre_campo]</code> + operadores <code>+ - * / ( )</code>.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><code>[cantidad] * [precio]</code></li>
          <li><code>[base] * 1.18</code> (agregar IGV)</li>
          <li><code>[bruto] - [descuento]</code></li>
        </ul>
        <h3 className="text-lg font-semibold mt-4">Agregación — desde una sub-grilla</h3>
        <p>
          Suma valores desde una sub-grilla. Configuras: <strong>cuál detalle</strong>, <strong>operación</strong>
          (SUM, AVG, MIN, MAX, COUNT) y <strong>qué campo</strong> del detalle.
        </p>
        <p>
          Ejemplo clásico: en <code>Factura</code>, un campo <code>total</code> = <strong>SUM</strong> del
          <code> subtotal</code> desde <code>items</code>. Se ve en el formulario y en el grid principal.
        </p>
      </Section>

      <Section id="reordenar" title="12. Modificar la estructura">
        <p>
          En cualquier momento puedes cambiar la estructura de una tabla. Click en el lápiz (✏️) al lado de la tabla.
        </p>
        <p>Cada campo tiene 3 botones a la derecha:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>↑</strong> mover hacia arriba</li>
          <li><strong>↓</strong> mover hacia abajo</li>
          <li><strong>×</strong> eliminar (los valores de esa columna se borran en todos los registros)</li>
        </ul>
        <p>
          También puedes renombrar el campo (sin perder datos), cambiar el tipo, ajustar decimales/opciones,
          o cambiar el ancho de columna.
        </p>
      </Section>

      <Section id="tips" title="13. Tips finales">
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Una factura con varios items</strong>: usa Detalle + Agregación.</li>
          <li><strong>Sumar gastos del mes</strong>: agrupar por fecha → Mes. El subtotal del mes y el total general aparecen automáticamente.</li>
          <li><strong>El buscador es tu amigo</strong>: si tienes muchos registros, buscar es más rápido que paginar.</li>
          <li><strong>Mobile-friendly</strong>: la app funciona en celular. Selecciona una fila para mostrar editar/eliminar.</li>
          <li><strong>Tus datos son privados</strong>: solo tú ves tus bases (autenticación con Google).</li>
        </ul>
      </Section>

      <div className="mt-12 mb-8 text-center">
        <a
          href="https://easydb.openlinks.app"
          className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-medium text-lg"
        >
          Empezar ahora →
        </a>
      </div>
    </div>
  );
}
