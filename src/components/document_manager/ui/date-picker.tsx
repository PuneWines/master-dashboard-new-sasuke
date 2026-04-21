// components/ui/date-picker.tsx
"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils" // Assuming you have this utility for class merging
import { Button } from "@/components/ui/button" // Assuming you have this button component
import { Calendar } from "@/components/ui/calendar" // Your existing Calendar component
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover" // Assuming you have these popover components

interface DatePickerProps {
  value?: Date; // The selected date as a Date object
  onChange: (date: Date | undefined) => void; // Callback when date changes
  placeholder?: string; // Placeholder text for the button
  disabled?: boolean; // Whether the date picker is disabled
  required?: boolean; // Whether a date selection is required
  className?: string; // Additional class names for styling
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select a date",
  disabled,
  required,
  className,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "dd/MM/yyyy") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          initialFocus
          // required={required} // Removed this, as Calendar component might not have a direct 'required' prop for visual indication
        />
      </PopoverContent>
    </Popover>
  )
}