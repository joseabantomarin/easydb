# Manual de Usuario — EasyDB

EasyDB es una aplicación web para que cualquier persona pueda **crear sus propias bases de datos sin saber programar**. Defines tus tablas, eliges qué campos tiene cada una (texto, número, fecha, sí/no, imagen, etc.) y empiezas a registrar.

> **URL de acceso:** https://easydb.openlinks.app
> **Manual online (con capturas):** https://easydb.openlinks.app/manual

---

## 1. ¿Qué es EasyDB?

Imagina que necesitas registrar tus **gastos personales**, una **lista de clientes**, el **inventario** de tu negocio o las **tareas pendientes** de un proyecto. Normalmente terminas en una hoja de cálculo de Excel que se vuelve un caos con el tiempo.

EasyDB te deja crear bases de datos reales: defines qué información quieres guardar, agregas registros, los buscas, los agrupas y los exportas a Excel — todo desde tu navegador, incluido el celular.

---

## 2. Iniciar sesión

Cada usuario tiene su propio espacio privado.

1. Abre el navegador y entra a https://easydb.openlinks.app
2. Si no estás autenticado, te redirige a la pantalla de login.
3. Click en **"Iniciar sesión con Google"**.
4. Elige tu cuenta y autoriza.
5. Vuelves a EasyDB ya con tu sesión iniciada.

> 📷 **Captura 1**: pantalla de login con el botón de Google.

En la barra superior aparece tu **avatar + nombre** y un botón **Salir**. Solo tú ves tus bases de datos; ningún otro usuario tiene acceso.

---

## 3. Tu primera base de datos

En la página principal verás "Mis Bases de Datos" y arriba a la derecha un botón **📖 Cómo usarlo** (link a este manual).

1. Escribe el nombre de tu nueva base (ej: `Gastos`, `Ventas`, `Clientes`).
2. Click en **Crear**.

La base aparece en la lista. Cada base puede contener varias tablas dentro.

> 📷 **Captura 2**: lista de bases de datos.

**Editar nombre**: icono del lápiz (✏️) al lado de la base.
**Eliminar base**: icono del tacho (🗑️). Cuidado: borra todas las tablas y registros que contiene.

---

## 4. Crear una tabla

Click en el nombre de tu base de datos para entrar.

1. Click en **Nueva Tabla** arriba a la derecha.
2. Pon el nombre de la tabla (ej: `Movimientos`, `Productos`).
3. Define los campos uno a uno. Cada fila tiene:
   - **Nombre del campo** (ej: `descripcion`, `monto`)
   - **Tipo de campo** (ver tabla más abajo)
   - **Configuración extra** según el tipo (decimales, opciones, fórmula, etc.)
   - **Ancho** opcional (en píxeles, deja vacío para usar el default)
   - Botones **↑ ↓ ×** a la derecha (mover/eliminar)
4. Click **+ Agregar campo** para añadir más.
5. Click **Crear Tabla** cuando hayas terminado.

> 📷 **Captura 3**: formulario "Nueva Tabla" con varios campos.

---

## 5. Tipos de campos disponibles

| Tipo | Para qué sirve | Ejemplo |
|------|---------------|---------|
| **Texto** | Una sola línea de texto | `nombre`, `código`, `email` |
| **Memo** | Texto largo (3 líneas, soporta saltos) | `descripción`, `notas` |
| **Número** | Cantidad entera o decimal sin formato | `año`, `cantidad` |
| **Decimal** | Número con decimales fijos. Se totaliza automáticamente | `precio`, `monto` |
| **Sí/No** | Casilla de verificación | `pagado`, `activo` |
| **Fecha** | Selector de calendario | `fecha_emisión` |
| **Desplegable** | Lista cerrada de opciones | `estado` = Pendiente / Pagado |
| **Imagen** | Foto que se sube desde galería o explorador | `comprobante`, `foto_producto` |
| **Enlace** | Referencia a un registro de otra tabla | `cliente` → tabla Clientes |
| **Detalle (sub-grilla)** | Lista de items hijos | factura tiene varios items |
| **Fórmula (=)** | Cálculo automático con otros campos | `subtotal = [cantidad] * [precio]` |
| **Agregación** | SUM/AVG/MIN/MAX/COUNT desde un detalle | `total = SUM de subtotal` |

### 5.1 Decimal — configurar decimales
Al elegir tipo **Decimal**, aparece un campito al lado para los **decimales** del display (default 2). Las columnas decimal se **suman automáticamente** al pie del grid (fila azul Σ).

