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

function formatNumber2(n: number): string {
  return round2(n).toFixed(2);
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

function cellToExportString(cell: XLSX.CellObject | undefined, date1904: boolean): string {
  if (!cell) return "";
  const t = (cell as any).t as string | undefined;
  const v = (cell as any).v;

  if (v === undefined || v === null) return "";

  if (t === "s" || t === "str") return String(v);
  if (t === "b") return String(v);

  // Date directa
  if (t === "d" && v instanceof Date) return formatDate(v);

  // Numérico: decidir si es fecha por formato (como POI)
  if (t === "n") {
    if (isDateFormattedCell(cell)) {
      const d = excelSerialToDate(Number(v), date1904);
      return d ? formatDate(d) : "";
    }
    return formatNumber2(Number(v));
  }

  // Fórmulas: SheetJS suele dejar el valor evaluado en v
  return String(v);
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

function getLastColWithValue(sheet: XLSX.WorkSheet, r: number, range: XLSX.Range): number {
  let last = range.s.c - 1;

  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r, c });
    const cell = sheet[addr] as XLSX.CellObject | undefined;
    const v = (cell as any)?.v;
    if (v !== undefined && v !== null && v !== "") last = c;
  }

  return last;
}

function buildTxtFromSheet(sheet: XLSX.WorkSheet, date1904: boolean): { txt: string; physicalRowCount: number } {
  const ref = sheet["!ref"];
  if (!ref) return { txt: "", physicalRowCount: 0 };

  const range = XLSX.utils.decode_range(ref);
  let out = "";
  let physicalRows = 0;

  for (let r = range.s.r; r <= range.e.r; r++) {
    // simula "physical rows": solo filas con algún valor
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
    if (!hasAnyValue) continue;

    physicalRows++;

    const lastCol = getLastColWithValue(sheet, r, range);
    const parts: string[] = [];

    for (let c = range.s.c; c <= lastCol; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[addr] as XLSX.CellObject | undefined;
      parts.push(cellToExportString(cell, date1904));
    }

    out += parts.join("\t") + "\n";
  }

  return { txt: out, physicalRowCount: physicalRows };
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

function calculateExpectedRows(sheet: XLSX.WorkSheet, date1904: boolean): number | null {
  // Java: sheet.getRow(1).getCell(0).getDateCellValue();
  const d = getDateFromCell(sheet, 1, 0, date1904);
  if (!d) return null;

  const year = d.getFullYear();
  const month = d.getMonth(); // 0-based
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Java: daysInMonth * 24 * 4 + 1
  return daysInMonth * 24 * 4 + 1;
}

function findMissingTime(sheet: XLSX.WorkSheet, expectedRows: number, date1904: boolean): string | null {
  const ref = sheet["!ref"];
  if (!ref) return null;

  const range = XLSX.utils.decode_range(ref);
  const existingTimes = new Set<string>();

  // Recolecta fechas de la primera columna (c=0) en filas con contenido (desde la 2da fila)
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

    const d = getDateFromCell(sheet, r, 0, date1904);
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

        // expected rows (Java)
        const expectedRows = calculateExpectedRows(picked.sheet, date1904);
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
            const missing = findMissingTime(picked.sheet, expectedRows, date1904);
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
        const { txt: txtContent } = buildTxtFromSheet(picked.sheet, date1904);
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