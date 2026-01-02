"use client";

import React from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, FilePlus2, Loader2, Trash2 } from "lucide-react";
import { useExcelElectelProcessor } from "@/feature/process/hooks/useExcelElectelProcessor";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function buildZipName(now = new Date()) {
  const yyyy = now.getFullYear();
  const mm = pad2(now.getMonth() + 1);
  const dd = pad2(now.getDate());
  const hh = pad2(now.getHours());
  const min = pad2(now.getMinutes());
  return `ArchivosModificados_${yyyy}-${mm}-${dd}_${hh}-${min}.zip`;
}

export function ExcelProcessorCard() {
  const {
    files,
    status,
    errorMessage,
    invalidFiles,
    zipUrl,
    isLoading,
    fileInputRef,
    handleFileUpload,
    addFiles,
    processFiles,
    resetAll,
    removeFile,
    clearAllFiles,
    getFileKey,
  } = useExcelElectelProcessor();

  const [showAllFiles, setShowAllFiles] = React.useState(false);

  React.useEffect(() => {
    if (status === "done" && zipUrl) {
      const name = buildZipName(new Date());

      // Auto-descarga: dispara el download apenas el ZIP está listo
      const a = document.createElement("a");
      a.href = zipUrl;
      a.download = name;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }, [status, zipUrl]);

  // drag & drop helpers (multiple)
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer?.files ?? []);
    if (!dropped.length) return;

    // append a la lista (mismo comportamiento que el input)
    addFiles(dropped);

    // opcional: reflejar en el input (no es obligatorio para que funcione)
    const onlyExcel = dropped.filter((f) => /\.(xls|xlsx)$/i.test(f.name));
    if (onlyExcel.length && fileInputRef.current) {
      const dt = new DataTransfer();
      onlyExcel.forEach((f) => dt.items.add(f));
      fileInputRef.current.files = dt.files;
    }
  };

  const isReady = status === "ready" && files.length > 0;
  const isDone = status === "done" && !!zipUrl;

  const hasMoreThanTen = files.length > 10;
  const visibleFiles = showAllFiles ? files : files.slice(0, 10);

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold">Convierte Excel a TXT</h2>
          <p className="text-sm text-muted-foreground">
            Sube tus archivos <b>.xls</b> o <b>.xlsx</b>. Se exportan a <b>.txt</b> y se empaquetan en un ZIP.
          </p>
        </div>
      </CardHeader>

      <CardContent>
        {!isDone ? (
          <>
            {/* DROPZONE */}
            <div
              className="border-2 border-dashed rounded-lg p-10 text-center text-muted-foreground"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <FilePlus2 className="mx-auto h-12 w-12 mb-2 opacity-70" />

              <label className="cursor-pointer font-medium text-primary hover:text-primary/80">
                <span className="font-bold">Sube archivos</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  multiple
                  className="sr-only"
                  onChange={handleFileUpload}
                />
              </label>

              <p className="mt-1 font-semibold">
                <b>o arrastra y suelta</b>
              </p>

              {errorMessage && <p className="text-red-500 mt-4">{errorMessage}</p>}
            </div>

            {/* LISTA DE ARCHIVOS */}
            {files.length > 0 && (
              <div className="mt-4 text-left max-w-3xl mx-auto">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-sm font-semibold text-foreground">Archivos cargados ({files.length})</p>

                  {hasMoreThanTen && (
                    <Button
                      variant="link"
                      className="px-0 font-bold"
                      onClick={() => setShowAllFiles((v) => !v)}
                    >
                      {showAllFiles ? "Ver menos" : "Ver todos"}
                    </Button>
                  )}
                </div>

                {hasMoreThanTen && !showAllFiles && (
                  <p className="text-xs text-muted-foreground mb-2">Mostrando 10 de {files.length}.</p>
                )}

                <div className="max-h-60 overflow-auto border rounded-md">
                  <ul className="text-sm divide-y">
                    {visibleFiles.map((f) => {
                      const key = getFileKey(f);
                      return (
                        <li key={key} className="px-3 py-2 flex items-center justify-between gap-3">
                          <span className="truncate">{f.name}</span>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFile(key)}
                            aria-label={`Eliminar ${f.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* opcional: “Cambiar archivos” como acción rápida (igual limpia todo) */}
                <Button variant="link" onClick={clearAllFiles} className="mt-1 px-0 font-bold">
                  Limpiar archivos
                </Button>
              </div>
            )}
          </>
        ) : (
          // DONE VIEW
          <div className="flex flex-col items-center border rounded-lg p-10">
            <div className="rounded-full bg-primary/10 p-4 mb-2">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>

            <p className="text-base font-semibold text-center">Listo. ZIP generado.</p>
            <p className="text-sm text-muted-foreground text-center mt-1">
              Procesados: <b>{files.length}</b> archivo(s)
            </p>

            {invalidFiles.length > 0 && (
              <div className="mt-6 w-full max-w-4xl">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <p className="font-semibold">Archivos con posibles faltantes ({invalidFiles.length})</p>
                </div>

                <div className="max-h-60 overflow-auto border rounded-md">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr>
                        <th className="text-left p-2">Archivo</th>
                        <th className="text-left p-2">Hoja</th>
                        <th className="text-left p-2">Hora faltante</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invalidFiles.map((x) => (
                        <tr key={`${x.fileName}-${x.sheetName}-${x.missingTime}`} className="border-t">
                          <td className="p-2">{x.fileName}</td>
                          <td className="p-2">{x.sheetName}</td>
                          <td className="p-2">{x.missingTime}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3 justify-center">
              <Button variant="default" onClick={resetAll}>
                Procesar otros archivos
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-end gap-2">
        {!isDone && (
          <Button 
          onClick={processFiles} 
          disabled={!isReady || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Procesando…
              </>
            ) : (
              "Procesar y generar ZIP"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}