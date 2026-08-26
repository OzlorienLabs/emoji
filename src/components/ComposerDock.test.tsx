import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createComposerHistory } from '../lib/composer';
import { iconCatalogFixture } from '../test/catalog-fixture';
import { ComposerDock } from './ComposerDock';

describe('ComposerDock', () => {
  const iconById = new Map(iconCatalogFixture.icons.map((icon) => [icon.id, icon]));

  it('edits text, reports emoji count, and offers undo, clear, and copy', async () => {
    const onChange = vi.fn();
    const onUndo = vi.fn();
    const onClear = vi.fn();
    const onCopy = vi.fn();
    render(
      <ComposerDock
        history={{ value: 'Hi 😀', undoStack: ['Hi '] }}
        editorRef={createRef<HTMLDivElement>()}
        onChange={onChange}
        onUndo={onUndo}
        onClear={onClear}
        onCopy={onCopy}
      />,
    );

    expect(screen.getByText('1 emoji selected')).toBeInTheDocument();
    const box = screen.getByRole('textbox', { name: 'Emoji composer' });
    expect(box).toHaveAttribute('contenteditable', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Clear composer' }));
    await userEvent.click(screen.getByRole('button', { name: 'Copy composition' }));

    expect(onUndo).toHaveBeenCalledOnce();
    expect(onClear).toHaveBeenCalledOnce();
    expect(onCopy).toHaveBeenCalledOnce();

    fireEvent.keyDown(box, { key: 'z', metaKey: true });
    expect(onUndo).toHaveBeenCalledTimes(2);
  });

  it('renders inline vector icon badges inside the single box and handles input', async () => {
    const editorRef = createRef<HTMLDivElement>();
    const onChange = vi.fn();
    render(
      <ComposerDock
        history={{ value: ':arrow-right::code:😀', undoStack: [] }}
        editorRef={editorRef}
        iconById={iconById}
        onChange={onChange}
        onUndo={vi.fn()}
        onClear={vi.fn()}
        onCopy={vi.fn()}
      />,
    );

    expect(screen.getByText('1 emoji, 2 icons selected')).toBeInTheDocument();
    const icons = screen.getAllByTestId('composer-icon');
    expect(icons).toHaveLength(2);
    expect(icons[0]).toHaveAttribute('title', 'Icon: arrow right');
    expect(icons[1]).toHaveAttribute('title', 'Icon: code');

    const box = screen.getByRole('textbox', { name: 'Emoji composer' });
    fireEvent.input(box);
    expect(onChange).toHaveBeenCalledWith(':arrow-right::code:😀');

    // Test input with nested formatting elements
    box.innerHTML = '<span>plain <strong>bold</strong></span>';
    fireEvent.input(box);
    expect(onChange).toHaveBeenCalledWith('plain bold');
    expect(box).not.toHaveAttribute('data-empty');

    // Test input with empty content
    box.innerHTML = '';
    fireEvent.input(box);
    expect(onChange).toHaveBeenCalledWith('');
    expect(box).toHaveAttribute('data-empty', 'true');
  });

  it('re-renders DOM and updates caret when external value changes while focused', () => {
    const editorRef = createRef<HTMLDivElement>();
    const { rerender } = render(
      <ComposerDock
        history={{ value: 'first', undoStack: [] }}
        editorRef={editorRef}
        onChange={vi.fn()}
        onUndo={vi.fn()}
        onClear={vi.fn()}
        onCopy={vi.fn()}
      />,
    );

    const box = screen.getByRole('textbox', { name: 'Emoji composer' });
    box.focus();

    rerender(
      <ComposerDock
        history={{ value: 'second', undoStack: ['first'] }}
        editorRef={editorRef}
        onChange={vi.fn()}
        onUndo={vi.fn()}
        onClear={vi.fn()}
        onCopy={vi.fn()}
      />,
    );

    expect(box).toHaveTextContent('second');
  });

  it('handles empty/null editorRef safely', () => {
    const emptyRef = { current: null };
    render(
      <ComposerDock
        history={{ value: 'test', undoStack: [] }}
        editorRef={emptyRef}
        onChange={vi.fn()}
        onUndo={vi.fn()}
        onClear={vi.fn()}
        onCopy={vi.fn()}
      />,
    );
  });

  it('disables actions that have nothing to do and shows placeholder when empty', () => {
    render(
      <ComposerDock
        history={createComposerHistory()}
        onChange={() => undefined}
        onUndo={() => undefined}
        onClear={() => undefined}
        onCopy={() => undefined}
      />,
    );

    const box = screen.getByRole('textbox', { name: 'Emoji composer' });
    expect(box).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear composer' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Copy composition' })).toBeDisabled();
  });

  it('triggers undo on Ctrl+Z and ignores other keys', () => {
    const onUndo = vi.fn();
    render(
      <ComposerDock
        history={{ value: 'test', undoStack: [''] }}
        onChange={vi.fn()}
        onUndo={onUndo}
        onClear={vi.fn()}
        onCopy={vi.fn()}
      />,
    );

    const box = screen.getByRole('textbox', { name: 'Emoji composer' });
    fireEvent.keyDown(box, { key: 'a' });
    expect(onUndo).not.toHaveBeenCalled();

    fireEvent.keyDown(box, { key: 'z', ctrlKey: true });
    expect(onUndo).toHaveBeenCalledOnce();
  });
});
