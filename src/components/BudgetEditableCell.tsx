"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Edit2 } from "lucide-react";

interface BudgetEditableCellProps {
  projectId: string;
  columnName: string;
  initialValue: number | null | undefined;
  type: "number" | "currency";
}

export function BudgetEditableCell({
  projectId,
  columnName,
  initialValue,
  type,
}: BudgetEditableCellProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState((initialValue ?? 0).toString());

  useEffect(() => {
    setValue((initialValue ?? 0).toString());
  }, [initialValue]);

  const handleSave = async () => {
    const numericValue = parseFloat(value) || 0;
    if (numericValue === (initialValue ?? 0)) {
      setIsEditing(false);
      return;
    }

    try {
      const { error } = await supabase
        .from("projects")
        .update({ [columnName]: numericValue })
        .eq("id", projectId);

      if (error) throw error;
      router.refresh();
    } catch (err) {
      console.error(`Failed to update project column ${columnName}:`, err);
      setValue((initialValue ?? 0).toString());
    } finally {
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setValue((initialValue ?? 0).toString());
      setIsEditing(false);
    }
  };

  const formattedValue =
    type === "currency"
      ? `$${(initialValue ?? 0).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : (initialValue ?? 0).toString();

  if (isEditing) {
    return (
      <input
        type="number"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-full bg-zinc-900 border border-[#F6CF38] rounded px-2 py-1 text-white text-sm focus:outline-none"
      />
    );
  }

  return (
    <div
      onDoubleClick={() => setIsEditing(true)}
      className="flex justify-between items-center w-full min-h-[28px] cursor-pointer group"
    >
      <span className="font-semibold text-white">{formattedValue}</span>
      <button
        onClick={() => setIsEditing(true)}
        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-[#F6CF38] transition-all duration-150 cursor-pointer"
      >
        <Edit2 size={12} />
      </button>
    </div>
  );
}
