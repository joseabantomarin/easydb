# Manual de Usuario — EasyDB

EasyDB es una aplicación web para que cualquier persona pueda **crear sus propias bases de datos sin saber programar**. Defines tus tablas, eliges qué campos tiene cada una (texto, número, fecha, sí/no, imagen, etc.) y empiezas a registrar.

> **URL de acceso:** https://easydb.duckdns.org

---

## 1. Iniciar sesión

Cada usuario tiene su propio espacio privado. Para entrar:

1. Abre el navegador y entra a la URL de EasyDB.
2. Si no estás autenticado, te redirige a la pantalla de inicio de sesión.
3. Click en **"Iniciar sesión con Google"**.
4. Elige tu cuenta de Google y autoriza el acceso.
5. Vuelves a EasyDB ya con tu sesión iniciada.

> 📷 **Captura 1**: pantalla de login con el botón de Google.

En la barra superior aparece tu **avatar + nombre** y un botón **Salir** a la derecha. Solo tú ves tus bases de datos; ningún otro usuario tiene acceso.

---

## 2. Tu primera base de datos

En la página principal verás "Mis Bases de Datos".

1. Escribe el nombre de tu nueva base (ej: `Gastos`, `Ventas`, `Clientes`) en la barra de arriba.
2. Click en **Crear**.

La base aparece en la lista. Cada base puede tener varias tablas dentro.

> 📷 **Captura 2**: lista de bases de datos con el formulario "Nombre de la nueva base de datos".

**Editar nombre**: el icono del lápiz (✏️) al lado de la base.
**Eliminar base**: el icono del tacho (🗑️). Cuidado: borra todas las tablas y registros que contiene.

---

## 3. Crear una tabla

Click en el nombre de tu base de datos para entrar.

1. Click en **Nueva Tabla** arriba a la derecha.
2. Pon el nombre de la tabla (ej: `Movimientos`, `Productos`).
3. Define los campos uno a uno. Cada fila tiene:
   - **Nombre del campo** (ej: `descripcion`, `monto`)
   - **Tipo de campo** (ver tabla más abajo)
   - **Configuración extra** según el tipo (decimales, opciones, etc.)
   - **Ancho** opcional (en píxeles, deja vacío para usar el default)
4. Click **+ Agregar campo** para añadir más campos.
5. Click **Crear Tabla** cuando hayas terminado.

> 📷 **Captura 3**: formulario "Nueva Tabla" con varios campos agregados.

---

## 4. Tipos de campos disponibles

| Tipo | Para qué sirve | Ejemplo |
|------|---------------|---------|
| **Texto** | Una sola línea de texto | `nombre`, `código`, `email` |
| **Memo** | Texto largo (3 líneas, soporta saltos de línea) | `descripción`, `notas` |
| **Número** | Cantidad entera o decimal sin formato | `año`, `cantidad` |
| **Decimal** | Número con decimales fijos. Se totaliza automáticamente | `precio`, `monto` |
| **Sí/No** | Casilla de verificación (checkbox) | `pagado`, `activo` |
| **Fecha** | Fecha (selector de calendario) | `fecha_emisión` |
| **Desplegable** | Lista cerrada de opciones | `estado` = Pendiente / Pagado / Anulado |
| **Imagen** | Foto que se sube desde cámara o galería | `comprobante`, `foto_producto` |
| **Enlace** | Referencia a un registro de otra tabla | `cliente` → tabla Clientes |
| **Detalle (sub-grilla)** | Lista de items hijos (una factura tiene varios items) | `items` |
| **Fórmula (=)** | Cálculo automático usando otros campos | `subtotal = [cantidad] * [precio]` |
| **Agregación (SUM/AVG…)** | Suma/promedio/etc. desde un detalle | `total = SUM de subtotal en items` |

### 4.1 Decimal — configurar decimales
Cuando eliges tipo **Decimal**, aparece un campito al lado para indicar **cuántos decimales** quieres mostrar (por defecto 2). Las columnas decimal se **suman automáticamente** al pie del grid.

### 4.2 Desplegable — definir opciones
Cuando eliges tipo **Desplegable**, escribe las opciones **separadas por coma**. Ejemplo: `Activo, Inactivo, Suspendido`.

### 4.3 Enlace — relacionar dos tablas
Eliges el tipo **Enlace** y luego seleccionas a qué tabla quieres apuntar. En el formulario de registros, ese campo se vuelve un desplegable con los registros de la otra tabla. Por defecto muestra los dos primeros campos separados por `|` (ej: `001 | Juan Pérez`).

