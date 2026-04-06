const crypto = require("crypto");

const HASH_PREFIX = "scrypt";
const DEFAULT_COST = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto
    .scryptSync(password, salt, DEFAULT_COST)
    .toString("hex");

  return `${HASH_PREFIX}$${salt}$${derivedKey}`;
}

function isHashedPassword(value) {
  return typeof value === "string" && value.startsWith(`${HASH_PREFIX}$`);
}

function verifyPassword(password, storedValue) {
  if (!storedValue) return false;

  if (!isHashedPassword(storedValue)) {
    return storedValue === password;
  }

  const [, salt, originalHash] = storedValue.split("$");
  if (!salt || !originalHash) return false;

  const derivedKey = crypto.scryptSync(password, salt, DEFAULT_COST);
  const originalBuffer = Buffer.from(originalHash, "hex");

  if (derivedKey.length !== originalBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(derivedKey, originalBuffer);
}

module.exports = {
  hashPassword,
  isHashedPassword,
  verifyPassword,
};
