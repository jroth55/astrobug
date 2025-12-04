import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div className="flex items-center gap-2">
      <button className="px-3 py-2 rounded bg-primary text-white" onClick={() => setCount((c) => c - 1)}>-</button>
      <span className="text-lg font-medium">{count}</span>
      <button className="px-3 py-2 rounded bg-primary text-white" onClick={() => setCount((c) => c + 1)}>+</button>
    </div>
  );
}
