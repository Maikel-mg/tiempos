import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useEntrySelection } from '../useEntrySelection';

describe('useEntrySelection', () => {
  it('arranca sin selección y con la tabla sin montar', () => {
    const { result } = renderHook(() => useEntrySelection());

    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.tableRef.current).toBeNull();
  });

  it('setSelectedIds reemplaza la selección', () => {
    const { result } = renderHook(() => useEntrySelection());

    act(() => {
      result.current.setSelectedIds(new Set(['a', 'b']));
    });

    expect([...result.current.selectedIds].sort()).toEqual(['a', 'b']);
  });

  it('handleEntryDeleted quita el id borrado y conserva el resto', () => {
    const { result } = renderHook(() => useEntrySelection());

    act(() => {
      result.current.setSelectedIds(new Set(['a', 'b', 'c']));
    });
    act(() => {
      result.current.handleEntryDeleted('b');
    });

    expect([...result.current.selectedIds].sort()).toEqual(['a', 'c']);
  });

  it('handleEntryDeleted con un id ausente no altera la selección', () => {
    const { result } = renderHook(() => useEntrySelection());

    act(() => {
      result.current.setSelectedIds(new Set(['a']));
    });
    act(() => {
      result.current.handleEntryDeleted('z');
    });

    expect([...result.current.selectedIds]).toEqual(['a']);
  });
});
