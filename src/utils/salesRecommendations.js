export const DEFAULT_SALES_SCHEDULE = {
  breakfast_start_minute: 360,
  breakfast_end_minute: 630,
  evening_start_minute: 960,
};

export function getSalesPeriod(date, schedule = DEFAULT_SALES_SCHEDULE) {
  const minute = date.getHours() * 60 + date.getMinutes();
  if (minute >= schedule.breakfast_start_minute && minute < schedule.breakfast_end_minute) {
    return "breakfast";
  }
  if (minute >= schedule.evening_start_minute || minute < schedule.breakfast_start_minute) {
    return "evening";
  }
  return "afternoon";
}

export function sortRecommendedItems(items, period) {
  if (period === "breakfast" || period === "evening") {
    const priority = items.filter((item) => item.sales_group === period);
    const rest = items.filter((item) => item.sales_group !== period);
    return [...priority, ...rest];
  }

  const groups = ["breakfast", "everyday", "evening", null].map((group) =>
    items.filter((item) => (item.sales_group || null) === group),
  );
  const balanced = [];
  while (groups.some((group) => group.length)) {
    for (const group of groups) {
      if (group.length) balanced.push(group.shift());
    }
  }
  return balanced;
}

export function formatMinute(minute) {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}
