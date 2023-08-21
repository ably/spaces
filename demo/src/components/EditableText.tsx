import React, { useCallback, useEffect, useRef } from 'react';
import ContentEditable, { ContentEditableEvent } from 'react-contenteditable';
import sanitize from 'sanitize-html';

interface EditableTextProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onChange' | 'children'> {
  as?: string;
  disabled: boolean;
  value: string;
  onChange(nextValue: string): void;
  maxChars?: number;
  className?: string;
}

export const EditableText: React.FC<EditableTextProps> = ({
  as,
  disabled,
  maxChars = 300,
  value,
  onChange,
  ...restProps
}) => {
  const elementRef = useRef<HTMLElement | null>(null);
  const handleTextChange = useCallback(
    (evt: ContentEditableEvent) => {
      const nextValue = sanitize(evt.target.value, {
        allowedTags: [],
      }).substring(0, maxChars);
      onChange(nextValue);
    },
    [onChange],
  );

  const handleKeyPress = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const { key } = event;
      const enterPressed = key === 'Enter';
      const deleteButtonPressed = key === 'Backspace' || key === 'Delete';
      const replacing = window.getSelection()?.toString() !== '';
      const limitReached = (elementRef.current?.innerText.length ?? 0) >= maxChars;
      if (enterPressed || (limitReached && !replacing && !deleteButtonPressed)) {
        event.stopPropagation();
        event.preventDefault();
        return false;
      }

      return undefined;
    },
    [maxChars],
  );

  useEffect(() => {
    if (!disabled && elementRef.current) {
      moveCursorToEnd(elementRef.current);
    }
  }, [disabled]);

  return (
    <ContentEditable
      tagName={as}
      innerRef={elementRef}
      disabled={disabled}
      html={value}
      onKeyDown={handleKeyPress}
      onKeyUp={handleKeyPress}
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
