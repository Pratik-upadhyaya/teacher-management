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

  return { suggestions, showSuggestions, handleChange, pickSuggestion, setShowSuggestions };
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
  const { suggestions, showSuggestions, handleChange, pickSuggestion, setShowSuggestions } =
    useNepaliInput(onChange);

  return (
    <div className="relative">
      <input
        lang="ne"
        value={value}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
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
          {suggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={() => pickSuggestion(s, value)}
                className="px-3 py-1 text-sm bg-gray-50 hover:bg-[#eaf0fb] border border-gray-200 rounded-md text-gray-800 transition"
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