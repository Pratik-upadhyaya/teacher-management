"use client";
import { useState, useRef, useEffect } from "react";
import googleTransliterate from "input-tool-helper";

function useNepaliInput(
  onChange: (val: string) => void,
  onEnglishChange?: (val: string) => void
) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // Which suggestion is currently highlighted -- moved with Left/Right
  // arrow keys, committed on Space/Enter/blur. Reset to 0 (the
  // API's top-ranked suggestion) whenever a fresh suggestion list comes
  // in or the field goes back to empty.
  const [selectedIndex, setSelectedIndex] = useState(0);
  const reqRef = useRef<XMLHttpRequest | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tracks the raw English text for each word that's already been
  // committed to Devanagari, in order -- e.g. typing "Sandesh Pokhrel"
  // and picking suggestions for both words leaves this as
  // ["Sandesh", "Pokhrel"] even though `value` itself now only holds
  // "संदेश पोखरेल". This is what lets a caller (via onEnglishChange)
  // reconstruct "what the teacher actually typed in English" rather than
  // reverse-transliterating the Devanagari after the fact, which is
  // lossy/ambiguous for proper names.
  const committedEnglishRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  async function fetchSuggestions(lastWord: string) {
    try {
      if (reqRef.current) reqRef.current.abort();
      reqRef.current = new XMLHttpRequest();
      const results = await (googleTransliterate as any)(
        reqRef.current, lastWord, "ne-t-i0-und", 6
      ) as [string, string][];
      setSuggestions(results.map(([, word]) => word));
      setSelectedIndex(0);
      setShowSuggestions(true);
    } catch {
      setSuggestions([]);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    onChange(val);

    const words = val.split(" ");
    const lastWord = words.at(-1) ?? "";
    // Entire field is Nepali Unicode (no English letters anywhere).
    if (!/[A-Za-z]/.test(val)) {
      committedEnglishRef.current = [];
    }
    if (onEnglishChange) {
  const committedCount = Math.max(0, words.length - 1);
  committedEnglishRef.current = committedEnglishRef.current.slice(0, committedCount);

  // Only mirror text if the user is typing English.
  if (/[A-Za-z]/.test(lastWord)) {
    onEnglishChange(
      [...committedEnglishRef.current, lastWord].filter(Boolean).join(" ")
    );
  } else {
    // User is typing Nepali directly.
    // Leave the English field empty unless English words
    // have already been committed.
    onEnglishChange(committedEnglishRef.current.join(" "));
  }
}

    if (!lastWord) {
      setSuggestions([]);
      setSelectedIndex(0);
      setShowSuggestions(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(lastWord), 250);
  }

  function pickSuggestion(word: string, currentVal: string) {
    const words = currentVal.split(" ");
    const rawWord = words[words.length - 1];
    words[words.length - 1] = word;
    onChange(words.join(" "));

    if (onEnglishChange) {
      committedEnglishRef.current = [...committedEnglishRef.current, rawWord];
      onEnglishChange(committedEnglishRef.current.join(" "));
    }

    setSuggestions([]);
    setSelectedIndex(0);
    setShowSuggestions(false);
  }

  // Same as pickSuggestion, but appends a trailing space so typing can
  // continue straight into the next word -- used when the user presses
  // Space to commit the current word instead of clicking a suggestion.
  function commitSuggestionAndAdvance(word: string, currentVal: string) {
    const words = currentVal.split(" ");
    const rawWord = words[words.length - 1];
    words[words.length - 1] = word;
    onChange(words.join(" ") + " ");

    if (onEnglishChange) {
      committedEnglishRef.current = [...committedEnglishRef.current, rawWord];
      onEnglishChange(committedEnglishRef.current.join(" ") + " ");
    }

    setSuggestions([]);
    setSelectedIndex(0);
    setShowSuggestions(false);
  }

  // Left/Right cycles which suggestion is highlighted (clamped, no
  // wraparound -- wrapping past either end felt disorienting when
  // testing since it silently jumps you back to the opposite side).
  // Only intercepts the arrow keys while suggestions are actually
  // showing, so normal cursor movement inside typed text is untouched.
  function handleArrowKeys(e: React.KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length === 0) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    }
  }

  // Space commits the currently-highlighted suggestion (not always
  // index 0 -- the user may have arrowed to a different one) and moves
  // on to typing the next word in the same field.
  function handleSpaceKey(e: React.KeyboardEvent<HTMLInputElement>, currentVal: string) {
    if (e.key === " " && suggestions.length > 0) {
      e.preventDefault();
      commitSuggestionAndAdvance(suggestions[selectedIndex], currentVal);
    }
  }

  // Enter commits the highlighted suggestion (if one is pending) without
  // a trailing space -- unlike Space, Enter means "I'm done with this
  // field", not "keep typing the next word here". Always preventDefault
  // on Enter (not just when suggestions are showing) so it never falls
  // through to the browser's default behavior of submitting the
  // enclosing wizard-step <form>; the actual "move to the next field"
  // action is handled by the caller (NepaliInput), which has the DOM
  // node needed to find what's next.
  function handleEnterKey(e: React.KeyboardEvent<HTMLInputElement>, currentVal: string) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (suggestions.length > 0) {
      pickSuggestion(suggestions[selectedIndex], currentVal);
    }
  }
  // Called on blur. If suggestions are still showing (meaning the user
  // typed a romanized word but left the field without clicking one of the
  // options), commit the currently-highlighted suggestion instead of
  // leaving the raw English text sitting in a Nepali-only field.
  function commitTopSuggestionIfPending(currentVal: string) {
    if (suggestions.length > 0) {
      pickSuggestion(suggestions[selectedIndex], currentVal);
    } else {
      setShowSuggestions(false);
    }
  }

  return {
    suggestions,
    showSuggestions,
    selectedIndex,
    handleChange,
    pickSuggestion,
    setShowSuggestions,
    commitTopSuggestionIfPending,
    handleSpaceKey,
    handleEnterKey,
    handleArrowKeys,
  };
}

