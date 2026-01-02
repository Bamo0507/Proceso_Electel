"use client";

import { ExcelProcessorCard } from "@/feature/process/components/ExcelProcessorCard";

export default function ProcessPage() {
  return (
    <div className="min-h-screen w-full">
      <h1 className="text-4xl font-extrabold">Proceso Electel</h1>
      <ExcelProcessorCard />
    </div>
  );
}