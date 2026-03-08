export const trunc = (name: string, max = 12) =>
  name.length > max ? name.slice(0, max) + '…' : name
