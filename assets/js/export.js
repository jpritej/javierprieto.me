/* Exportación a Excel (.xlsx) de los listados, respetando el filtro activo.
   SheetJS se carga por CDN en index.html; si no está disponible, el botón
   avisa en lugar de fallar en silencio. */

export function canExport() {
  return typeof XLSX !== "undefined";
}

/** rows: array de objetos planos. columns: [[clave, encabezado], ...] */
export function exportRows(rows, columns, sheetName, fileName) {
  if (!canExport()) return false;
  const header = columns.map(([, label]) => label);
  const body = rows.map((r) => columns.map(([key]) => {
    const v = r[key];
    return v === null || v === undefined ? "" : v;
  }));
  const ws = XLSX.utils.aoa_to_sheet([header, ...body]);

  // anchos aproximados según el contenido, para que se lea sin ajustar nada
  ws["!cols"] = columns.map(([key], i) => {
    const longest = Math.max(header[i].length, ...body.map((r) => String(r[i]).length));
    return { wch: Math.min(60, Math.max(10, longest + 2)) };
  });
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({
    s: { r: 0, c: 0 }, e: { r: body.length, c: columns.length - 1 } }) };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, fileName);
  return true;
}

export function stamp() {
  return new Date().toISOString().slice(0, 10);
}
