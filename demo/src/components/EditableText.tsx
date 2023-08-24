import React, { useCallback, useEffect, useRef } from 'react';
import ContentEditable, { ContentEditableEvent } from 'react-contenteditable';
import sanitize from 'sanitize-html';

interface EditableTextProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onChange' | 'children'> {
  as?: string;
  disabled: boolean;
  value: string;
  onChange(nextValue: string): void;
  maxlength?: number;
  className?: string;
}

export const EditableText: React.FC<EditableTextProps> = ({
  as,
  disabled,
  maxlength = 300,
  value,
  onChange,
  ...restProps
}) => {
  const elementRef = useRef<HTMLElement | null>(null);
  const handleTextChange = useCallback(
    (evt: ContentEditableEvent) => {
      const nextValue = sanitize(evt.target.value, {
        allowedTags: [],
      });

      if (nextValue.length > maxlength) {
        onChange(value);
      } else {
        onChange(nextValue);
      }
    },
    [onChange, maxlength],
  );

  useEffect(() => {
    const element = elementRef.current;
    if (!disabled && element) {
      moveCursorToEnd(element);
    }
  }, [disabled]);

  return (
    <ContentEditable
      tagName={as}
      innerRef={elementRef}
      disabled={disabled}
      html={value}
      onChange={handleTextChange}
      {...restProps}
    />
  );
};

const moveCursorToEnd = (el: HTMLElement) => {
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
};
