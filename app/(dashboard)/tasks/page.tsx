import { getTasksForManager } from "@/lib/task-stats";
import { TasksClient } from "@/components/tasks/TasksClient";

export default async function TasksPage() {
  const tasks = await getTasksForManager();
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <TasksClient tasks={tasks} />
    </div>
  );
}
