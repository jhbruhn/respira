/** Compact labelled range slider with a live numeric readout. */
interface LabeledRangeProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function LabeledRange({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  disabled,
}: LabeledRangeProps) {
  return (
    <label className="block">
      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
        <span>{label}</span>
        <span className="font-mono text-gray-900 dark:text-gray-100">
          {value.toFixed(step < 1 ? 2 : 0)}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
      <input
        type="range"
        className="w-full accent-secondary-600"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  );
}
