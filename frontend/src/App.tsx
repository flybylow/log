import { Route, Routes } from "react-router-dom";
import { DashboardPage } from "./DashboardPage";
import { EventDetailPage } from "./EventDetailPage";
import { SimpleGraphTestPage } from "./SimpleGraphTestPage";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex min-h-0 flex-1 flex-col">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/simple-graph" element={<SimpleGraphTestPage />} />
          <Route path="/event/:hash" element={<EventDetailPage />} />
        </Routes>
      </div>
    </div>
  );
}
