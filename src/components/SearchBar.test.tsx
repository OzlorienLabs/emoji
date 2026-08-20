import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SearchBar } from './SearchBar';

function ControlledSearch({ initialValue = '' }: { initialValue?: string }) {
  const [value, setValue] = useState(initialValue);

  return (
    <SearchBar
      value={value}
      onChange={setValue}
      resultCount={value ? 1 : 12}
      resultsId="emoji-results"
    />
  );
}

describe('SearchBar', () => {
  it('exposes a labeled controlled search field and a live result count', async () => {
    const user = userEvent.setup();
    render(<ControlledSearch />);

    const input = screen.getByRole('searchbox', { name: 'Search emojis' });
    expect(input).toHaveAttribute('aria-controls', 'emoji-results');
    expect(input).toHaveAttribute('maxlength', '120');
    expect(screen.getByRole('status')).toHaveTextContent('12 emojis found');

    await user.type(input, 'heart');

    expect(input).toHaveValue('heart');
    expect(screen.getByRole('status')).toHaveTextContent('1 emoji found');
  });

  it('clears the query, restores focus, and supports a custom result message', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SearchBar
        value="party"
        onChange={onChange}
        statusMessage="Best matches for party"
      />,
    );

    const input = screen.getByRole('searchbox', { name: 'Search emojis' });
    await user.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(onChange).toHaveBeenCalledWith('');
    expect(input).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('Best matches for party');
  });

  it('allows custom labels and prevents the search form from navigating', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <SearchBar
        value=""
        label="Find a feeling"
        placeholder="Try celebration"
        onChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    const input = screen.getByPlaceholderText('Try celebration');
    expect(input).toHaveAccessibleName('Find a feeling');
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();

    await user.type(input, '{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('attaches an optional input ref for app-level keyboard focus', () => {
    const inputRef = createRef<HTMLInputElement>();
    render(
      <SearchBar
        value=""
        onChange={vi.fn()}
        inputRef={inputRef}
      />,
    );

    expect(inputRef.current).toBe(screen.getByRole('searchbox'));
    inputRef.current?.focus();
    expect(screen.getByRole('searchbox')).toHaveFocus();
  });
});
