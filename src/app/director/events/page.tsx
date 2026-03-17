"use client";

import { useDirectorEvents } from "@/hooks/useDirectorEvents";
import CreateEventPage from "@/components/pages/director/CreateEventPage";

export default function DirectorPage() {
  const director = useDirectorEvents();

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <h1 className="text-3xl font-bold text-center text-gray-800">
          Bridge Events
        </h1>
        <CreateEventPage
          events={director.events}
          onAdd={() => {}}
          onClick={() => {}}
        />
      </div>
    </div>
  );
}
