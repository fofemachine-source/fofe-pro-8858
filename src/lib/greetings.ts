/**
 * Dynamic Greeting and Workplace Safety Helper
 * Determines whether to display BOM DIA, BOA TARDE, or BOA NOITE based on the report data.
 * Falls back to the selected shift or current browser hour when necessary.
 */
export function getGreetingForTime(shift: string, horaInicio?: string): string {
  let hour = -1;

  // 1. Try to parse the specified horaInicio (e.g. "08:30" or "15:40")
  if (horaInicio && horaInicio.trim().includes(':')) {
    const parts = horaInicio.split(':');
    const parsed = parseInt(parts[0], 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 23) {
      hour = parsed;
    }
  }

  // 2. Fall back to selected shift values
  if (hour === -1 && shift) {
    if (shift.includes('18:00')) {
      return 'BOA NOITE E BOM TRABALHO COM SEGURANÇA';
    } else if (shift.includes('06:00')) {
      // For daytime, split by local hour dynamically if possible
      const currentHour = new Date().getHours();
      if (currentHour >= 12 && currentHour < 18) {
        return 'BOA TARDE E BOM TRABALHO COM SEGURANÇA';
      }
      return 'BOM DIA E BOM TRABALHO COM SEGURANÇA';
    }
  }

  // 3. Absolute fallback based on current system local hour of day
  if (hour === -1) {
    hour = new Date().getHours();
  }

  if (hour >= 5 && hour < 13) {
    return 'BOM DIA E BOM TRABALHO COM SEGURANÇA';
  } else if (hour >= 13 && hour < 18) {
    return 'BOA TARDE E BOM TRABALHO COM SEGURANÇA';
  } else {
    return 'BOA NOITE E BOM TRABALHO COM SEGURANÇA';
  }
}
