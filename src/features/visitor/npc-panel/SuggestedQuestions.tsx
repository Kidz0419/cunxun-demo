type SuggestedQuestionsProps = {
  questions: string[];
  disabled?: boolean;
  onSelect: (question: string) => void;
};

export function SuggestedQuestions({ questions, disabled = false, onSelect }: SuggestedQuestionsProps) {
  return (
    <section className="suggested-questions-v2" aria-label="推荐问题">
      <span className="panel-mono-label">SUGGESTED · 推荐问题</span>
      <div className="suggested-question-stack">
        {questions.slice(0, 3).map((question) => (
          <button
            className="suggested-question-row"
            key={question}
            type="button"
            aria-label={`推荐问题：${question}`}
            disabled={disabled}
            onClick={() => onSelect(question)}
          >
            <span>{question}</span>
            <span className="arrow" aria-hidden="true">
              →
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
