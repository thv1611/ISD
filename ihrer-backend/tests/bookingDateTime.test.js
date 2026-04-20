const test = require("node:test");
const assert = require("node:assert/strict");

const {
  CANCELLATION_LEAD_MINUTES,
  canCancelBooking,
  parseDateAndTime,
} = require("../utils/bookingDateTime");

test("parseDateAndTime parses YYYY-MM-DD strings", () => {
  const result = parseDateAndTime("2026-04-20", "15:30:00");

  assert.equal(result.getFullYear(), 2026);
  assert.equal(result.getMonth(), 3);
  assert.equal(result.getDate(), 20);
  assert.equal(result.getHours(), 15);
  assert.equal(result.getMinutes(), 30);
});

test("parseDateAndTime parses Date values returned by MySQL DATE columns", () => {
  const mysqlDateValue = new Date(2026, 3, 20);
  const result = parseDateAndTime(mysqlDateValue, "15:30:00");

  assert.equal(Number.isNaN(result.getTime()), false);
  assert.equal(result.getFullYear(), 2026);
  assert.equal(result.getMonth(), 3);
  assert.equal(result.getDate(), 20);
  assert.equal(result.getHours(), 15);
  assert.equal(result.getMinutes(), 30);
});

test("canCancelBooking blocks cancellations inside the 30-minute cutoff", () => {
  const bookingDateTime = new Date(2026, 3, 20, 8, 0, 0);
  const now = new Date(2026, 3, 20, 7, 31, 0);

  assert.equal(CANCELLATION_LEAD_MINUTES, 30);
  assert.equal(canCancelBooking(bookingDateTime, now), false);
});

test("canCancelBooking allows cancellation exactly at the 30-minute cutoff", () => {
  const bookingDateTime = new Date(2026, 3, 20, 8, 0, 0);
  const now = new Date(2026, 3, 20, 7, 30, 0);

  assert.equal(canCancelBooking(bookingDateTime, now), true);
});

test("canCancelBooking allows cancellation earlier than the 30-minute cutoff", () => {
  const bookingDateTime = new Date(2026, 3, 20, 8, 0, 0);
  const now = new Date(2026, 3, 20, 7, 29, 0);

  assert.equal(canCancelBooking(bookingDateTime, now), true);
});
