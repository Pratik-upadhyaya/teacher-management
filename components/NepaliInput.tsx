"use client";
import { useState, useRef, useEffect } from "react";
import googleTransliterate from "input-tool-helper";

function useNepaliInput(onChange: (val: string) => void) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const reqRef = useRef<XMLHttpRequest | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 
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
      setShowSuggestions(true);
    } catch {
      setSuggestions([]);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    onChange(val);

    const lastWord = val.split(" ").at(-1) ?? "";
    if (!lastWord) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(lastWord), 250);
  }

  function pickSuggestion(word: string, currentVal: string) {
    const words = currentVal.split(" ");
    words[words.length - 1] = word;
    onChange(words.join(" "));
    setSuggestions([]);
    setShowSuggestions(false);
  }

  // Same as pickSuggestion, but appends a trailing space so typing can
  // continue straight into the next word -- used when the user presses
  // Space to commit the current word instead of clicking a suggestion.
  function commitSuggestionAndAdvance(word: string, currentVal: string) {
    const words = currentVal.split(" ");
    words[words.length - 1] = word;
    onChange(words.join(" ") + " ");
    setSuggestions([]);
    setShowSuggestions(false);
  }

  // Called on Space. If suggestions are showing for the word just typed,
  // commit the most common one (suggestions[0]) instead of inserting a
  // literal space into the raw English text.
  function handleSpaceKey(e: React.KeyboardEvent<HTMLInputElement>, currentVal: string) {
    if (e.key === " " && suggestions.length > 0) {
      e.preventDefault();
      commitSuggestionAndAdvance(suggestions[0], currentVal);
    }
  }

  // Called on blur. If suggestions are still showing (meaning the user
  // typed a romanized word but left the field without clicking one of the
  // options), commit the most common suggestion -- suggestions[0], as
  // ranked by the transliteration API -- instead of leaving the raw
  // English text sitting in a Nepali-only field.
  function commitTopSuggestionIfPending(currentVal: string) {
    if (suggestions.length > 0) {
      pickSuggestion(suggestions[0], currentVal);
    } else {
      setShowSuggestions(false);
    }
  }

  return {
    suggestions,
    showSuggestions,
    handleChange,
    pickSuggestion,
    setShowSuggestions,
    commitTopSuggestionIfPending,
    handleSpaceKey,
  };
}

export default function NepaliInput({
  value, onChange, placeholder, className, error,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  error?: string;
}) {
  const {
    suggestions,
    showSuggestions,
    handleChange,
    pickSuggestion,
    setShowSuggestions,
    commitTopSuggestionIfPending,
    handleSpaceKey,
  } = useNepaliInput(onChange);

  return (
    <div className="relative">
      <input
        lang="ne"
        value={value}
        onChange={handleChange}
        onKeyDown={(e) => handleSpaceKey(e, value)}
        onBlur={() =>
          setTimeout(() => commitTopSuggestionIfPending(value), 150)
        }
        placeholder={placeholder}
        className={className}
      />
      <p className="text-gray-400 text-xs mt-0.5">
        Type in English — choose among the suggestions in Nepali      </p>
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
                  i === 0
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