import { Route, Routes } from "react-router-dom";
import { DashboardPage } from "./DashboardPage";
import { EventDetailPage } from "./EventDetailPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/event/:hash" element={<EventDetailPage />} />
    </Routes>
  );
}