### 5.2 Desplegable — definir opciones
Escribe las opciones **separadas por coma**. Ejemplo: `Activo, Inactivo, Suspendido`.

### 5.3 Enlace — relacionar dos tablas
Eliges la tabla destino. En el formulario de registros ese campo se vuelve un desplegable con los registros de la otra tabla. Por defecto muestra los dos primeros campos separados por `|` (ej: `001 | Juan Pérez`).

### 5.4 Detalle — sub-grilla (master-detail)
Para casos como **Factura → Items**:

1. Crea primero la tabla hijo (ej: `FacturaItem`) — sin pensar en el enlace.
2. En la tabla padre (`Factura`), agrega un campo tipo **Detalle (sub-grilla)** y elige la tabla hijo.
3. Si la tabla hijo no tenía un campo enlace de regreso, aparece el botón **⚡ Crear enlace automático** — un click y EasyDB crea el campo de relación por ti.

Cuando edites una factura, debajo del formulario verás la sub-grilla de items con sus propios botones para agregar/editar/eliminar y un total al pie.

> 📷 **Captura 4**: edición de factura con su sub-grilla de items.

### 5.5 Fórmula — campo calculado por fila
Sintaxis: `[nombre_campo]` y operadores `+ - * / ( )`.

Ejemplos:
- `[cantidad] * [precio]`
- `[base] * 1.18` (agregar IGV)
- `[bruto] - [descuento]`

Pones también cuántos decimales mostrar. Aparece como `(calculado)` en el formulario y con el resultado en el grid.

### 5.6 Agregación — totales desde un detalle
Configuras:
- **Detalle**: cuál sub-grilla del padre
- **Operación**: SUM, AVG, MIN, MAX o COUNT
- **Campo hijo**: qué columna del detalle aplicar
- **Decimales**

Ejemplo clásico: en `Factura` un campo `total` = **SUM** del campo `subtotal` desde `items`. Aparece en el formulario y en el grid principal automáticamente.

---

## 6. Trabajar con registros

Entra a una tabla (click en su nombre) para ver/agregar registros.

### 6.1 Crear registro
Click en **Nuevo Registro**. Llena los campos. Click **Crear**.

### 6.2 Seleccionar, editar o eliminar
- **Toca cualquier fila** para seleccionarla (queda con fondo azul claro)
- En la **barra superior** aparecen los botones **✏️ Editar** y **🗑️ Eliminar**
- En desktop muestran texto, en mobile solo iconos para ahorrar espacio
- Click sobre la misma fila → deselecciona
- Botón **×** al lado quita la selección

> 📷 **Captura 5**: tabla con una fila seleccionada y los botones en la barra superior.

> ✨ Esta UI ahorra el espacio horizontal que antes ocupaba una columna fija de acciones — útil en mobile y cuando hay muchas columnas.

---

## 7. Buscar, filtrar, agrupar y ordenar

Sobre el grid hay una barra de herramientas:

### 7.1 Buscador 🔍
Busca en todos los campos visibles (no solo texto: también números, fechas formateadas, valores de enlaces, etc.). No distingue mayúsculas, busca por coincidencia parcial.

### 7.2 Agrupar por
Selecciona una columna. Cada grupo muestra un encabezado y un **subtotal** para las columnas numéricas (decimal, fórmula, agregación).

### 7.3 Si agrupas por fecha
Aparecen dos controles más:
- **Por**: Día / Mes / Año (granularidad)
- **Del / Al**: dos calendarios para filtrar por rango de fechas

### 7.4 Ordenar por columna
Click sobre el **título** de cualquier columna:
- 1er click: ascendente ▲
- 2do click: descendente ▼
- 3er click: quita el orden

La columna activa se resalta en azul.

> 📷 **Captura 6**: toolbar con buscador, agrupación por fecha (Mes) y rango Del/Al.

### 7.5 Paginación
Al pie del grid: número de página, botones Anterior / Siguiente y selector de 10/25/50/100.

### 7.6 Totales Σ
Si hay columnas decimal/fórmula/agregación, aparece una fila azul al pie con **la suma total** (de todos los registros filtrados, no solo la página actual).

---

## 8. Exportar a Excel

Click en **📥 Exportar** (a la izquierda de "Nuevo Registro").

Se descarga un archivo **.csv** con:
- Solo los registros que están filtrados/buscados actualmente
- Codificación UTF-8 con BOM (acentos y ñ correctos)
- Separador `;` (estándar Excel español/latinoamericano)
- Números en formato crudo para que Excel los reconozca como tal
- Fechas en formato ISO

