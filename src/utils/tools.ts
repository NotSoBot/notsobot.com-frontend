export const activeClassName = (initialClassName?: string) => {
  return (props: {isActive: boolean}): string => {
    return [initialClassName, (props.isActive) ? 'active' : undefined].filter(Boolean).join(' ');
  };
};


export function formatMemory(bytes: bigint | number, decimals: number = 0): string {
  bytes = Number(bytes);
  const divideBy = 1024;
  const amount = Math.floor(Math.log(bytes) / Math.log(divideBy));
  const type = (['B', 'KB', 'MB','GB', 'TB'])[amount];
  return (bytes / Math.pow(divideBy, amount)).toFixed(decimals) + ' ' + type;
}


export function shuffleArray<T>(
  array: Array<T>,
): Array<T> {
  for (let i = array.length - 1; 0 < i; i--) {
    let x = Math.floor(Math.random() * (i + 1));
    const current = array[i];
    array[i] = array[x];
    array[x] = current;
  }
  return array;
}
