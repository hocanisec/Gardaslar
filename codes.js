const codes = new Map();

/** 6 haneli kod üretir, 5 dk geçerli */
function createCode(email) {
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  codes.set(email.toLowerCase(), {
    code,
    expires: Date.now() + 5 * 60 * 1000
  });

  return code;
}

/** Kod doğruysa true, değilse false */
function verifyCode(email, input) {
  const key = (email || "").toLowerCase();
  const entry = codes.get(key);
  if (!entry) return false;
  if (Date.now() > entry.expires) return false;
  if ((input || "").trim() !== entry.code) return false;

  codes.delete(key);
  return true;
}

module.exports = { createCode, verifyCode };

