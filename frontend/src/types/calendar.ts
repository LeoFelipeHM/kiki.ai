export interface CalendarEvent {
  id: number
  title: string
  day: number
  startHour: number
  duration: number
  type: "meeting" | "task" | "personal"
  guests?: string[]
  description?: string
  color?: string
}
