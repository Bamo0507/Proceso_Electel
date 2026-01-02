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

interface SingleSelectFieldProps<T extends string | number> {
  name: string
  label: string
  options: Option<T>[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function SingleSelectField<T extends string | number>({
  name,
  label,
  options,
  placeholder,
  className,
  disabled,
}: SingleSelectFieldProps<T>) {
  const { control, formState } = useFormContext()
  const error = formState.errors[name]?.message as string | undefined
  
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <div className={cn('flex flex-col gap-2', className)}>
          <label className="text-sm font-semibold">{label}</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={disabled}>
              <div className="relative w-full">
                <input
                  type="text"
                  readOnly
                  disabled={disabled}
                  value={options.find((opt) => opt.id === field.value)?.label || ''}
                  placeholder={placeholder}  
                  className={cn(
                    "w-full py-2.5 pr-10 pl-3 rounded-md border text-sm font-medium bg-white text-foreground cursor-pointer",
                    "truncate overflow-hidden whitespace-nowrap",
                    disabled && "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                  )}
                />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" sideOffset={4} className="w-[200px] p-1 bg-white">
              {options.map((opt) => (
                <DropdownMenuItem
                  key={String(opt.id)}
                  onSelect={() => field.onChange(opt.id)}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm"
                >
                  {field.value === opt.id && <Check className="w-4 h-4" />}
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {error && <p className="text-red-600 text-xs">{error}</p>}
        </div>
      )}
    />
  )
}