### 4.4 Detalle — sub-grilla (master-detail)
Para casos como **Factura → Items**:
1. Crea primero la tabla hijo (ej: `FacturaItem`) — sin pensar en el enlace.
2. En la tabla padre (ej: `Factura`), agrega un campo tipo **Detalle (sub-grilla)** y elige la tabla hijo.
3. Si la tabla hijo no tenía un campo enlace de regreso, aparece el botón **⚡ Crear enlace automático** — un click y EasyDB crea el campo de relación por ti.

Cuando edites una factura, debajo del formulario verás la sub-grilla de items con sus propios botones para agregar/editar/eliminar y un total al pie.

> 📷 **Captura 4**: vista del formulario de edición con su sub-grilla de items.

### 4.5 Fórmula — campo calculado por fila
Tipo **Fórmula** te permite crear un campo que se calcula con otros del mismo registro. Sintaxis: `[nombre_campo]` y operadores `+ - * / ( )`.

Ejemplos:
- `[cantidad] * [precio]`
- `[base] * 1.18`
- `[bruto] - [descuento]`

Pones también cuántos decimales mostrar. El campo aparece como `(calculado)` en el formulario y con el resultado en el grid.

### 4.6 Agregación — totales desde un detalle
Tipo **Agregación** suma valores desde una sub-grilla. Configuración:
- **Detalle**: cuál sub-grilla
- **Operación**: SUM, AVG, MIN, MAX o COUNT
- **Campo hijo**: qué columna del detalle aplicar
- **Decimales**

Ejemplo clásico: en `Factura` un campo `total` = **SUM** del campo `subtotal` desde `items`. Aparece en el formulario y en el grid principal automáticamente.

---

## 5. Trabajar con registros

Entra a una tabla (click en su nombre) para ver/agregar registros.

### 5.1 Crear registro
Click en **Nuevo Registro**. Llena los campos. Click **Crear**.

### 5.2 Editar registro
Click en el icono del lápiz (✏️) en la fila del registro.

### 5.3 Eliminar registro
Click en el icono del tacho (🗑️). Confirma.

> 📷 **Captura 5**: tabla con varios registros, mostrando los iconos editar/eliminar.

---

## 6. Buscar, filtrar, agrupar y ordenar

Sobre el grid hay una barra de herramientas:

### 6.1 Buscador 🔍
Busca en todos los campos visibles (no solo texto: también números, fechas formateadas, valores de enlaces, etc.). No distingue mayúsculas, busca por coincidencia parcial.

### 6.2 Agrupar por
Selecciona una columna para agrupar los registros. Cada grupo muestra un encabezado con el valor y un **subtotal** para las columnas decimales/fórmula/agregación.

### 6.3 Cuando agrupas por una fecha
Aparecen dos controles más:
- **Por**: Día / Mes / Año (granularidad de la agrupación)
- **Del / Al**: dos calendarios para filtrar por rango de fechas

### 6.4 Ordenar por columna
Click sobre el **título** de cualquier columna:
- 1er click: ascendente ▲
- 2do click: descendente ▼
- 3er click: quita el orden (vuelve al original)

La columna activa se resalta en azul.

> 📷 **Captura 6**: barra de herramientas con buscador, agrupación por fecha (Mes), rango Del/Al, paginación.

### 6.5 Paginación
Al pie del grid: número de página, botones Anterior / Siguiente y selector de cuántos registros por página (10, 25, 50, 100).

### 6.6 Totales Σ
Si hay columnas decimal, fórmula o agregación, aparece una fila azul al pie con **la suma total** (de todos los registros filtrados, no solo la página actual).

---

## 7. Exportar a Excel

Click en **📥 Exportar** (a la izquierda de "Nuevo Registro").

Se descarga un archivo **.csv** con:
- Solo los registros que están filtrados/buscados actualmente
- Codificación UTF-8 (con acentos y ñ correctos)
- Separador `;` (estándar Excel español/latinoamericano)
- Números en formato crudo para que Excel los reconozca como tal
- Fechas en formato ISO

Abre el archivo en Excel haciendo doble click. Si Excel pregunta cómo importarlo, elige UTF-8.

---

## 8. Trabajar con imágenes

Al editar un registro con campo tipo **Imagen**, ves un recuadro 100x100 y dos botones:
- **📷 Cámara**: abre la cámara del celular (cámara trasera por defecto)
- **🖼️ Galería**: abre tu galería / archivos

