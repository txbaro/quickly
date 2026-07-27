import type { Question, QuestionInput } from "./questions";

export type ImportError = { row: number; message: string };
export type ImportResult = {
  valid: QuestionInput[];
  errors: ImportError[];
  total: number;
};

type UnknownRecord = Record<string, unknown>;

function normalizeCorrect(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 3) {
    return value;
  }
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  if (["A", "B", "C", "D"].includes(normalized)) return normalized.charCodeAt(0) - 65;
  if (/^[0-3]$/.test(normalized)) return Number(normalized);
  return null;
}

function normalizeRecord(record: UnknownRecord): QuestionInput | string {
  const question = String(record.question ?? "").trim();
  const rawAnswers = Array.isArray(record.answers)
    ? record.answers
    : [record.answer_a, record.answer_b, record.answer_c, record.answer_d];
  const answers = rawAnswers.map((answer) => String(answer ?? "").trim());
  const correct = normalizeCorrect(record.correct_answer);

  if (question.length < 3) return "Câu hỏi phải có ít nhất 3 ký tự.";
  if (answers.length !== 4 || answers.some((answer) => !answer)) {
    return "Phải có đầy đủ đúng 4 đáp án.";
  }
  if (new Set(answers.map((answer) => answer.toLocaleLowerCase("vi"))).size !== 4) {
    return "Bốn đáp án phải khác nhau.";
  }
  if (correct === null) return "correct_answer phải là 0–3 hoặc A–D.";
  return { question, answers, correct_answer: correct };
}

function parseCsvRows(source: string): string[][] {
  const cleanSource = source.replace(/^\uFEFF/, "");
  const firstLine = cleanSource.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = ["\t", ";", ","].sort(
    (a, b) => firstLine.split(b).length - firstLine.split(a).length
  )[0];
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < cleanSource.length; index++) {
    const char = cleanSource[index];
    if (quoted) {
      if (char === '"' && cleanSource[index + 1] === '"') {
        field += '"';
        index++;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  row.push(field.replace(/\r$/, ""));
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function csvToRecords(source: string): UnknownRecord[] {
  const rows = parseCsvRows(source);
  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const required = ["question", "answer_a", "answer_b", "answer_c", "answer_d", "correct_answer"];
  if (required.some((header) => !headers.includes(header))) {
    throw new Error(`CSV cần các cột: ${required.join(", ")}.`);
  }
  return rows.slice(1).map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]))
  );
}

export function parseQuestionFile(
  fileName: string,
  source: string,
  existing: Question[]
): ImportResult {
  let records: unknown;
  if (fileName.toLowerCase().endsWith(".json")) {
    records = JSON.parse(source.replace(/^\uFEFF/, ""));
  } else if (/\.(csv|tsv|txt)$/i.test(fileName)) {
    records = csvToRecords(source);
  } else {
    throw new Error("Chỉ hỗ trợ file JSON, CSV, TSV hoặc TXT.");
  }
  if (!Array.isArray(records)) throw new Error("Nội dung file phải là một danh sách câu hỏi.");

  const seen = new Set(existing.map((item) => item.question.trim().toLocaleLowerCase("vi")));
  const valid: QuestionInput[] = [];
  const errors: ImportError[] = [];

  records.forEach((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      errors.push({ row: index + 1, message: "Dữ liệu không phải một câu hỏi hợp lệ." });
      return;
    }
    const normalized = normalizeRecord(raw as UnknownRecord);
    if (typeof normalized === "string") {
      errors.push({ row: index + 1, message: normalized });
      return;
    }
    const fingerprint = normalized.question.toLocaleLowerCase("vi");
    if (seen.has(fingerprint)) {
      errors.push({ row: index + 1, message: "Câu hỏi bị trùng và đã được bỏ qua." });
      return;
    }
    seen.add(fingerprint);
    valid.push(normalized);
  });

  return { valid, errors, total: records.length };
}
