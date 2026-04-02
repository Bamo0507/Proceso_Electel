export type ProcessorStatus = "idle" | "ready" | "processing" | "done";

export type InvalidFileInfo = {
  fileName: string;
  sheetName: string;
  missingTime: string; // "dd-MM-yyyy HH:mm:ss" o mensaje si no pudo calcular
};

export type RowCountValidation = {
  fileName: string;
  sheetName: string;
  actualRows: number;
  expectedRows: number;
  isValid: boolean;
};

export type ProcessResult = {
  zipBlob: Blob;
  invalidFiles: InvalidFileInfo[];
  rowValidations: RowCountValidation[];
  processedCount: number;
};