Sube cualquier foto de hasta 25 MB; el sistema **la reduce automáticamente a ≤ 2 MB** preservando la rotación EXIF y la proporción.

Botones extra:
- **⬇ Descargar**: baja la imagen optimizada
- **Quitar**: borra la imagen del registro

### 8.1 Ver imagen en grande
**Click sobre la imagen** (ya sea el preview en el formulario o el thumbnail en el grid) la abre en pantalla completa. Click fuera o tecla ESC para cerrar. En mobile usa pinch-to-zoom para acercar.

> 📷 **Captura 7**: campo imagen con los botones Cámara/Galería y el preview.
> 📷 **Captura 8**: lightbox abierto mostrando una imagen en grande.

---

## 9. Reordenar y modificar campos

En cualquier momento puedes cambiar la estructura de la tabla:

1. En la lista de tablas, click en el icono ✏️ al lado de la tabla.
2. En el formulario que aparece, cada campo tiene a la derecha **3 botones**:
   - **↑** mover hacia arriba
   - **↓** mover hacia abajo
   - **×** eliminar el campo
3. También puedes:
   - Cambiar el **nombre** del campo (sin perder datos)
   - Cambiar el **tipo** (cuidado: si era texto y pasa a número, los valores pueden quedar vacíos)
   - Cambiar los **decimales / opciones / etc.**
   - Cambiar el **ancho de columna**
4. Click **Guardar cambios**.

> ⚠ **Importante**: si eliminas una columna, se pierden los valores de esa columna en todos los registros. El resto de columnas y registros queda intacto.

> 📷 **Captura 9**: editor de tabla mostrando los botones ↑ ↓ × a la derecha de cada campo.

---

## 10. Atajos y tips

- **Sin guardar perdés cambios**: si cierras el navegador con un registro abierto sin guardar, los cambios no quedan.
- **Una factura con varios items**: usa el patrón Detalle + Agregación (ver secciones 4.4 y 4.6).
- **Para sumar gastos del mes**: agrupar por fecha → Mes. El subtotal del mes y el total general aparecen automáticamente.
- **El buscador es tu amigo**: si tienes muchos registros, buscar es más rápido que paginar.
- **Mobile**: la app funciona en celular. Las columnas se ven con scroll horizontal pero el botón de editar/eliminar siempre queda visible a la derecha.

---

## Convertir este manual a Word

Este archivo está en formato Markdown (.md). Para convertirlo a Word:

**Opción A — Pandoc (recomendado, una sola línea):**
```bash
brew install pandoc
pandoc MANUAL.md -o Manual_EasyDB.docx
```

**Opción B — Editor Markdown:**
Abre el archivo en [Typora](https://typora.io) o [Obsidian](https://obsidian.md) → Archivo → Exportar → Word.

**Opción C — VS Code:**
Instala la extensión "Markdown All in One" y exporta desde el comando "Markdown All in One: Export Document as".

**Opción D — Online:**
Sube el archivo a https://word2md.com/ (al revés también funciona) o https://cloudconvert.com.

---

## Lista de capturas a tomar

Las capturas las debes tomar tú desde la app (https://easydb.duckdns.org) y pegarlas en cada lugar marcado **📷 Captura X**.

| # | Qué mostrar |
|---|------------|
| 1 | Pantalla de login con el botón "Iniciar sesión con Google" |
| 2 | Lista de bases de datos en la página principal |
| 3 | Formulario "Nueva Tabla" con 3-4 campos agregados, mostrando los tipos |
| 4 | Edición de un registro padre con la sub-grilla de items debajo |
| 5 | Grid de una tabla con varios registros, mostrando iconos editar/eliminar |
| 6 | Toolbar superior con búsqueda, agrupación por fecha (Mes), Del/Al |
| 7 | Campo Imagen con preview y botones Cámara / Galería |
| 8 | Lightbox abierto con una imagen ampliada |
| 9 | Editor de tabla con flechas ↑ ↓ × a la derecha de cada campo |

Tomar capturas en Mac: **Cmd + Shift + 4** (selección) o **Cmd + Shift + 5** (más opciones).
En Windows: **Win + Shift + S**.
En celular: botones físicos de captura.

Cuando pegues las capturas en Word (o en el editor Markdown antes de exportar), reemplaza cada `📷 Captura X` con la imagen.
