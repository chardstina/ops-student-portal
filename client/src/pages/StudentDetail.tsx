import { useParams } from "react-router-dom";
import { StudentDashboardView } from "../components/StudentDashboardView";

export default function StudentDetail() {
  const { id } = useParams();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Student Record</h1>
      {id && <StudentDashboardView studentId={id} />}
    </div>
  );
}
