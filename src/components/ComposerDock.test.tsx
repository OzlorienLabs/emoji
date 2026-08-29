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

    // Test input with nested formatting elements and non-element nodes (comment)
    box.innerHTML = '<span>plain <strong>bold</strong></span>';
    box.appendChild(document.createComment('test comment node'));
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

  describe('Chrome Built-in AI polish integration', () => {
    it('does not render AI polish button when isAIAvailable is false', () => {
      render(
        <ComposerDock
          history={{ value: 'Hello world 🚀', undoStack: [] }}
          isAIAvailable={false}
          onChange={vi.fn()}
          onUndo={vi.fn()}
          onClear={vi.fn()}
          onCopy={vi.fn()}
        />,
      );

      expect(screen.queryByRole('button', { name: /polish/i })).not.toBeInTheDocument();
    });

    it('renders single-click AI polish button and triggers onPolish when clicked', async () => {
      const onPolish = vi.fn();
      render(
        <ComposerDock
          history={{ value: 'Hello team 🚀', undoStack: [] }}
          isAIAvailable={true}
          onPolish={onPolish}
          onChange={vi.fn()}
          onUndo={vi.fn()}
          onClear={vi.fn()}
          onCopy={vi.fn()}
        />,
      );

      const polishBtn = screen.getByRole('button', { name: /polish message with ai/i });
      expect(polishBtn).toBeInTheDocument();
      expect(polishBtn).not.toBeDisabled();

      await userEvent.click(polishBtn);
      expect(onPolish).toHaveBeenCalledOnce();
    });

    it('renders Regenerate label when hasPolished is true', async () => {
      const onPolish = vi.fn();
      render(
        <ComposerDock
          history={{ value: 'Polished draft 🚀', undoStack: ['Draft 🚀'] }}
          isAIAvailable={true}
          hasPolished={true}
          onPolish={onPolish}
          onChange={vi.fn()}
          onUndo={vi.fn()}
          onClear={vi.fn()}
          onCopy={vi.fn()}
        />,
      );

      const regenBtn = screen.getByRole('button', { name: /regenerate polished message with ai/i });
      expect(regenBtn).toBeInTheDocument();
      expect(regenBtn).toHaveTextContent('Regenerate');

      await userEvent.click(regenBtn);
      expect(onPolish).toHaveBeenCalledOnce();
    });

    it('works when onPolish callback is not provided', async () => {
      render(
        <ComposerDock
          history={{ value: 'Hello', undoStack: [] }}
          isAIAvailable={true}
          onChange={vi.fn()}
          onUndo={vi.fn()}
          onClear={vi.fn()}
          onCopy={vi.fn()}
        />,
      );

      const polishBtn = screen.getByRole('button', { name: /polish message with ai/i });
      await userEvent.click(polishBtn);
    });

    it('shows in-box loading animation overlay and handles cancel when isPolishing is true', async () => {
      const onCancelPolish = vi.fn();
      const { rerender } = render(
        <ComposerDock
          history={{ value: 'Message being polished', undoStack: [] }}
          isAIAvailable={true}
          isPolishing={true}
          onCancelPolish={onCancelPolish}
          onChange={vi.fn()}
          onUndo={vi.fn()}
          onClear={vi.fn()}
          onCopy={vi.fn()}
        />,
      );

      const box = screen.getByRole('textbox', { name: 'Emoji composer' });
      expect(box).toHaveAttribute('aria-busy', 'true');
      expect(box).toHaveAttribute('contenteditable', 'false');

      // In-box animation overlay is visible
      const overlay = screen.getByRole('status', { name: /polishing message with on-device ai/i });
      expect(overlay).toBeInTheDocument();
      expect(screen.getByText('Polishing with on-device AI…')).toBeInTheDocument();

      const polishBtn = screen.getByRole('button', { name: /polishing message with on-device ai/i });
      expect(polishBtn).toHaveTextContent('Polishing…');

      await userEvent.click(polishBtn);
      expect(onCancelPolish).toHaveBeenCalledOnce();

      // Test cancel when onCancelPolish prop is undefined
      rerender(
        <ComposerDock
          history={{ value: 'Message being polished', undoStack: [] }}
          isAIAvailable={true}
          isPolishing={true}
          onChange={vi.fn()}
          onUndo={vi.fn()}
          onClear={vi.fn()}
          onCopy={vi.fn()}
        />,
      );
      await userEvent.click(screen.getByRole('button', { name: /polishing message with on-device ai/i }));
    });
  });
});
