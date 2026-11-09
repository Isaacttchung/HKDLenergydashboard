"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RelationEntry } from "@/lib/types";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface RelationsPanelProps {
  relations: RelationEntry[];
}

export function RelationsPanel({ relations }: RelationsPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Data Relations</CardTitle>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {relations.length === 0 ? (
              <p className="text-sm text-slate-500">
                No relations match the current selection.
              </p>
            ) : (
              relations.map((relation) => (
                <div key={relation.id} className="space-y-2 border-t pt-4 first:border-t-0 first:pt-0">
                  <h4 className="font-medium text-brand-foreground">{relation.title}</h4>
                  <p className="text-sm text-slate-600">{relation.description}</p>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-slate-500">
                    {relation.watchFor.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
