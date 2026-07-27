"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  addQuestion,
  addQuestions,
  deleteQuestion,
  getQuestions,
  isSupabaseConfigured,
  Question,
  shuffled,
  updateQuestion,
} from "@/lib/questions";
import { ImportResult, parseQuestionFile } from "@/lib/import-questions";

type Screen = "home" | "create" | "manage" | "quiz-setup" | "quiz";
type QuizSize = number | "all";
type QuizQuestion = Question & { choices: { text: string; isCorrect: boolean }[] };

const letters = ["A", "B", "C", "D"];

function Sparkle({ small = false }: { small?: boolean }) {
  return <span className={small ? "sparkle small" : "sparkle"}>✦</span>;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quizSize, setQuizSize] = useState<QuizSize>("all");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setQuestions(await getQuestions());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải câu hỏi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <main>
      <header className="nav">
        <button className="brand" onClick={() => setScreen("home")} aria-label="Về trang chủ">
          <span className="brand-mark">Q</span>
          <span>quizly</span>
          <i />
        </button>
        <div className="nav-actions">
          <span className="question-count">
            <span className="dot" />
            {loading ? "Đang tải..." : `${questions.length} câu hỏi`}
          </span>
          {screen !== "home" && (
            <button className="text-button" onClick={() => setScreen("home")}>Trang chủ</button>
          )}
        </div>
      </header>

      {!isSupabaseConfigured && <SetupBanner />}
      {error && <div className="toast error">{error}</div>}

      {screen === "home" && (
        <HomeScreen
          count={questions.length}
          loading={loading}
          onCreate={() => setScreen("create")}
          onManage={() => setScreen("manage")}
          onQuiz={() => setScreen("quiz-setup")}
        />
      )}
      {screen === "create" && (
        <CreateScreen
          onCancel={() => setScreen("home")}
          onCreated={async () => {
            await refresh();
            setScreen("home");
          }}
        />
      )}
      {screen === "manage" && (
        <ManageScreen
          questions={questions}
          onBack={() => setScreen("home")}
          onChanged={refresh}
        />
      )}
      {screen === "quiz-setup" && (
        <QuizSetupScreen
          count={questions.length}
          onBack={() => setScreen("home")}
          onStart={(size) => {
            setQuizSize(size);
            setScreen("quiz");
          }}
        />
      )}
      {screen === "quiz" && (
        <QuizScreen questions={questions} size={quizSize} onExit={() => setScreen("home")} />
      )}
    </main>
  );
}

function SetupBanner() {
  return (
    <div className="setup-banner">
      <strong>Chỉ còn một bước:</strong> thêm Supabase URL và anon key vào <code>.env.local</code>,
      rồi chạy file <code>supabase/schema.sql</code> trong SQL Editor.
    </div>
  );
}

function HomeScreen({
  count,
  loading,
  onCreate,
  onManage,
  onQuiz,
}: {
  count: number;
  loading: boolean;
  onCreate: () => void;
  onManage: () => void;
  onQuiz: () => void;
}) {
  return (
    <section className="hero">
      <div className="doodle doodle-one">✦</div>
      <div className="doodle doodle-two">⌁</div>
      <div className="hero-copy">
        <div className="eyebrow"><Sparkle small /> KHO CÂU HỎI CỦA BẠN</div>
        <h1>Học vui hơn.<br /><em>Nhớ lâu hơn.</em></h1>
        <p>Tự tạo câu hỏi, thử thách bản thân và biến mỗi lần học thành một cuộc chơi thú vị.</p>
      </div>

      <div className="action-grid">
        <button className="action-card create-card" onClick={onCreate}>
          <span className="card-icon pencil">↗</span>
          <span className="card-kicker">BẮT ĐẦU SÁNG TẠO</span>
          <strong>Tạo câu hỏi mới</strong>
          <span className="card-description">Thêm câu hỏi và 4 đáp án vào kho kiến thức.</span>
          <span className="card-arrow">→</span>
        </button>
        <button
          className="action-card play-card"
          onClick={onQuiz}
          disabled={loading || count === 0}
        >
          <span className="card-icon play">▶</span>
          <span className="card-kicker">THỬ THÁCH NGAY</span>
          <strong>Làm bài ngẫu nhiên</strong>
          <span className="card-description">
            {count ? `${count} câu hỏi đang chờ bạn chinh phục.` : "Hãy thêm câu hỏi đầu tiên trước nhé."}
          </span>
          <span className="card-arrow">→</span>
        </button>
        <button
          className="action-card manage-card"
          onClick={onManage}
          disabled={loading}
        >
          <span className="card-icon manage">✎</span>
          <span className="card-kicker">CHỈNH SỬA KHO</span>
          <strong>Quản lý câu hỏi</strong>
          <span className="card-description">Sửa nội dung, đổi đáp án đúng hoặc xóa câu bị sai.</span>
          <span className="card-arrow">→</span>
        </button>
      </div>

      <div className="tip"><span>☼</span> Mỗi câu hỏi bạn tạo là một bước tiến nhỏ.</div>
    </section>
  );
}

