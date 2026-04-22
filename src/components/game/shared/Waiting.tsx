export default function Waiting({ text }: { text: string }) {
  return (
    <div className="panel flex min-h-28 items-center justify-center p-8">
      <p className="font-serif italic text-parchment/45 text-center">{text}</p>
    </div>
  );
}
