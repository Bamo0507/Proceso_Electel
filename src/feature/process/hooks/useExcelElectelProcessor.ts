/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { toast } from "sonner";

export type ProcessorStatus = "idle" | "ready" | "processing" | "done";

export type InvalidFileInfo = {
  fileName: string;
  sheetName: string;
  missingTime: string; // "dd-MM-yyyy HH:mm:ss" o mensaje si no pudo calcular
};

export type ProcessResult = {
  zipBlob: Blob;
  invalidFiles: InvalidFileInfo[];
  processedCount: number;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function javaLikeTxtName(original: string): string {
  // igual que: replace(".xls",".txt").replace(".xlsx",".txt")
  let name = original.replace(".xls", ".txt").replace(".xlsx", ".txt");
  // fixTxtxExtensions: si termina en .txtx -> remove last 'x'
  if (name.toLowerCase().endsWith(".txtx")) name = name.slice(0, -1);
  return name;
}

function formatDate(d: Date): string {
  // dd-MM-yyyy HH:mm:ss
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()} ${pad2(d.getHours())}:${pad2(
    d.getMinutes()
  )}:${pad2(d.getSeconds())}`;
}

function parseDateFromFormatted(s: string): Date | null {
  // "dd-MM-yyyy HH:mm:ss"
  const m = /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const [, dd, MM, yyyy, hh, mm, ss] = m;
  return new Date(Number(yyyy), Number(MM) - 1, Number(dd), Number(hh), Number(mm), Number(ss));
}

function round2(n: number): number {
  // imita Math.round(x*100)/100 del Java
  return Math.round(n * 100) / 100;
}

function isDateFormattedCell(cell: XLSX.CellObject | undefined): boolean {
  if (!cell) return false;

  const t = (cell as any).t as string | undefined;
  const z = (cell as any).z as string | undefined;

  // Si SheetJS ya lo interpretó como Date
  if (t === "d") return true;

  // Si es numérico pero con formato de fecha/hora
  if (t === "n" && z) {
    const isDate = (XLSX.SSF as any)?.is_date?.(z);
    return !!isDate;
  }

  return false;
}

function excelSerialToDate(serial: number, date1904: boolean): Date | null {
  const parsed = XLSX.SSF.parse_date_code(serial, { date1904 });
  if (!parsed) return null;
  return new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, parsed.S);
}

function cellToString(cell: XLSX.CellObject | undefined): string {
  if (!cell) return "";
  const v = (cell as any).v;
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function getPhysicalRowCount(sheet: XLSX.WorkSheet): number {
  const ref = sheet["!ref"];
  if (!ref) return 0;

  const range = XLSX.utils.decode_range(ref);
  let physicalRows = 0;

  for (let r = range.s.r; r <= range.e.r; r++) {
    let hasAnyValue = false;

    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[addr] as XLSX.CellObject | undefined;
      const v = (cell as any)?.v;
      if (v !== undefined && v !== null && v !== "") {
        hasAnyValue = true;
        break;
      }
    }

    if (hasAnyValue) physicalRows++;
  }

  return physicalRows;
}

function cloneSheetWithoutColumn(
  sheet: XLSX.WorkSheet,
  colToRemove: number | null
): XLSX.WorkSheet {
  if (colToRemove === null) return sheet;

  const ref = sheet["!ref"];
  if (!ref) return sheet;

  const range = XLSX.utils.decode_range(ref);

  // Build a new sheet object with shifted columns.
  const out: XLSX.WorkSheet = {} as XLSX.WorkSheet;

  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      if (c === colToRemove) continue;

      const fromAddr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[fromAddr] as XLSX.CellObject | undefined;
      if (!cell) continue;

      // Shift columns left if they are after the removed column
      const newC = c > colToRemove ? c - 1 : c;
      const toAddr = XLSX.utils.encode_cell({ r, c: newC });

      // Shallow clone cell to avoid accidental mutation
      out[toAddr] = { ...(cell as any) } as XLSX.CellObject;
    }
  }

  // Update !ref to reflect removed column
  const newRange: XLSX.Range = {
    s: { r: range.s.r, c: range.s.c },
    e: { r: range.e.r, c: range.e.c - 1 },
  };
  out["!ref"] = XLSX.utils.encode_range(newRange);

  // Preserve merges if present (note: merges that touch removed col may be off; acceptable for TXT export)
  if ((sheet as any)["!merges"]) {
    (out as any)["!merges"] = (sheet as any)["!merges"];
  }

  return out;
}


function buildTxtFromSheet(
  sheet: XLSX.WorkSheet,
  date1904: boolean,
  timestampCol: number | null,
  localTimeCol: number
): { txt: string; physicalRowCount: number } {
  // Keep physical row count logic for validations (POI-like)
  const physicalRowCount = getPhysicalRowCount(sheet);

  // Remove the entire "timestamp" column before export
  const sheetNoTs = cloneSheetWithoutColumn(sheet, timestampCol);

  // If we removed a column before Local Time, its index shifts left by 1 in the cloned sheet
  const localTimeColAdjusted =
    timestampCol !== null && localTimeCol > timestampCol ? localTimeCol - 1 : localTimeCol;

  // Force ALL non-date numeric cells to be formatted with exactly 2 decimals.
  // We skip the Local Time column to avoid accidentally formatting date serials as numbers.
  (function forceTwoDecimalsOnNumericCells(ws: XLSX.WorkSheet) {
    const ref = ws["!ref"];
    if (!ref) return;

    const range = XLSX.utils.decode_range(ref);

    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        if (c === localTimeColAdjusted) continue;

        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = ws[addr] as XLSX.CellObject | undefined;
        if (!cell) continue;

        const t = (cell as any).t as string | undefined;
        if (t !== "n") continue;

        // If it's a date-formatted cell, keep it as date
        if (isDateFormattedCell(cell)) continue;

        const v = (cell as any).v;
        if (typeof v !== "number" || Number.isNaN(v)) continue;

        // Match Java rounding behavior and ensure two-decimal formatting in SSF
        const rounded = round2(v);
        (cell as any).v = rounded;
        (cell as any).z = "0.00";
        // Force the displayed/formatted string too (important for values like 0 -> 0.00)
        (cell as any).w = rounded.toFixed(2);
      }
    }
  })(sheetNoTs);

  // Emulate Excel "Text (Tab delimited)" as closely as possible.
  // FS = field separator (TAB), RS = record separator (newline)
  // raw=false lets SSF formatting apply when available; defval ensures empty cells are present.
  const txt = XLSX.utils.sheet_to_csv(
    sheetNoTs,
    {
      FS: "\t",
      RS: "\r\n",
      strip: false,
      blankrows: false,
      raw: false,
      defval: "",
      // Match Excel Tab-Delimited export style seen in provided sample: 2025-Dec-01 00:00:00.000
      dateNF: "yyyy-mmm-dd hh:mm:ss.000",
    } as any
  );

  // Ensure final newline like Excel/Windows exports (CRLF)
  const withNewline = txt.endsWith("\r\n") ? txt : txt + "\r\n";

  return { txt: withNewline, physicalRowCount };
}

function getDateFromCell(sheet: XLSX.WorkSheet, r: number, c: number, date1904: boolean): Date | null {
  const addr = XLSX.utils.encode_cell({ r, c });
  const cell = sheet[addr] as XLSX.CellObject | undefined;
  if (!cell) return null;

  const t = (cell as any).t as string | undefined;
  const v = (cell as any).v;

  if (t === "d" && v instanceof Date) return v;

  if (t === "n" && isDateFormattedCell(cell)) {
    return excelSerialToDate(Number(v), date1904);
  }

  return null;
}

function findColumnIndexes(sheet: XLSX.WorkSheet): {
  localTimeCol: number | null;
  timestampCol: number | null;
} {
  const ref = sheet["!ref"];
  if (!ref) return { localTimeCol: null, timestampCol: null };

  const range = XLSX.utils.decode_range(ref);
  const headerRow = range.s.r; // header is the first row in range

  let localTimeCol: number | null = null;
  let timestampCol: number | null = null;

  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: headerRow, c });
    const cell = sheet[addr] as XLSX.CellObject | undefined;
    const text = cellToString(cell).toLowerCase();

    if (text === "local time") localTimeCol = c;
    if (text === "timestamp") timestampCol = c;
  }

  return { localTimeCol, timestampCol };
}

function calculateExpectedRows(
  sheet: XLSX.WorkSheet,
  date1904: boolean,
  localTimeCol: number
): number | null {
  // Java original: row 2, col 1. Here: row 2, column "Local Time"
  const d = getDateFromCell(sheet, 1, localTimeCol, date1904);
  if (!d) return null;

  const year = d.getFullYear();
  const month = d.getMonth(); // 0-based
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Java: daysInMonth * 24 * 4 + 1
  return daysInMonth * 24 * 4 + 1;
}

function findMissingTime(
  sheet: XLSX.WorkSheet,
  expectedRows: number,
  date1904: boolean,
  localTimeCol: number
): string | null {
  const ref = sheet["!ref"];
  if (!ref) return null;

  const range = XLSX.utils.decode_range(ref);
  const existingTimes = new Set<string>();

  // Recolecta fechas de la columna Local Time en filas con contenido (desde la 2da fila)
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    // solo considerar filas "físicas"
    let hasAnyValue = false;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addrAny = XLSX.utils.encode_cell({ r, c });
      const anyCell = sheet[addrAny] as XLSX.CellObject | undefined;
      const vv = (anyCell as any)?.v;
      if (vv !== undefined && vv !== null && vv !== "") {
        hasAnyValue = true;
        break;
      }
    }
    if (!hasAnyValue) continue;

    const d = getDateFromCell(sheet, r, localTimeCol, date1904);
    if (d) existingTimes.add(formatDate(d));
  }

  if (existingTimes.size === 0) return null;

  // Java usa HashSet.iterator().next() (orden no garantizado)
  const first = existingTimes.values().next().value as string;
  const firstDate = parseDateFromFormatted(first);
  if (!firstDate) return null;

  // set a medianoche
  const base = new Date(firstDate);
  base.setHours(0, 0, 0, 0);

  for (let i = 0; i < expectedRows - 1; i++) {
    const t = formatDate(base);
    if (!existingTimes.has(t)) return t;
    base.setMinutes(base.getMinutes() + 15);
  }

  return null;
}

function pickSheetWithMostRows(
  workbook: XLSX.WorkBook
): { name: string; sheet: XLSX.WorkSheet; rows: number } | null {
  let best: { name: string; sheet: XLSX.WorkSheet; rows: number } | null = null;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rowCount = getPhysicalRowCount(sheet);

    if (!best || rowCount > best.rows) {
      best = { name: sheetName, sheet, rows: rowCount };
    }
  }

  return best;
}

export function useExcelElectelProcessor() {
  const [files, setFiles] = React.useState<File[]>([]);
  const [status, setStatus] = React.useState<ProcessorStatus>("idle");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [invalidFiles, setInvalidFiles] = React.useState<InvalidFileInfo[]>([]);
  const [zipUrl, setZipUrl] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const getFileKey = (f: File) => `${f.name}-${f.size}-${f.lastModified}`;

  const clearResults = () => {
    setErrorMessage(null);
    setInvalidFiles([]);
    if (zipUrl) URL.revokeObjectURL(zipUrl);
    setZipUrl(null);
  };

  const resetAll = () => {
    setFiles([]);
    setStatus("idle");
    clearResults();
    setIsLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addFiles = (incoming: File[]) => {
    if (!incoming.length) return;

    const onlyExcel = incoming.filter((f) => /\.(xls|xlsx)$/i.test(f.name));
    if (!onlyExcel.length) {
      setErrorMessage("Solo se permiten archivos .xls o .xlsx");
      return;
    }

    // Si ya había ZIP generado, al modificar inputs limpiamos resultado y volvemos a ready
    if (status === "done") {
      clearResults();
      setStatus("ready");
    }

    setFiles((prev) => {
      const map = new Map<string, File>();
      prev.forEach((f) => map.set(getFileKey(f), f));
      onlyExcel.forEach((f) => map.set(getFileKey(f), f)); // dedupe por key
      return Array.from(map.values());
    });

    setStatus("ready");
  };

  // ✅ Esto arregla lo de “uno por uno”: hacemos append + limpiamos el input para permitir re-selección
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const incoming = Array.from(e.target.files ?? []);
    // IMPORTANT: limpia el input para que puedas seleccionar el mismo archivo otra vez si quieres
    e.target.value = "";
    addFiles(incoming);
  };

  const processFiles = async (): Promise<ProcessResult | null> => {
    if (!files.length) return null;

    setIsLoading(true);
    setErrorMessage(null);
    setInvalidFiles([]);
    setStatus("processing");

    const zip = new JSZip();
    const invalid: InvalidFileInfo[] = [];

    try {
      for (const file of files) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

        const picked = pickSheetWithMostRows(workbook);
        if (!picked) continue;

        const date1904 = !!(workbook as any).Workbook?.WBProps?.date1904;

        const { localTimeCol, timestampCol } = findColumnIndexes(picked.sheet);
        const localTimeIndex = localTimeCol ?? 0; // fallback defensivo

        // expected rows (Java) - basado en columna "Local Time"
        const expectedRows = calculateExpectedRows(picked.sheet, date1904, localTimeIndex);
        if (!expectedRows) {
          invalid.push({
            fileName: file.name,
            sheetName: picked.name,
            missingTime: "No se pudo leer la fecha base (fila 2, col 1).",
          });
        } else {
          // validate rows count usando "physical rows" (como POI)
          const physicalRows = picked.rows;

          if (physicalRows !== expectedRows) {
            const missing = findMissingTime(picked.sheet, expectedRows, date1904, localTimeIndex);
            if (missing) {
              invalid.push({
                fileName: file.name,
                sheetName: picked.name,
                missingTime: missing,
              });
            }
          }
        }

        // Export TXT (tab separated) detectando fecha por formato de celda
        const { txt: txtContent } = buildTxtFromSheet(
          picked.sheet,
          date1904,
          timestampCol,
          localTimeIndex
        );
        const txtName = javaLikeTxtName(file.name);
        zip.file(txtName, txtContent);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);

      setZipUrl(url);
      setInvalidFiles(invalid);
      setStatus("done");
      setIsLoading(false);
      
      // Mostrar notificación de éxito
      toast.success("¡Archivos procesados exitosamente!");

      return { zipBlob, invalidFiles: invalid, processedCount: files.length };
    } catch (err: any) {
      setIsLoading(false);
      setStatus("ready");
      setErrorMessage(err?.message ?? "Error procesando archivos.");
      return null;
    }
  };

  const removeFile = (fileKey: string) => {
    // Si quitamos archivos luego de “done”, invalidamos ZIP
    if (status === "done") {
      clearResults();
      setStatus("ready");
    }

    setFiles((prev) => {
      const next = prev.filter((f) => getFileKey(f) !== fileKey);

      if (next.length === 0) {
        setStatus("idle");
        clearResults();
      }

      return next;
    });
  };

  const clearAllFiles = () => {
    resetAll();
  };

  return {
    files,
    status,
    errorMessage,
    invalidFiles,
    zipUrl,
    isLoading,
    fileInputRef,

    // inputs
    handleFileUpload,
    addFiles, // útil para drag & drop

    // actions
    processFiles,
    resetAll,
    removeFile,
    clearAllFiles,

    // helpers (opcional, por si UI lo quiere)
    getFileKey,
  };
}