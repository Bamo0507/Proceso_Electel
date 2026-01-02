"use client"

import * as React from "react"
import type { ReactNode } from "react"
import { Controller, useFormContext } from "react-hook-form"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface DateFieldProps {
  name: string
  label: string
  icon?: ReactNode
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DateField({
  name,
  label,
  icon,
  placeholder = "Selecciona una fecha",
  disabled,
  className,
}: DateFieldProps) {
  const { control, formState } = useFormContext()
  const error = formState.errors[name]?.message as string | undefined

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const selectedDate = field.value as Date | null | undefined

        const labelDate = selectedDate
          ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: es })
          : placeholder

        return (
          <div className={cn("flex flex-col gap-2", className)}>
            <label className="text-sm font-semibold flex items-center gap-2">
              {icon && <span className="text-muted-foreground">{icon}</span>}
              <span>{label}</span>
            </label>

            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={disabled}
                  className={cn(
                    "w-full flex items-center justify-between",
                    "py-2.5 px-3 rounded-md border text-sm font-medium",
                    "bg-white text-foreground disabled:bg-gray-50 disabled:text-gray-500",
                    "truncate overflow-hidden whitespace-nowrap",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <span className="flex-1 truncate text-left">
                    {labelDate}
                  </span>
                  <span className="flex-shrink-0 ml-2">
                    <ChevronDown className="h-4 w-4" />
                  </span>
                </button>
              </PopoverTrigger>

              <PopoverContent align="start" className="p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate ?? undefined}
                  onSelect={(date) => field.onChange(date ?? null)}
                  numberOfMonths={1}
                  captionLayout="dropdown"
                  className="w-full"
                />
              </PopoverContent>
            </Popover>

            {error && <p className="text-red-600 text-xs">{error}</p>}
          </div>
        )
      }}
    />
  )
}