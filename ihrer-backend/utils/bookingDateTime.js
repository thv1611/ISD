const CANCELLATION_LEAD_MINUTES = 30;

function extractDateParts(dateValue) {
  if (dateValue instanceof Date) {
    return {
      year: dateValue.getFullYear(),
      month: dateValue.getMonth() + 1,
      day: dateValue.getDate(),
    };
  }

  const [year, month, day] = String(dateValue).split("-").map(Number);
  return { year, month, day };
}

function parseDateAndTime(dateValue, timeValue) {
  const { year, month, day } = extractDateParts(dateValue);
  const date = new Date(year, month - 1, day);
  const [hours, minutes, seconds = "00"] = String(timeValue).split(":");

  date.setHours(Number(hours), Number(minutes), Number(seconds), 0);
  return date;
}

function isPastDateOnly(dateValue) {
  const { year, month, day } = extractDateParts(dateValue);
  const inputDate = new Date(year, month - 1, day);
  const today = new Date();

  inputDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return inputDate < today;
}

function getMinutesUntilBooking(bookingDateTime, now = new Date()) {
  return (bookingDateTime.getTime() - now.getTime()) / (1000 * 60);
}

function canCancelBooking(bookingDateTime, now = new Date(), minLeadMinutes = CANCELLATION_LEAD_MINUTES) {
  return getMinutesUntilBooking(bookingDateTime, now) >= minLeadMinutes;
}

module.exports = {
  CANCELLATION_LEAD_MINUTES,
  canCancelBooking,
  getMinutesUntilBooking,
  parseDateAndTime,
  isPastDateOnly,
};
