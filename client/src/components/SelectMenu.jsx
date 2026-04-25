import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "./Icon.jsx";

export function SelectMenu({ value, options, onChange, placeholder = "请选择", disabled = false }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listId = useId();
  const activeOption = options.find((option) => option.value === value);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className={`select-menu ${disabled ? "select-menu--disabled" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="select-menu__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="select-menu__value">{activeOption?.label || placeholder}</span>
        <span className="select-menu__chevron" aria-hidden="true">
          <Icon name="expand_more" />
        </span>
      </button>

      {open ? (
        <div className="select-menu__panel" role="listbox" id={listId}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={value === option.value}
              className={`select-menu__option ${
                value === option.value ? "select-menu__option--active" : ""
              }`}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <span>{option.label}</span>
              {option.meta ? <small>{option.meta}</small> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