function CreateScreen({
  onCancel,
  onCreated,
  existing,
}: {
  onCancel: () => void;
  onCreated: () => Promise<void>;
  existing?: Question;
}) {
  const [question, setQuestion] = useState(existing?.question ?? "");
  const [answers, setAnswers] = useState(existing?.answers ?? ["", "", "", ""]);
  const [correct, setCorrect] = useState(existing?.correct_answer ?? 0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const cleanQuestion = question.trim();
    const cleanAnswers = answers.map((answer) => answer.trim());
    if (cleanQuestion.length < 3 || cleanAnswers.some((answer) => !answer)) {
      setMessage("Vui lòng nhập câu hỏi và đầy đủ 4 đáp án.");
      return;
    }
    if (new Set(cleanAnswers.map((answer) => answer.toLowerCase())).size !== 4) {
      setMessage("Bốn đáp án cần khác nhau.");
      return;
    }
    setSaving(true);
    try {
      const input = { question: cleanQuestion, answers: cleanAnswers, correct_answer: correct };
      if (existing) await updateQuestion(existing.id, input);
      else await addQuestion(input);
      await onCreated();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không thể lưu câu hỏi.");
      setSaving(false);
    }
  }

  return (
    <section className="page-shell form-shell">
      <div className="section-heading">
        <span className="step-label">{existing ? "CHỈNH SỬA CÂU HỎI" : "CÂU HỎI MỚI"}</span>
        <h2>
          {existing
            ? <>Sửa lại cho thật <em>chính xác.</em></>
            : <>Gieo một hạt giống <em>kiến thức.</em></>}
        </h2>
        <p>Điền nội dung và chọn đáp án đúng bằng nút tròn bên trái.</p>
      </div>
      <form className="question-form" onSubmit={submit}>
        <label className="field-label" htmlFor="question">Nội dung câu hỏi</label>
        <textarea
          id="question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ví dụ: Hành tinh nào gần Mặt Trời nhất?"
          maxLength={500}
          autoFocus
        />
        <div className="answers-title">
          <span>Các đáp án</span>
          <small>Chọn 1 đáp án đúng</small>
        </div>
        <div className="answer-fields">
          {answers.map((answer, index) => (
            <label className={`answer-field ${correct === index ? "selected" : ""}`} key={index}>
              <input
                type="radio"
                name="correct"
                checked={correct === index}
                onChange={() => setCorrect(index)}
                aria-label={`Đặt đáp án ${letters[index]} là đáp án đúng`}
              />
              <span className="letter">{letters[index]}</span>
              <input
                type="text"
                value={answer}
                onChange={(event) => {
                  const next = [...answers];
                  next[index] = event.target.value;
                  setAnswers(next);
                }}
                placeholder={`Nhập đáp án ${letters[index]}`}
                maxLength={250}
              />
              {correct === index && <span className="correct-tag">ĐÚNG</span>}
            </label>
          ))}
        </div>
        {message && <p className="form-message">{message}</p>}
        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>Hủy bỏ</button>
          <button type="submit" className="primary-button" disabled={saving || !isSupabaseConfigured}>
            {saving ? "Đang lưu..." : existing ? "Lưu thay đổi" : "Lưu câu hỏi"} <span>→</span>
          </button>
        </div>
      </form>
    </section>
  );
}

