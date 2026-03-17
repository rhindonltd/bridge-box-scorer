import Button from "@/components/common/Button";
import { HeaderContentButtonLayout } from "@/components/common/HeaderContentButtonLayout";
import { useState } from "react";

type Props = {
  title: string;
  onSelectMovement: (value: string) => void;
};

export default function NumberSelector({ title, onSelectMovement }: Props) {
  const [value, setValue] = useState("Mitchell");

  return (
    <HeaderContentButtonLayout
      heading={<h1 className="text-3xl font-bold">{title}</h1>}
      content={
        <div className="flex flex-col w-full gap-4">
          <span className="justify-center items-center">
            Please select the movement type:
          </span>
          <Button
            type="button"
            textColour="text-gray-700"
            bgColour="bg-gray-200"
            hoverColour="hover:bg-gray-300"
            value="Mitchell"
            onClick={() => setValue("Mitchell")}
          />

          <Button
            type="button"
            textColour="text-gray-700"
            bgColour="bg-gray-200"
            hoverColour="hover:bg-gray-300"
            value="Howell"
            onClick={() => setValue("Howell")}
          />
        </div>
      }
      button={
        <Button
          type="button"
          value="Submit"
          onClick={() => onSelectMovement(value)}
        />
      }
    />
  );
}
