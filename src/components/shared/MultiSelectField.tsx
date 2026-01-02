'use client'

import * as React from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Option } from '@/lib/types/Option'

interface MultiSelectFieldProps<T extends string | number> {
  name: string
  label: string
  options: Option<T>[]
  placeholder?: string
  className?: string
}

export function MultiSelectField<T extends string | number>({
  name,
  label,
  options,
  placeholder = 'Selecciona...',
  className,
}: MultiSelectFieldProps<T>) {
  const { control, formState } = useFormContext()
  const error = formState.errors[name]?.message as string | undefined

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const selectedIds = field.value as T[] | undefined

        // change IDs to labels
        const selectedLabels = options
          .filter((opt) => selectedIds?.includes(opt.id))
          .map((opt) => opt.label)
          .join(', ')

        // Toggle ids
        const toggleId = (id: T) => {
          const set = new Set(selectedIds)
          if (set.has(id)) {
            set.delete(id)
          } else {
            set.add(id)
          }
          field.onChange(Array.from(set))
        }

        return (
          <div className={cn('flex flex-col gap-2', className)}>
            <label className="text-sm font-semibold">{label}</label>

            {/* Input to open menu*/}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="relative w-full">
                  <input
                    type="text"
                    readOnly
                    value={selectedLabels || ''}
                    placeholder={placeholder}
                    className={cn(
                      'w-full py-2.5 pr-10 pl-3 rounded-md border text-sm font-medium bg-white text-foreground cursor-pointer',
                      'truncate overflow-hidden whitespace-nowrap',
                    )}
                  />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" sideOffset={4} className="w-[220px] p-1 bg-white">
                {options.map((opt) => {
                  const selected = selectedIds?.includes(opt.id) ?? false
                  return (
                    <DropdownMenuItem
                      key={String(opt.id)}
                      onSelect={(e) => {
                        e.preventDefault()
                        toggleId(opt.id)
                      }}
                    >
                      {selected && <Check className="w-4 h-4 shrink-0" />}
                      {opt.label}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {error && <p className="text-red-600 text-xs">{error}</p>}
          </div>
        )
      }}
    />
  )
}