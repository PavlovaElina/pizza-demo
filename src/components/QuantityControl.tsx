type Props = {
  name: string;
  quantity: number;
  disabled?: boolean;
  onIncrease: () => void;
  onDecrease: () => void;
};
export default function QuantityControl({
  name,
  quantity,
  disabled = false,
  onIncrease,
  onDecrease,
}: Props) {
  return (
    <div className="quantity" role="group" aria-label={`Количество: ${name}`}>
      <button
        type="button"
        disabled={disabled}
        aria-label={`Уменьшить: ${name}`}
        onClick={onDecrease}
      >
        −
      </button>
      <output aria-live="polite" aria-label={`Количество пицц: ${name}`}>
        {quantity}
      </output>
      <button
        type="button"
        disabled={disabled || quantity >= 99}
        aria-label={`Увеличить: ${name}`}
        onClick={onIncrease}
      >
        +
      </button>
    </div>
  );
}
