import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createComposerHistory } from '../lib/composer';
import { ComposerDock } from './ComposerDock';

describe('ComposerDock', () => {
  it('edits text, reports emoji count, and offers undo, clear, and copy', async () => {
    const onChange = vi.fn();
    const onUndo = vi.fn();
    const onClear = vi.fn();
    const onCopy = vi.fn();
    render(
      <ComposerDock
        history={{ value: 'Hi 😀', undoStack: ['Hi '] }}
        textareaRef={createRef<HTMLTextAreaElement>()}
        onChange={onChange}
        onUndo={onUndo}
        onClear={onClear}
        onCopy={onCopy}
      />,
    );

    expect(screen.getByText('1 emoji selected')).toBeInTheDocument();
    expect(screen.getByLabelText('Emoji composer')).toHaveAttribute('maxlength', '4096');
    await userEvent.type(screen.getByLabelText('Emoji composer'), '!');
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Clear composer' }));
    await userEvent.click(screen.getByRole('button', { name: 'Copy composition' }));

    expect(onChange).toHaveBeenCalledWith('Hi 😀!');
    expect(onUndo).toHaveBeenCalledOnce();
    expect(onClear).toHaveBeenCalledOnce();
    expect(onCopy).toHaveBeenCalledOnce();
  });

  it('disables actions that have nothing to do', () => {
    render(
      <ComposerDock
        history={createComposerHistory()}
        textareaRef={createRef<HTMLTextAreaElement>()}
        onChange={() => undefined}
        onUndo={() => undefined}
        onClear={() => undefined}
        onCopy={() => undefined}
      />,
    );

    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear composer' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Copy composition' })).toBeDisabled();
  });
});
