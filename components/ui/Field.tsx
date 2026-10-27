const CONTROL =
  'w-full rounded-input border-2 border-border px-3 text-[16px] text-ink placeholder:text-muted/70 disabled:cursor-not-allowed';

/**
 * A disabled control is greyed and nothing more — §5 of the brief is explicit
 * that no label or tag may explain why a field is locked.
 */
const SURFACE = 'bg-card disabled:bg-locked';

export function FieldLabel({
  htmlFor,
  children,
  required = false,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="text-[14px] font-medium">
      {children}
      {required ? (
        <>
          {' '}
          <span aria-hidden="true" className="text-required">
            *
          </span>
        </>
      ) : null}
    </label>
  );
}

export function Field({
  label,
  htmlFor,
  required = false,
  hint,
  error,
  children,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel htmlFor={htmlFor} required={required}>
        {label}
      </FieldLabel>
      {children}
      {error ? (
        <span className="text-[13px] text-engineering-text">{error}</span>
      ) : hint ? (
        <span className="text-[13px] text-muted">{hint}</span>
      ) : null}
    </div>
  );
}

export function TextInput({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${CONTROL} ${SURFACE} min-h-field ${className}`} />;
}

export function SelectInput({
  className = '',
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${CONTROL} ${SURFACE} min-h-field ${className}`}>
      {children}
    </select>
  );
}

export function TextArea({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${CONTROL} ${SURFACE} resize-y py-2.5 text-[15px] leading-relaxed ${className}`}
    />
  );
}

/** The Instagram field: a fixed "@" sitting inside the control. */
export function HandleInput({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex min-h-field items-center gap-1 rounded-input border-2 border-border bg-card px-3 focus-within:ring-2 focus-within:ring-primary">
      <span aria-hidden="true" className="text-[16px] text-muted">
        @
      </span>
      <input
        {...props}
        className={`min-h-touch flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-muted/70 ${className}`}
      />
    </div>
  );
}

/** A read-only value shown in the locked surface colour, as on /profile. */
export function ReadOnlyValue({ value }: { value: string }) {
  return (
    <div className="flex min-h-field items-center rounded-input border-2 border-locked bg-locked px-3 text-[16px] text-ink">
      {value}
    </div>
  );
}
