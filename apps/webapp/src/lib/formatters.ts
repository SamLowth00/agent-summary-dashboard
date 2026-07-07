// `date` comes back as an ISO date string (YYYY-MM-DD); show it as DD/MM/YYYY.
export const formatDate = (value?: string) => {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
};

// A length in seconds to a zero-padded hh:mm:ss string.
export const formatDuration = (seconds?: number) => {
  if (seconds == null) return '—';
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return [hours, minutes, secs]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
};
