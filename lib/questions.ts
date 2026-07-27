export type Question = {
  id: string;
  question: string;
  answers: string[];
  correct_answer: number;
  created_at: string;
};

export type QuestionInput = Pick<Question, "question" | "answers" | "correct_answer">;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  url && key && !url.includes("YOUR_PROJECT") && !key.includes("YOUR_")
);

function headers() {
  return {
    apikey: key ?? "",
    Authorization: `Bearer ${key ?? ""}`,
    "Content-Type": "application/json",
  };
}

async function parseError(response: Response) {
  const data = await response.json().catch(() => null);
  return data?.message || data?.hint || `Supabase trả về lỗi ${response.status}`;
}

export async function getQuestions(): Promise<Question[]> {
  if (!isSupabaseConfigured) return [];
  const response = await fetch(
    `${url}/rest/v1/questions?select=id,question,answers,correct_answer,created_at&order=created_at.desc`,
    { headers: headers(), cache: "no-store" }
  );
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function addQuestion(input: QuestionInput): Promise<void> {
  if (!isSupabaseConfigured) throw new Error("Supabase chưa được cấu hình.");
  const response = await fetch(`${url}/rest/v1/questions`, {
    method: "POST",
    headers: { ...headers(), Prefer: "return=minimal" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await parseError(response));
}

export async function addQuestions(inputs: QuestionInput[]): Promise<void> {
  if (!isSupabaseConfigured) throw new Error("Supabase chưa được cấu hình.");
  for (let index = 0; index < inputs.length; index += 100) {
    const response = await fetch(`${url}/rest/v1/questions`, {
      method: "POST",
      headers: { ...headers(), Prefer: "return=minimal" },
      body: JSON.stringify(inputs.slice(index, index + 100)),
    });
    if (!response.ok) throw new Error(await parseError(response));
  }
}

export async function updateQuestion(
  id: string,
  input: QuestionInput
): Promise<void> {
  if (!isSupabaseConfigured) throw new Error("Supabase chưa được cấu hình.");
  const response = await fetch(`${url}/rest/v1/questions?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...headers(), Prefer: "return=minimal" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await parseError(response));
}

export async function deleteQuestion(id: string): Promise<void> {
  if (!isSupabaseConfigured) throw new Error("Supabase chưa được cấu hình.");
  const response = await fetch(`${url}/rest/v1/questions?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { ...headers(), Prefer: "return=minimal" },
  });
  if (!response.ok) throw new Error(await parseError(response));
}

export function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