Abre el archivo en Excel haciendo doble click.

---

## 9. Trabajar con imágenes

Al editar un registro con campo tipo **Imagen**, ves un recuadro 100x100 y dos botones:
- **🖼️ Galería**: abre tu galería de fotos (en mobile: Google Photos)
- **📁 Archivos**: abre el explorador del dispositivo. **Recomendado en mobile** porque incluye Cámara, capturas locales, descargas, etc. — Google Photos a veces no muestra capturas recién tomadas hasta que sincronizan

Cualquier imagen hasta **25 MB** se acepta; el sistema **la reduce automáticamente a ≤ 2 MB** preservando la rotación EXIF y la proporción.

Botones extra:
- **⬇ Descargar**: baja la imagen optimizada
- **Quitar**: borra la imagen del registro

### 9.1 Ver imagen en grande
**Click sobre la imagen** (preview en el form o thumbnail en el grid) la abre en **pantalla completa** con su tamaño nativo. Click fuera o tecla ESC para cerrar. En mobile usa pinch-to-zoom para acercar. El overlay también tiene su propio botón **⬇ Descargar**.

> 📷 **Captura 7**: campo imagen con preview y botones Galería/Archivos.
> 📷 **Captura 8**: lightbox abierto.

---

## 10. Reordenar y modificar campos

En cualquier momento puedes cambiar la estructura de la tabla:

1. En la lista de tablas, click en el icono ✏️ al lado de la tabla.
2. Cada campo tiene a la derecha **3 botones grandes**:
   - **↑** mover hacia arriba
   - **↓** bajar
   - **×** eliminar
3. Cambiar:
   - **Nombre** (sin perder datos)
   - **Tipo** (cuidado: si era texto y pasa a número, los valores pueden quedar vacíos)
   - **Decimales / opciones / fórmula / agregación**
   - **Ancho de columna**
4. Click **Guardar cambios**.

> ⚠ **Importante**: si eliminas una columna, se pierden los valores de esa columna en todos los registros. El resto queda intacto.

> 📷 **Captura 9**: editor de tabla con flechas ↑ ↓ × a la derecha.

---

## 11. Atajos y tips

- **Una factura con varios items**: usa el patrón Detalle + Agregación (secciones 5.4 y 5.6).
- **Sumar gastos del mes**: agrupar por fecha → Mes. El subtotal del mes y el total general aparecen automáticamente.
- **El buscador es tu amigo**: si tienes muchos registros, buscar es más rápido que paginar.
- **Mobile-friendly**: la app funciona en celular. Toca una fila para revelar las acciones en la barra superior.
- **Tus datos son privados**: solo tú ves tus bases (autenticación con Google + aislamiento por usuario).
- **El manual online** (https://easydb.openlinks.app/manual) tiene mockups en vivo de cada pantalla.

---

## Convertir este manual a Word

Este archivo está en formato Markdown (.md). Para convertirlo a Word:

**Opción A — Pandoc (una línea):**
```bash
brew install pandoc
pandoc MANUAL.md -o Manual_EasyDB.docx
```

**Opción B — Editor Markdown:**
Abre el archivo en [Typora](https://typora.io) o [Obsidian](https://obsidian.md) → Archivo → Exportar → Word.

**Opción C — VS Code:**
Instala la extensión "Markdown All in One" y exporta con "Markdown All in One: Export Document as".

**Opción D — Online:**
https://word2md.com o https://cloudconvert.com.

---

## Lista de capturas a tomar

Las tomas tú desde https://easydb.openlinks.app y pegas en cada lugar marcado **📷 Captura X**.

| # | Qué mostrar |
|---|------------|
| 1 | Pantalla de login con el botón "Iniciar sesión con Google" |
| 2 | Lista de bases de datos en la página principal |
| 3 | Formulario "Nueva Tabla" con 4-5 campos agregados |
| 4 | Edición de factura con la sub-grilla de items debajo |
| 5 | Grid con una fila seleccionada (fondo azul) y los botones Editar/Eliminar en la barra superior |
| 6 | Toolbar con búsqueda, agrupación por fecha (Mes), rango Del/Al |
| 7 | Campo Imagen con preview 100x100 y botones Galería / Archivos |
| 8 | Lightbox abierto con una imagen ampliada |
| 9 | Editor de tabla con flechas ↑ ↓ × a la derecha de cada campo |

Captura en Mac: **Cmd + Shift + 4** (selección) o **Cmd + Shift + 5**.
Windows: **Win + Shift + S**.
Mobile: botones físicos del celular.
