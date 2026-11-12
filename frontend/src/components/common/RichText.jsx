// Renders backend messages where **double asterisks** mark bold spans.
export default function RichText({ text }) {
  return text.split("**").map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
}
