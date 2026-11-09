"use client";

import { use } from "react";
import StudentSession from "@/components/StudentSession";

export default function ViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <StudentSession key={id} sessionId={id} />;
}
