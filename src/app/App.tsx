import { useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import VisitorApp from "../features/visitor/VisitorApp";
import { loadCustomNpcs } from "../domain/customNpcStorage";
import { VillagerApp } from "../features/villager/VillagerApp";
import { StudioApp } from "../features/studio/StudioApp";
import type { Npc } from "../types";

export default function App() {
  const [customNpcs, setCustomNpcs] = useState<Npc[]>(() => loadCustomNpcs());
  const shared = { customNpcs, setCustomNpcs };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/villager" element={<VillagerApp {...shared} />} />
        <Route path="/villager/*" element={<VillagerApp {...shared} />} />
        <Route path="/studio" element={<StudioApp {...shared} />} />
        <Route path="/studio/*" element={<StudioApp {...shared} />} />
        <Route path="*" element={<VisitorApp portal="visitor" {...shared} />} />
      </Routes>
    </BrowserRouter>
  );
}
