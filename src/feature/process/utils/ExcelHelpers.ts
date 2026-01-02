import * as XLSX from "xlsx";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatDate(d: Date): string {
  // dd-MM-yyyy HH:mm:ss
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()} ${pad2(
    d.getHours()
  )}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatNumber2(n: number): string {
  return round2(n).toFixed(2);
}

function isDateFormattedCell(cell: XLSX.CellObject | undefined): boolean {
  if (!cell) return false;
  // Si viene como Date directo
  if ((cell as any).t === "d") return true;

  // Si es numérico con formato "fecha"
  const t = (cell as any).t;
  const z = (cell as any).z as string | undefined;
  if (t === "n" && z) {
    // SheetJS tiene SSF.is_date(fmt)
    return !!(XLSX.SSF as any)?.is_date?.(z);
  }
  return false;
}

function excelSerialToDate(serial: number, date1904: boolean): Date | null {
  const parsed = XLSX.SSF.parse_date_code(serial, { date1904 });
  if (!parsed) return null;
  return new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, parsed.S);
}

function cellToExportString(
  cell: XLSX.CellObject | undefined,
  date1904: boolean
): string {
  if (!cell || (cell as any).v === undefined || (cell as any).v === null) return "";

  const t = (cell as any).t;
  const v = (cell as any).v;

  if (t === "s" || t === "str") return String(v);
  if (t === "b") return String(v);

  // Date directa
  if (t === "d" && v instanceof Date) return formatDate(v);

  // Numérico: decidir si es fecha por formato
  if (t === "n") {
    if (isDateFormattedCell(cell)) {
      const d = excelSerialToDate(Number(v), date1904);
      return d ? formatDate(d) : "";
    }
    return formatNumber2(Number(v));
  }

  // Fórmula: SheetJS suele dejar el resultado en v (t define el tipo)
  // fallback:
  return String(v);
}