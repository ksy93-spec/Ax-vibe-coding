export default function Button({ primary, className = '', ...props }) {
  const base = 'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-accent';
  const look = primary
    ? 'border-accent bg-accent text-on-accent hover:opacity-90'
    : 'border-line-strong bg-surface text-fg hover:bg-hover';
  return <button type="button" className={base + ' ' + look + ' ' + className} {...props} />;
}
