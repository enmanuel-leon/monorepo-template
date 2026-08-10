import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div
      className="min-h-screen bg-[#08090B] text-slate-100 antialiased"
      style={{
        background:
          'radial-gradient(1200px 600px at 80% -10%, rgba(123,108,246,0.10), transparent 60%), #08090B',
      }}
    >
      <Outlet />
    </div>
  );
}
