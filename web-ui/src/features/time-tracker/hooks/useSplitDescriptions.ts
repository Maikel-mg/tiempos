import { useEffect, useState } from 'react';

/**
 * Descripción editable de cada mitad en el diálogo de "Dividir".
 *
 * Al abrirse, las dos arrancan con la del Registro; después cada una es libre.
 * Se aísla del resto del estado del corte para que `useSplitCut` no siga creciendo.
 */
export function useSplitDescriptions(open: boolean, original: string | undefined) {
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');

  useEffect(() => {
    if (!open) return;
    setFirst(original ?? '');
    setSecond(original ?? '');
  }, [open, original]);

  return { first, second, setFirst, setSecond };
}
