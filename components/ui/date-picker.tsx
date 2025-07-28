"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  onSelect?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
}

export function DatePicker({ date, onSelect, placeholder = "Select date", disabled }: DatePickerProps) {
  const [inputValue, setInputValue] = React.useState("")
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    if (date) {
      setInputValue(format(date, "dd/MM/yyyy"))
    } else {
      setInputValue("")
    }
  }, [date])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)

    // Try to parse the input as DD/MM/YYYY
    const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
    const match = value.match(dateRegex)
    
    if (match) {
      const [, day, month, year] = match
      const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      
      // Validate the date
      if (!isNaN(parsedDate.getTime()) && 
          parsedDate.getDate() === parseInt(day) &&
          parsedDate.getMonth() === parseInt(month) - 1 &&
          parsedDate.getFullYear() === parseInt(year)) {
        onSelect?.(parsedDate)
      }
    } else if (value === "") {
      onSelect?.(undefined)
    }
  }

  const handleCalendarSelect = (selectedDate: Date | undefined) => {
    onSelect?.(selectedDate)
    setOpen(false)
  }

  return (
    <div className="relative">
      <Input
        type="text"
        placeholder={placeholder || "DD/MM/YYYY"}
        value={inputValue}
        onChange={handleInputChange}
        disabled={disabled}
        className="pr-10"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            disabled={disabled}
          >
            <CalendarIcon className="h-4 w-4 text-gray-400" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleCalendarSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}