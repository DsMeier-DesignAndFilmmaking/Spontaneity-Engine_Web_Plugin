"use client";

import { useForm } from "react-hook-form";
import { useAuth } from "../AuthContext";

export default function EventForm({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuth();
  const { register, handleSubmit, reset } = useForm();

  const onSubmit = async (data: any) => {
    if (!user) {
      alert("You must be logged in to submit hang outs");
      return;
    }

    try {
      // Parse tags from comma-separated string
      const tags = data.tags 
        ? data.tags.split(",").map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0)
        : [];

      const eventData = {
        ...data,
        tags,
        userId: user.uid,
      };

      const res = await fetch("/api/plugin/submit-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || error.message || "Failed to submit hang out");
      }

      reset();
      onSuccess();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error submitting hang out");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-4 rounded shadow mb-4 space-y-2">
      <input 
        {...register("title", { required: true })} 
        placeholder="Hang Out Title" 
        className="w-full border border-gray-300 p-2 rounded text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      <textarea 
        {...register("description", { required: true })} 
        placeholder="Description" 
        className="w-full border border-gray-300 p-2 rounded text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      <input 
        {...register("tags")} 
        placeholder="Tags (comma-separated)" 
        className="w-full border border-gray-300 p-2 rounded text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      <input 
        {...register("location.lat", { valueAsNumber: true, required: true })} 
        placeholder="Latitude" 
        type="number"
        step="any"
        className="w-full border border-gray-300 p-2 rounded text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      <input 
        {...register("location.lng", { valueAsNumber: true, required: true })} 
        placeholder="Longitude" 
        type="number"
        step="any"
        className="w-full border border-gray-300 p-2 rounded text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
        Submit
      </button>
    </form>
  );
}

