export const MAX_RECEIPT_BYTES = 2 * 1024 * 1024;
export function validateReceipt(file) {
  if (
    !file ||
    typeof file.name !== "string" ||
    typeof file.base64 !== "string"
  ) {
    return { error: "Choose a PDF, PNG or JPEG file." };
  }
  if (file.base64.length > Math.ceil(MAX_RECEIPT_BYTES / 3) * 4)
    return { error: "Files must be 2 MB or smaller." };
  if (
    !file.base64.length ||
    file.base64.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(file.base64)
  ) {
    return { error: "The uploaded file is invalid." };
  }
  const data = Buffer.from(file.base64, "base64");
  if (data.toString("base64") !== file.base64)
    return { error: "The uploaded file is invalid." };
  if (!data.length || data.length > MAX_RECEIPT_BYTES)
    return { error: "Files must be 2 MB or smaller." };
  let mimeType, extension;
  if (
    data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    mimeType = "image/png";
    extension = "png";
  } else if (
    data.length >= 4 &&
    data[0] === 255 &&
    data[1] === 216 &&
    data[2] === 255
  ) {
    mimeType = "image/jpeg";
    extension = "jpg";
  } else if (data.subarray(0, 5).toString() === "%PDF-") {
    mimeType = "application/pdf";
    extension = "pdf";
  } else return { error: "Only PDF, PNG and JPEG files are supported." };
  const base =
    file.name
      .replace(/\.[^.]*$/, "")
      .replace(/[^a-zA-Z0-9 _.-]/g, "_")
      .slice(0, 100)
      .trim() || "document";
  return {
    value: { name: `${base}.${extension}`, mimeType, size: data.length, data },
  };
}
export function validMonth(value) {
  return (
    typeof value === "string" && /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(value)
  );
}
