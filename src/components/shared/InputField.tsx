'use client'

import { ReactNode } from 'react'
import { useFormContext, useController } from 'react-hook-form'

interface InputFieldProps {
  name: string
  label: string
  icon?: ReactNode
  disabled?: boolean
  placeholder?: string
  multiline?: boolean
  rows?: number
  visualType?: 'money' | 'dpi'
}

export function InputField({
  name,
  label,
  icon,
  disabled,
  placeholder,
  multiline,
  rows,
  visualType,
}: InputFieldProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext()

  const { field } = useController({
    name,
    control,
  })

  const error = errors[name]?.message as string | undefined

  // --- Helpers for visual transformations ---

  const formatMoneyDisplay = (
    raw: string | number | null | undefined,
  ): string => {
    if (raw === null || raw === undefined || raw === '') return ''

    const rawString = String(raw)

    // If user is typing a decimal point, show it.
    if (rawString.endsWith('.')) {
      const numPart = rawString.slice(0, -1)
      const num = Number(numPart.replace(/,/g, ''))
      if (Number.isNaN(num)) return ''
      return num.toLocaleString('es-GT') + '.'
    }

    // If there's a decimal part, format with it.
    if (rawString.includes('.')) {
      const parts = rawString.split('.')
      const intPart = Number(parts[0].replace(/,/g, ''))
      if (Number.isNaN(intPart)) return ''
      return `${intPart.toLocaleString('es-GT')}.${parts[1]}`
    }

    // Otherwise, format as an integer.
    const num = Number(rawString.replace(/,/g, ''))
    if (Number.isNaN(num)) return ''
    return num.toLocaleString('es-GT')
  }

  const formatDpiDisplay = (
    raw: string | number | null | undefined,
  ): string => {
    if (raw === null || raw === undefined) return ''
    const digits = String(raw).replace(/\D/g, '').slice(0, 13)
    const p1 = digits.slice(0, 4)
    const p2 = digits.slice(4, 9)
    const p3 = digits.slice(9, 13)
    return [p1, p2, p3].filter(Boolean).join(' ')
  }

  const getDisplayValue = (): string => {
    const value = field.value as string | number | null | undefined

    if (visualType === 'money') {
      return formatMoneyDisplay(value)
    }

    if (visualType === 'dpi') {
      return formatDpiDisplay(value)
    }

    return value == null ? '' : String(value)
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const inputValue = e.target.value

    if (visualType === 'money') {
      let clean = inputValue.replace(/[^\d.]/g, '')
      const parts = clean.split('.')
      if (parts.length > 2) {
        clean = `${parts[0]}.${parts.slice(1).join('')}`
      }
      if (parts[1] && parts[1].length > 2) {
        clean = `${parts[0]}.${parts[1].slice(0, 2)}`
      }

      field.onChange(clean)
      return
    }

    if (visualType === 'dpi') {
      // Keep only digits, max 13, store sin espacios
      const digits = inputValue.replace(/\D/g, '').slice(0, 13)
      field.onChange(digits)
      return
    }

    field.onChange(inputValue)
  }

  const handleBlur = () => {
    const value = field.value as string | number | null | undefined
    if (visualType === 'money') {
      if (value === null || value === undefined || value === '') {
        field.onChange(undefined)
        return
      }
      const num = Number(value)
      if (!Number.isNaN(num)) {
        field.onChange(num.toFixed(2))
      }
    }
    field.onBlur()
  }

  const displayValue = getDisplayValue()

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold flex items-center gap-2">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <span>{label}</span>
      </label>

      {multiline ? (
        <textarea
          id={name}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          ref={field.ref}
          rows={rows || 3}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full py-2.5 px-3 rounded-md border text-sm font-medium bg-white text-foreground disabled:bg-gray-50 disabled:text-gray-500"
        />
      ) : (
        <input
          id={name}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          ref={field.ref}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full py-2.5 px-3 rounded-md border text-sm font-medium bg-white text-foreground disabled:bg-gray-50 disabled:text-gray-500"
        />
      )}

      {error && <p className="text-red-600 text-xs">{error}</p>}
    </div>
  )
}