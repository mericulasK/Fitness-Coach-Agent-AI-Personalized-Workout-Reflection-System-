import { Loader2 } from 'lucide-react';

export default function RootLoading() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-zinc-400 text-sm">Yükleniyor...</p>
      </div>
    </div>
  );
}