// Moves focus to the next focusable field within the same <form>,
// mirroring what Tab would do. Used so Enter inside a NepaliInput acts
// like "confirm this field, move to the next one" rather than typing a
// literal newline or (without the preventDefault above) submitting the
// whole wizard step early.
function focusNextField(current: HTMLElement | null) {
  if (!current) return;
  const form = current.closest("form");
  if (!form) return;
  const focusable = Array.from(
    form.querySelectorAll<HTMLElement>(
      'input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled)'
    )
  ).filter((el) => el.tabIndex !== -1 && el.offsetParent !== null);
  const idx = focusable.indexOf(current);
  if (idx >= 0 && idx < focusable.length - 1) {
    focusable[idx + 1].focus();
  }
}

export default function NepaliInput({
  value, onChange, placeholder, className, error, onEnglishChange,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  error?: string;
  // Optional -- when provided, live-tracks the raw English text as it's
  // typed and committed word-by-word, so a caller can capture "what the
  // teacher actually typed in English" alongside the Devanagari result
  // (see useNepaliInput above for how words are tracked pre-commit).
  onEnglishChange?: (val: string) => void;
}) {
  const {
    suggestions,
    showSuggestions,
    selectedIndex,
    handleChange,
    pickSuggestion,
    setShowSuggestions,
    commitTopSuggestionIfPending,
    handleSpaceKey,
    handleEnterKey,
    handleArrowKeys,
  } = useNepaliInput(onChange, onEnglishChange);

  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        lang="ne"
        value={value}
        onChange={handleChange}
        onKeyDown={(e) => {
          handleArrowKeys(e);
          handleSpaceKey(e, value);
        }}
        onKeyUp={(e) => {
          const wasEnter = e.key === "Enter";
          handleEnterKey(e, value);
          // Deferred so the suggestion dropdown (which unmounts as part
          // of the commit above) is actually out of the DOM before we
          // look for "the next focusable field" -- otherwise its
          // still-mounted suggestion buttons would be found first.
          if (wasEnter) {
            setTimeout(() => focusNextField(inputRef.current), 0);
          }
        }}
        onBlur={() =>
          setTimeout(() => commitTopSuggestionIfPending(value), 150)
        }
        placeholder={placeholder}
        className={className}
      />
      {error && (
      <p className="text-red-500 text-xs mt-1">{error}</p>
    )}
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-10 left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-md w-full flex flex-wrap gap-1 p-2">
          {suggestions.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={() => pickSuggestion(s, value)}
                title={i === 0 ? "Most common — selected automatically if you don't pick one" : undefined}
                className={`px-3 py-1 text-sm rounded-md transition ${
                  i === selectedIndex
                    ? "bg-[#eaf0fb] border-2 border-[#0f2044] text-[#0f2044] font-semibold"
                    : "bg-gray-50 hover:bg-[#eaf0fb] border border-gray-200 text-gray-800"
                }`}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}