import CreateEventForm, { InitialGameDetails } from "@/components/director/events/CreateEventForm";

interface Props {
    onNext: () => void;
}

export function CreateGamePage({ onNext }: Props) {
    return (
        <div className="h-screen flex flex-col overflow-y-auto relative">
            <div className="w-full">
                <div className="flex flex-row w-full">
                    <div className="flex flex-col bg-blue-200 py-2 flex-1">
                        <div className="text-center font-bold">
                            <span>Create Game</span>
                        </div>
                    </div>
                </div>
            </div>

            <CreateEventForm onNext={(event: InitialGameDetails) => onNext()} />
        </div>
    );
}