function ManageScreen({
  questions,
  onBack,
  onChanged,
}: {
  questions: Question[];
  onBack: () => void;
  onChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<Question | null>(null);
  const [deletingId, setDeletingId] = useState("");
  const [message, setMessage] = useState("");
  const [showImport, setShowImport] = useState(false);

  if (editing) {
    return (
      <CreateScreen
        existing={editing}
        onCancel={() => setEditing(null)}
        onCreated={async () => {
          await onChanged();
          setEditing(null);
        }}
      />
    );
  }

  async function remove(item: Question) {
    if (!window.confirm(`Xóa câu hỏi “${item.question}”? Hành động này không thể hoàn tác.`)) return;
    setDeletingId(item.id);
    setMessage("");
    try {
      await deleteQuestion(item.id);
      await onChanged();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không thể xóa câu hỏi.");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <section className="page-shell manage-shell">
      <div className="manage-heading">
        <div>
          <span className="step-label">KHO CÂU HỎI</span>
          <h2>Sửa sai thật <em>dễ dàng.</em></h2>
          <p>Chọn sửa để nhập lại hoặc xóa hẳn câu hỏi không còn dùng.</p>
        </div>
        <div className="manage-heading-actions">
          <button className="import-button" onClick={() => setShowImport((value) => !value)}>
            {showImport ? "Đóng import" : "↑ Import file"}
          </button>
          <button className="secondary-button" onClick={onBack}>← Quay lại</button>
        </div>
      </div>
      {showImport && (
        <ImportPanel
          questions={questions}
          onImported={async () => {
            await onChanged();
            setShowImport(false);
          }}
        />
      )}
      {message && <p className="form-message">{message}</p>}
      <div className="question-list">
        {questions.map((item, index) => (
          <article className="question-row" key={item.id}>
            <span className="row-number">{String(index + 1).padStart(2, "0")}</span>
            <div className="row-copy">
              <h3>{item.question}</h3>
              <p>
                Đáp án đúng: <strong>{letters[item.correct_answer]}. {item.answers[item.correct_answer]}</strong>
              </p>
            </div>
            <div className="row-actions">
              <button className="edit-button" onClick={() => setEditing(item)}>Sửa</button>
              <button
                className="delete-button"
                onClick={() => remove(item)}
                disabled={deletingId === item.id}
              >
                {deletingId === item.id ? "Đang xóa..." : "Xóa"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ImportPanel({
  questions,
  onImported,
}: {
  questions: Question[];
  onImported: () => Promise<void>;
}) {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [importing, setImporting] = useState(false);

  async function readFile(file?: File) {
    setResult(null);
    setMessage("");
    setFileName(file?.name ?? "");
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMessage("File vượt quá giới hạn 5 MB.");
      return;
    }
    try {
      setResult(parseQuestionFile(file.name, await file.text(), questions));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không thể đọc file.");
    }
  }

  async function confirmImport() {
    if (!result?.valid.length) return;
    setImporting(true);
    setMessage("");
    try {
      await addQuestions(result.valid);
      await onImported();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không thể import câu hỏi.");
      setImporting(false);
    }
  }

  return (
    <section className="import-panel">
      <div className="import-intro">
        <div>
          <h3>Import nhiều câu hỏi</h3>
          <p>Hỗ trợ JSON, CSV, TSV hoặc TXT, tối đa 5 MB. Câu trùng sẽ tự động bỏ qua.</p>
        </div>
        <label className="file-button">
          Chọn file
          <input
            type="file"
            accept=".json,.csv,.tsv,.txt,application/json,text/csv,text/tab-separated-values"
            onChange={(event) => readFile(event.target.files?.[0])}
          />
        </label>
      </div>
      <details className="format-help">
        <summary>Xem định dạng file mẫu</summary>
        <div className="format-grid">
          <div>
            <strong>JSON</strong>
            <pre>{`[{
  "question": "2 + 2 bằng?",
  "answers": ["2", "3", "4", "5"],
  "correct_answer": 2
}]`}</pre>
          </div>
          <div>
            <strong>CSV</strong>
            <pre>{`question,answer_a,answer_b,answer_c,answer_d,correct_answer
"2 + 2 bằng?","2","3","4","5",C`}</pre>
          </div>
        </div>
      </details>
      {message && <p className="form-message">{message}</p>}
      {result && (
        <div className="import-preview">
          <div className="import-summary">
            <strong>{fileName}</strong>
            <span>{result.total} dòng</span>
            <span className="valid-count">✓ {result.valid.length} hợp lệ</span>
            <span className={result.errors.length ? "invalid-count" : ""}>
              {result.errors.length} lỗi/trùng
            </span>
          </div>
          {result.valid.length > 0 && (
            <div className="preview-list">
              {result.valid.slice(0, 5).map((item, index) => (
                <div key={`${item.question}-${index}`}>
                  <span>{index + 1}</span>
                  <p>{item.question}</p>
                  <small>Đúng: {letters[item.correct_answer]}. {item.answers[item.correct_answer]}</small>
                </div>
              ))}
              {result.valid.length > 5 && <p className="more-preview">+ {result.valid.length - 5} câu khác</p>}
            </div>
          )}
          {result.errors.length > 0 && (
            <details className="error-details">
              <summary>Xem {result.errors.length} dòng bị bỏ qua</summary>
              <ul>
                {result.errors.slice(0, 20).map((error) => (
                  <li key={`${error.row}-${error.message}`}>Dòng {error.row}: {error.message}</li>
                ))}
              </ul>
            </details>
          )}
          <button
            className="primary-button import-confirm"
            onClick={confirmImport}
            disabled={!result.valid.length || importing}
          >
            {importing ? "Đang import..." : `Import ${result.valid.length} câu hỏi`} →
          </button>
        </div>
      )}
    </section>
  );
}

function QuizSetupScreen({
  count,
  onBack,
  onStart,
}: {
  count: number;
  onBack: () => void;
  onStart: (size: QuizSize) => void;
}) {
  const sizes: QuizSize[] = [50, 100, 200, 300, "all"];
  const [customSize, setCustomSize] = useState("");
  const parsedCustomSize = Number(customSize);
  const customIsValid =
    Number.isInteger(parsedCustomSize) && parsedCustomSize >= 1 && parsedCustomSize <= count;

  return (
    <section className="quiz-setup-shell">
      <span className="step-label">THIẾT LẬP BÀI QUIZ</span>
      <h2>Bạn muốn làm <em>bao nhiêu câu?</em></h2>
      <p className="setup-description">
        Kho hiện có <strong>{count}</strong> câu. Hệ thống ưu tiên câu chưa xuất hiện
        ở các lần làm trước và không lặp câu trong cùng một đề.
      </p>
      <div className="size-grid">
        {sizes.map((size) => {
          const requested = size === "all" ? count : size;
          const actual = Math.min(requested, count);
          return (
            <button key={size} className="size-card" onClick={() => onStart(size)}>
              <span>{size === "all" ? "∞" : size}</span>
              <strong>{size === "all" ? "Toàn bộ" : `${size} câu`}</strong>
              {size !== "all" && actual < size && <small>Dùng {actual} câu hiện có</small>}
              {size === "all" && <small>Làm hết kho câu hỏi</small>}
            </button>
          );
        })}
      </div>
      <div className="custom-size">
        <div>
          <strong>Hoặc nhập số câu tùy chỉnh</strong>
          <small>Nhập một số từ 1 đến {count}.</small>
        </div>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={count}
          value={customSize}
          onChange={(event) => setCustomSize(event.target.value)}
          placeholder="Ví dụ: 75"
          aria-label="Số lượng câu hỏi tùy chỉnh"
        />
        <button
          className="primary-button"
          disabled={!customIsValid}
          onClick={() => onStart(parsedCustomSize)}
        >
          Bắt đầu →
        </button>
      </div>
      {customSize && !customIsValid && (
        <p className="custom-size-error">Vui lòng nhập số nguyên từ 1 đến {count}.</p>
      )}
      <button className="secondary-button setup-back" onClick={onBack}>← Quay lại</button>
    </section>
  );
}

function selectFairQuestions(questions: Question[], size: QuizSize): Question[] {
  const target = size === "all" ? questions.length : Math.min(size, questions.length);
  if (size === "all") return shuffled(questions);

  const storageKey = "quizly-question-rotation-v1";
  const questionById = new Map(questions.map((question) => [question.id, question]));
  let queue: string[] = [];
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    if (Array.isArray(stored)) {
      queue = stored.filter((id): id is string => typeof id === "string" && questionById.has(id));
    }
  } catch {
    queue = [];
  }

  const queued = new Set(queue);
  queue.push(...shuffled(questions.filter((question) => !queued.has(question.id))).map((item) => item.id));
  if (queue.length < target) {
    const stillQueued = new Set(queue);
    queue.push(
      ...shuffled(questions.filter((question) => !stillQueued.has(question.id))).map((item) => item.id)
    );
  }

  const selectedIds = queue.slice(0, target);
  try {
    localStorage.setItem(storageKey, JSON.stringify(queue.slice(target)));
  } catch {
    // Quiz vẫn hoạt động nếu trình duyệt chặn localStorage.
  }
  return selectedIds.map((id) => questionById.get(id)).filter((item): item is Question => Boolean(item));
}

function QuizScreen({
  questions,
  size,
  onExit,
}: {
  questions: Question[];
  size: QuizSize;
  onExit: () => void;
}) {
  const selectedQuestions = useMemo(() => selectFairQuestions(questions, size), [questions, size]);
  const quiz = useMemo<QuizQuestion[]>(
    () =>
      selectedQuestions.map((question) => ({
        ...question,
        choices: shuffled(
          question.answers.map((text, index) => ({
            text,
            isCorrect: index === question.correct_answer,
          }))
        ),
      })),
    [selectedQuestions]
  );
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  if (!quiz.length) {
    return (
      <section className="empty-state">
        <span>?</span><h2>Chưa có câu hỏi nào</h2>
        <button className="primary-button" onClick={onExit}>Quay lại tạo câu hỏi</button>
      </section>
    );
  }

  if (finished) {
    const percent = Math.round((score / quiz.length) * 100);
    return (
      <section className="result-card">
        <div className="result-burst">✦</div>
        <span className="step-label">HOÀN THÀNH</span>
        <h2>{percent >= 80 ? "Xuất sắc!" : percent >= 50 ? "Làm tốt lắm!" : "Thử lại nhé!"}</h2>
        <div className="score-ring"><strong>{score}</strong><span>/ {quiz.length}</span></div>
        <p>Bạn trả lời đúng {percent}% số câu hỏi.</p>
        <div className="result-actions">
          <button className="secondary-button" onClick={onExit}>Trang chủ</button>
          <button className="primary-button" onClick={() => window.location.reload()}>Làm đề mới →</button>
        </div>
      </section>
    );
  }

  const current = quiz[index];
  function choose(choiceIndex: number) {
    if (selected !== null) return;
    setSelected(choiceIndex);
    if (current.choices[choiceIndex].isCorrect) setScore((value) => value + 1);
  }
  function next() {
    if (index === quiz.length - 1) setFinished(true);
    else {
      setIndex((value) => value + 1);
      setSelected(null);
    }
  }

  return (
    <section className="quiz-shell">
      <div className="quiz-top">
        <button className="close-button" onClick={onExit}>×</button>
        <div className="progress-copy">
          <span>CÂU {index + 1} / {quiz.length}</span>
          <div className="progress-track"><i style={{ width: `${((index + 1) / quiz.length) * 100}%` }} /></div>
        </div>
        <span className="live-score">{score} điểm</span>
      </div>
      <article className="quiz-card">
        <span className="question-number">0{index + 1}</span>
        <h2>{current.question}</h2>
        <div className="choice-list">
          {current.choices.map((choice, choiceIndex) => {
            const revealed = selected !== null;
            const state = revealed
              ? choice.isCorrect
                ? "correct"
                : selected === choiceIndex
                  ? "wrong"
                  : "muted"
              : "";
            return (
              <button
                className={`choice ${state}`}
                key={`${choice.text}-${choiceIndex}`}
                onClick={() => choose(choiceIndex)}
                disabled={revealed}
              >
                <span className="choice-letter">{letters[choiceIndex]}</span>
                <strong>{choice.text}</strong>
                {revealed && choice.isCorrect && <span className="choice-status">✓</span>}
                {revealed && selected === choiceIndex && !choice.isCorrect && <span className="choice-status">×</span>}
              </button>
            );
          })}
        </div>
        <div className="quiz-footer">
          <p>{selected === null ? "Chọn một đáp án để tiếp tục" : current.choices[selected].isCorrect ? "Chính xác! Tuyệt lắm." : "Chưa đúng — đáp án đúng đã được đánh dấu."}</p>
          <button className="primary-button" onClick={next} disabled={selected === null}>
            {index === quiz.length - 1 ? "Xem kết quả" : "Câu tiếp theo"} →
          </button>
        </div>
      </article>
    </section>
  );
}
