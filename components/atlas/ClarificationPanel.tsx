'use client';

/**
 * The clarification interaction (ATL-04R).
 *
 * This is a TEMPORARY STATE OF THE DISCOVERY INPUT, not a chat surface, and the distinction is
 * load-bearing rather than stylistic. A transcript would turn the Atlas into a chatbot with a
 * capability database behind it; what the Atlas is meant to be is a visual exploration environment
 * that occasionally needs one more fact before it can arrange itself usefully. So this panel holds
 * exactly one question at a time, keeps no history, and disappears the moment the Atlas knows
 * enough — leaving a context ribbon behind and returning the reader to the landscape.
 *
 * Everything it renders comes from `ClarificationQuestion`, which is assembled server-side from
 * governed area aspects. No question text and no choice label is authored here; this file lays out
 * a decision, it does not decide anything.
 *
 * Prepared responses are shortcuts, never restrictions — the free-text field is always present and
 * always accepted, which is why it is a real form control rather than an "Other…" affordance the
 * reader has to discover.
 */

import { useState } from 'react';
import { CornerDownLeft, X } from 'lucide-react';
import type { ClarificationQuestion, ClarificationChoice } from '@/packages/contracts/src/capability-atlas-model';

interface Props {
  question: ClarificationQuestion;
  /** Selecting one prepared response. Multi-select questions call this once per chosen response. */
  onChoose: (choices: ClarificationChoice[]) => void;
  /** The reader answered in their own words instead. */
  onFreeText: (text: string) => void;
  onDismiss: () => void;
  busy?: boolean;
}

export default function ClarificationPanel({ question, onChoose, onFreeText, onDismiss, busy = false }: Props) {
  const [picked, setPicked] = useState<string[]>([]);
  const [text, setText] = useState('');

  const multi = question.multi_select;
  const chosen = question.choices.filter(c => picked.includes(c.choice_id));

  function toggle(choice: ClarificationChoice) {
    if (!multi) {
      onChoose([choice]);
      return;
    }
    // "Show me everything" is an answer in itself, so it clears any narrowing already picked
    // rather than combining with it into a contradiction.
    if (choice.value === 'all') {
      onChoose([choice]);
      return;
    }
    setPicked(prev =>
      prev.includes(choice.choice_id) ? prev.filter(id => id !== choice.choice_id) : [...prev, choice.choice_id]
    );
  }

  function submitText() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onFreeText(trimmed);
    setText('');
  }

  return (
    <section className="atlas-clarify" aria-live="polite">
      <div className="atlas-clarify-head">
        <p className="atlas-clarify-question">{question.question}</p>
        <button
          type="button"
          className="atlas-clarify-dismiss"
          onClick={onDismiss}
          aria-label="Skip this question and show everything found so far"
          title="Skip and show everything"
        >
          <X size={15} strokeWidth={1.75} />
        </button>
      </div>

      <div className="atlas-clarify-choices" role="group" aria-label={question.question}>
        {question.choices.map(choice => {
          const isPicked = picked.includes(choice.choice_id);
          return (
            <button
              key={choice.choice_id}
              type="button"
              className={`atlas-clarify-chip${choice.value === 'all' ? ' atlas-clarify-chip--all' : ''}`}
              aria-pressed={multi ? isPicked : undefined}
              onClick={() => toggle(choice)}
              disabled={busy}
            >
              {choice.label}
              {choice.selects.length > 0 && (
                <span className="atlas-clarify-count">{choice.selects.length}</span>
              )}
            </button>
          );
        })}
      </div>

      {multi && chosen.length > 0 && (
        <button type="button" className="atlas-clarify-apply" onClick={() => onChoose(chosen)} disabled={busy}>
          Explore {chosen.length === 1 ? chosen[0].label : `${chosen.length} of these`}
          <CornerDownLeft size={13} strokeWidth={2} />
        </button>
      )}

      <div className="atlas-clarify-own">
        <label htmlFor="atlas-clarify-text">Or answer in your own words</label>
        <div className="atlas-clarify-owninput">
          <input
            id="atlas-clarify-text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') submitText();
            }}
            placeholder="Something else…"
            disabled={busy}
          />
          <button type="button" onClick={submitText} disabled={busy || !text.trim()}>
            Continue
          </button>
        </div>
      </div>
    </section>
  );
}
