const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === "[object Object]";

export const sanitizeValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (isPlainObject(value)) {
    return Object.entries(value).reduce((acc, [key, innerValue]) => {
      if (key.startsWith("$") || key.includes(".")) {
        return acc;
      }

      acc[key] = sanitizeValue(innerValue);
      return acc;
    }, {});
  }

  if (typeof value === "string") {
    return value.replace(/\u0000/g, "").trim();
  }

  return value;
};

export const getBase64SizeInBytes = (value = "") => {
  const base64 = value.includes(",") ? value.split(",")[1] : value;
  const normalized = base64.replace(/=+$/, "");
  return Math.ceil((normalized.length * 3) / 4);
};