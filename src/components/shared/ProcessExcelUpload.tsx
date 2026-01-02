"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilePlus2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useExcelElectelProcessor } from "@/feature/process/hooks/useExcelElectelProcessor";

export function ProcessExcelUpload() {
  const {
    files,
    status,
    errorMessage,
    invalidFiles,
    zipUrl,
    isLoading,
    fileInputRef,
    handleFileUpload,
    processFiles,
    resetAll,
  } = useExcelElectelProcessor();

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer?.files ?? []);
    if (!dropped.length) return;

    const dt = new DataTransfer();
    dropped.forEach((f) => dt.items.add(f));

    if (fileInputRef.current) fileInputRef.current.files = dt.files;

    handleFileUpload({
      target: { files: dt.files },
    } as unknown as React.ChangeEvent<HTMLInputElement>);
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <h2 className="text-2xl font-extrabold">Procesar archivos Excel</h2>
        <p className="text-sm text-muted-foreground">
          Sube N archivos .xls/.xlsx. Se generará un ZIP con los TXT tab-separados.
        </p>
      </CardHeader>

      <CardContent>
        {status !== "done" ? (
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

            <p className="mt-1">o arrastra y suelta</p>

            {files.length > 0 && (
              <p className="mt-4 text-sm">
                {files.length} archivo(s) cargado(s)
              </p>
            )}

            {errorMessage && <p className="text-red-500 mt-4">{errorMessage}</p>}
          </div>
        ) : (
          <div className="flex flex-col items-center border rounded-lg p-10">
            <div className="rounded-full bg-primary/10 p-4 mb-2">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>

            <p className="text-base font-medium text-center">
              Listo. ZIP generado.
            </p>

            {invalidFiles.length > 0 && (
              <div className="mt-6 w-full max-w-3xl">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <p className="font-semibold">
                    Archivos con posibles faltantes ({invalidFiles.length})
                  </p>
                </div>

                <div className="max-h-56 overflow-auto border rounded-md">
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
                        <tr key={x.fileName} className="border-t">
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

            <div className="mt-6 flex gap-3">
              {zipUrl && (
                <a
                  href={zipUrl}
                  download="ArchivosModificados.zip"
                  className="inline-flex"
                >
                  <Button>Descargar ZIP</Button>
                </a>
              )}
              <Button variant="outline" onClick={resetAll}>
                Procesar otros archivos
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-center pb-6">
        {status === "ready" && (
          <Button onClick={processFiles} disabled={isLoading}>
            {isLoading ? "Procesando…" : "Procesar y generar ZIP"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}