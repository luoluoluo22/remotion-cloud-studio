import React from "react";
import { cleanCaptionText, getActiveCaption } from "./caption-utils";

type BookCitation = {
  bookTitle?: string;
  printedPage?: number | null;
  citationType?: "verbatim" | "idea-based";
  label?: string;
  displayText?: string;
};

type CaptionData = Parameters<typeof getActiveCaption>[0] & {
  text?: string;
  narrationText?: string;
  goldenQuote?: string;
  bookCitation?: BookCitation;
};

type UnifiedCaptionOverlayProps = {
  data: CaptionData;
  time: number;
};

const FONT = '"Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
const HIGHLIGHT_RED = "#b42318";

const normalizeHighlightText = (value: unknown): string =>
  String(value ?? "")
    .normalize("NFKC")
    .replace(/[\s\p{P}\p{S}]+/gu, "");

const resolveCitationText = (citation?: BookCitation): string => {
  if (!citation) return "";
  if (citation.displayText?.trim()) return citation.displayText.trim();
  const bookTitle = String(citation.bookTitle || "").trim();
  if (!bookTitle) return "";
  const label = citation.label || (citation.citationType === "verbatim" ? "原文摘录" : "观点来源");
  const page = Number(citation.printedPage);
  return label + "：" + bookTitle + (Number.isInteger(page) && page > 0 ? " · 印刷页 P" + page : "");
};

const getGoldenQuoteAtTime = (data: CaptionData, time: number): string => {
  const quote = String(data.goldenQuote || "").trim();
  const narration = String(data.narrationText || data.text || "");
  const timings = data.characterTimings;
  if (!quote || !narration || !Array.isArray(timings)) return "";
  const matchIndex = narration.indexOf(quote);
  if (matchIndex < 0) return "";
  // Provider word-boundary timings may contain extra zero-width punctuation entries.
  // Align against the actual timed character stream, not the raw narration index.
  const timingText = timings.map((item) => String(item.character ?? "")).join("");
  const timingIndex = timingText.indexOf(quote);
  const startIndex = timingIndex >= 0
    ? timingIndex
    : Array.from(narration.slice(0, matchIndex)).length;
  const quoteLength = Array.from(quote).length;
  const first = timings[startIndex];
  const last = timings[startIndex + quoteLength - 1];
  if (!first || !last) return "";
  const start = Number(first.start);
  const end = Number(last.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || time < start || time >= end) return "";
  return cleanCaptionText(quote) || quote;
};

/**
 * One subtitle treatment for all finished Family Education videos.
 * The complete golden quote replaces its normal split captions for its exact
 * audio interval, so the source citation and enlarged red quote stay together.
 */
export const UnifiedCaptionOverlay: React.FC<UnifiedCaptionOverlayProps> = ({ data, time }) => {
  const sentence = getActiveCaption(data, time);
  if (!sentence) return null;

  const sentenceText = sentence.text ?? sentence.characters?.map((item) => item.character).join("") ?? "";
  if (!sentenceText.trim()) return null;

  const goldenQuoteText = getGoldenQuoteAtTime(data, time);
  const text = goldenQuoteText || sentenceText;
  const normalizedQuote = normalizeHighlightText(data.goldenQuote);
  const normalizedCaption = normalizeHighlightText(sentenceText);
  const isGoldenQuote = Boolean(goldenQuoteText) ||
    (normalizedQuote.length > 0 && normalizedCaption.includes(normalizedQuote));
  const citationText = isGoldenQuote ? resolveCitationText(data.bookCitation) : "";
  const quoteLength = Array.from(text).length;
  const quoteFontSize = quoteLength <= 12 ? 86 : quoteLength <= 18 ? 78 : 72;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: 240,
        transform: "translateX(-50%)",
        width: "max-content",
        maxWidth: "96%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: isGoldenQuote && citationText ? 8 : 0,
        boxSizing: "border-box",
        padding: isGoldenQuote ? "15px 25px" : "8px 20px",
        borderRadius: 12,
        border: "none",
        background: "#fff",
        boxShadow: "0 10px 26px rgba(0,0,0,.12)",
        fontFamily: FONT,
        fontSize: isGoldenQuote ? quoteFontSize : 60,
        fontWeight: 900,
        lineHeight: isGoldenQuote ? 1.22 : 1.28,
        textAlign: "center",
        textWrap: "balance",
        color: isGoldenQuote ? HIGHLIGHT_RED : "#b54334",
        textShadow: "0 0 14px rgba(197,141,48,.12)",
      }}
    >
      {citationText ? (
        <div
          style={{
            maxWidth: "100%",
            color: HIGHLIGHT_RED,
            fontFamily: FONT,
            fontSize: 27,
            fontWeight: 900,
            lineHeight: 1.35,
            textAlign: "center",
            overflowWrap: "anywhere",
          }}
        >
          {citationText}
        </div>
      ) : null}
      <div>{text}</div>
    </div>
  );
};
