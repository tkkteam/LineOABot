export default function Spinner({ size = 'md' }) {
  const cls = size === 'lg' ? 'h-10 w-10 border-4' : 'h-6 w-6 border-2';
  return (
    <div className={`${cls} animate-spin rounded-full border-slate-300 border-t-brand-600`} />
  );
}
