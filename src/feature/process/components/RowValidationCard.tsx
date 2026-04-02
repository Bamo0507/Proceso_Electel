"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import type { RowCountValidation } from "@/feature/process/models";

interface RowValidationCardProps {
  validations: RowCountValidation[];
}

export function RowValidationCard({ validations }: RowValidationCardProps) {
  if (!validations.length) return null;

  const allValid = validations.every((v) => v.isValid);

  return (
    <div
      className={[
        "mt-4 rounded-xl border-2 border-dashed p-6",
        allValid
          ? "border-green-400 bg-green-50 dark:bg-green-950/30"
          : "border-red-400 bg-red-50 dark:bg-red-950/30",
      ].join(" ")}
    >
      {/* Encabezado */}
      <div className="flex flex-col items-center gap-2 mb-5">
        {allValid ? (
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        ) : (
          <XCircle className="h-10 w-10 text-red-500" />
        )}

        <p className={["text-base font-bold text-center", allValid ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"].join(" ")}>
          {allValid ? "Conteo de filas correcto" : "Diferencia en conteo de filas"}
        </p>

        <p className="text-sm text-muted-foreground text-center">
          {allValid
            ? "Todos los archivos contienen el número esperado de filas."
            : "Uno o más archivos no coinciden con el número de filas esperado."}
        </p>
      </div>

      {/* Tabla de resultados */}
      <div className="overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-transparent">
            <tr>
              <th className="text-left p-2">Archivo</th>
              <th className="text-left p-2">Hoja</th>
              <th className="text-right p-2">Filas encontradas</th>
              {!allValid && <th className="text-right p-2">Filas esperadas</th>}
              <th className="text-center p-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {validations.map((v) => (
              <tr key={`${v.fileName}-${v.sheetName}`} className="border-t">
                <td className="p-2 truncate max-w-[200px]">{v.fileName}</td>
                <td className="p-2">{v.sheetName}</td>
                <td className="p-2 text-right tabular-nums">{v.actualRows.toLocaleString()}</td>
                {!allValid && (
                  <td className="p-2 text-right tabular-nums">
                    {v.expectedRows > 0 ? v.expectedRows.toLocaleString() : "—"}
                  </td>
                )}
                <td className="p-2 text-center">
                  {v.isValid ? (
                    <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                      <CheckCircle2 className="h-4 w-4" /> OK
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                      <XCircle className="h-4 w-4" /> Incompleto
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
