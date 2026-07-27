"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  addQuestion,
  getQuestions,
  isSupabaseConfigured,
  Question,
  shuffled,
} from "@/lib/questions";

type Screen = "home" | "create" | "quiz";
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
          onQuiz={() => setScreen("quiz")}
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
      {screen === "quiz" && (
        <QuizScreen questions={questions} onExit={() => setScreen("home")} />
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
  onQuiz,
}: {
  count: number;
  loading: boolean;
  onCreate: () => void;
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
      </div>

      <div className="tip"><span>☼</span> Mỗi câu hỏi bạn tạo là một bước tiến nhỏ.</div>
    </section>
  );
}

function CreateScreen({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => Promise<void> }) {
  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState(["", "", "", ""]);
  const [correct, setCorrect] = useState(0);
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
      await addQuestion({ question: cleanQuestion, answers: cleanAnswers, correct_answer: correct });
      await onCreated();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không thể lưu câu hỏi.");
      setSaving(false);
    }
  }

  return (
    <section className="page-shell form-shell">
      <div className="section-heading">
        <span className="step-label">CÂU HỎI MỚI</span>
        <h2>Gieo một hạt giống <em>kiến thức.</em></h2>
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
            {saving ? "Đang lưu..." : "Lưu câu hỏi"} <span>→</span>
          </button>
        </div>
      </form>
    </section>
  );
}

function QuizScreen({ questions, onExit }: { questions: Question[]; onExit: () => void }) {
  const quiz = useMemo<QuizQuestion[]>(
    () =>
      shuffled(questions).map((question) => ({
        ...question,
        choices: shuffled(
          question.answers.map((text, index) => ({
            text,
            isCorrect: index === question.correct_answer,
          }))
        ),
      })),
    [questions]
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
