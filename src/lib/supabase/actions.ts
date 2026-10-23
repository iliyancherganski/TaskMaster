import { supabase, isSupabaseConfigured } from "./client";
import {
  Status,
  Project,
  TaskType,
  User,
  TaskWithDetails,
  TaskFormData,
  ResourceWithFiles,
  TaskBreadcrumb,
  Software,
  Database,
} from "@/types/database.types";

// ============================================================
// Default initial data for demo/offline fallback mode
// ============================================================
const INITIAL_DEMO_STATUSES: Status[] = [
  {
    id: "status-1",
    name: "Backlog",
    description: "Tasks awaiting prioritization or grooming",
    color: "#64748b",
    position: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: "status-2",
    name: "To Do",
    description: "Ready to start development",
    color: "#3b82f6",
    position: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: "status-3",
    name: "In Progress",
    description: "Actively being worked on",
    color: "#f59e0b",
    position: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: "status-4",
    name: "In Review",
    description: "Code review, QA testing or client feedback",
    color: "#8b5cf6",
    position: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: "status-5",
    name: "Done",
    description: "Completed and verified",
    color: "#10b981",
    position: 4,
    created_at: new Date().toISOString(),
  },
];

let demoStatusesState: Status[] = [...INITIAL_DEMO_STATUSES];

const INITIAL_DEMO_PROJECTS: Project[] = [
  {
    id: "project-1",
    name: "TaskMaster Sprint 1",
    description: "Core Single Page Kanban Application",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "project-2",
    name: "Mobile App Redesign",
    description: "NextGen React Native responsive redesign",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let demoProjectsState: Project[] = [...INITIAL_DEMO_PROJECTS];

const INITIAL_DEMO_TASKTYPES: TaskType[] = [
  { id: "type-1", name: "Feature", color: "#3b82f6", created_at: new Date().toISOString() },
  { id: "type-2", name: "Bug", color: "#ef4444", created_at: new Date().toISOString() },
  { id: "type-3", name: "Improvement", color: "#10b981", created_at: new Date().toISOString() },
  { id: "type-4", name: "Design", color: "#ec4899", created_at: new Date().toISOString() },
  { id: "type-5", name: "Documentation", color: "#8b5cf6", created_at: new Date().toISOString() },
];

let demoTaskTypesState: TaskType[] = [...INITIAL_DEMO_TASKTYPES];

export const INITIAL_DEMO_SOFTWARES: Software[] = [
  {
    id: "soft-1",
    name: "Figma",
    icon_url: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/figma/figma-original.svg",
    created_at: new Date().toISOString(),
  },
  {
    id: "soft-2",
    name: "Blender",
    icon_url: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/blender/blender-original.svg",
    created_at: new Date().toISOString(),
  },
  {
    id: "soft-3",
    name: "Photoshop",
    icon_url: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/photoshop/photoshop-plain.svg",
    created_at: new Date().toISOString(),
  },
  {
    id: "soft-4",
    name: "VS Code",
    icon_url: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vscode/vscode-original.svg",
    created_at: new Date().toISOString(),
  },
  {
    id: "soft-5",
    name: "Unreal Engine",
    icon_url: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/unrealengine/unrealengine-original.svg",
    created_at: new Date().toISOString(),
  },
  {
    id: "soft-6",
    name: "Illustrator",
    icon_url: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/illustrator/illustrator-plain.svg",
    created_at: new Date().toISOString(),
  },
];

let demoSoftwaresState: Software[] = [...INITIAL_DEMO_SOFTWARES];
let demoTasksSoftwaresState: { Task_Id: string; Software_Id: string }[] = [
  { Task_Id: "task-1", Software_Id: "soft-4" },
  { Task_Id: "task-1", Software_Id: "soft-1" },
  { Task_Id: "task-2", Software_Id: "soft-1" },
  { Task_Id: "task-2", Software_Id: "soft-3" },
  { Task_Id: "task-3", Software_Id: "soft-2" },
  { Task_Id: "task-3", Software_Id: "soft-3" },
  { Task_Id: "task-3", Software_Id: "soft-5" },
  { Task_Id: "task-3", Software_Id: "soft-6" },
  { Task_Id: "task-demo-4", Software_Id: "soft-1" },
  { Task_Id: "task-demo-4", Software_Id: "soft-2" },
  { Task_Id: "task-demo-4", Software_Id: "soft-3" },
  { Task_Id: "task-demo-4", Software_Id: "soft-5" },
  { Task_Id: "task-demo-4", Software_Id: "soft-6" },
];

const INITIAL_DEMO_USERS: User[] = [
  {
    id: "user-1",
    Name: "Sarah Connor",
    email: "sarah@taskmaster.dev",
    password: null,
    avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "user-2",
    Name: "Alex Rivera",
    email: "alex@taskmaster.dev",
    password: null,
    avatar_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "user-3",
    Name: "Elena Rostova",
    email: "elena@taskmaster.dev",
    password: null,
    avatar_url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let demoTasksState: TaskWithDetails[] = [
  {
    id: "task-1",
    name: "Implement Supabase Auth and User session handling",
    description: "Connect auth.users trigger to public.Users and verify JWT tokens in middleware.",
    status_id: "status-2",
    Task_Parent_Id: null,
    Project_id: "project-1",
    position: 0,
    due_date: new Date(Date.now() + 86400000 * 3).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    task_types: [INITIAL_DEMO_TASKTYPES[0]],
    assignees: [INITIAL_DEMO_USERS[0]],
    breadcrumbs: [{ id: "task-1", name: "Implement Supabase Auth and User session handling" }],
    subtasks: [
      {
        id: "subtask-1-1",
        name: "Create auth trigger handle_new_user()",
        description: "Postgres function to auto-sync auth.users to public.Users",
        status_id: "status-5",
        Task_Parent_Id: "task-1",
        Project_id: "project-1",
        position: 0,
        due_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        task_types: [INITIAL_DEMO_TASKTYPES[1]],
        assignees: [INITIAL_DEMO_USERS[0]],
        subtasks: [],
        resources: [],
        breadcrumbs: [
          { id: "task-1", name: "Implement Supabase Auth and User session handling" },
          { id: "subtask-1-1", name: "Create auth trigger handle_new_user()" },
        ],
      },
      {
        id: "subtask-1-2",
        name: "Test OAuth login providers",
        description: "Google and GitHub auth flow verification",
        status_id: "status-2",
        Task_Parent_Id: "task-1",
        Project_id: "project-1",
        position: 1,
        due_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        task_types: [INITIAL_DEMO_TASKTYPES[0]],
        assignees: [INITIAL_DEMO_USERS[1]],
        subtasks: [],
        resources: [],
        breadcrumbs: [
          { id: "task-1", name: "Implement Supabase Auth and User session handling" },
          { id: "subtask-1-2", name: "Test OAuth login providers" },
        ],
      },
    ],
    resources: [],
  },
  {
    id: "task-2",
    name: "Design and test Kanban @dnd-kit drag interactions",
    description: "Ensure smooth drag animations, collision detection, and optimistic UI updates across columns.",
    status_id: "status-3",
    Task_Parent_Id: null,
    Project_id: "project-1",
    position: 0,
    due_date: new Date(Date.now() + 86400000 * 2).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    task_types: [INITIAL_DEMO_TASKTYPES[0], INITIAL_DEMO_TASKTYPES[3]],
    assignees: [INITIAL_DEMO_USERS[1], INITIAL_DEMO_USERS[2]],
    breadcrumbs: [{ id: "task-2", name: "Design and test Kanban @dnd-kit drag interactions" }],
    subtasks: [
      {
        id: "subtask-2-1",
        name: "Configure PointerSensor and KeyboardSensor",
        description: "Prevent click conflict with activation constraint",
        status_id: "status-5",
        Task_Parent_Id: "task-2",
        Project_id: "project-1",
        position: 0,
        due_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        task_types: [INITIAL_DEMO_TASKTYPES[2]],
        assignees: [INITIAL_DEMO_USERS[1]],
        subtasks: [],
        resources: [],
        breadcrumbs: [
          { id: "task-2", name: "Design and test Kanban @dnd-kit drag interactions" },
          { id: "subtask-2-1", name: "Configure PointerSensor and KeyboardSensor" },
        ],
      },
      {
        id: "subtask-2-2",
        name: "Add custom DragOverlay card preview",
        description: "Smooth 2-degree card tilt while dragging",
        status_id: "status-3",
        Task_Parent_Id: "task-2",
        Project_id: "project-1",
        position: 1,
        due_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        task_types: [INITIAL_DEMO_TASKTYPES[3]],
        assignees: [INITIAL_DEMO_USERS[2]],
        subtasks: [],
        resources: [],
        breadcrumbs: [
          { id: "task-2", name: "Design and test Kanban @dnd-kit drag interactions" },
          { id: "subtask-2-2", name: "Add custom DragOverlay card preview" },
        ],
      },
    ],
    resources: [],
  },
  {
    id: "task-3",
    name: "Storage file uploader for Task resources",
    description: "Direct drag-and-drop file upload to Supabase Storage 'task-attachments' bucket.",
    status_id: "status-4",
    Task_Parent_Id: null,
    Project_id: "project-1",
    position: 0,
    due_date: new Date(Date.now() + 86400000 * 4).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    task_types: [INITIAL_DEMO_TASKTYPES[0], INITIAL_DEMO_TASKTYPES[2]],
    assignees: [INITIAL_DEMO_USERS[0]],
    subtasks: [],
    resources: [
      {
        id: "res-1",
        name: "architecture-diagram.png",
        description: null,
        Task_Id: "task-3",
        created_at: new Date().toISOString(),
        files: [
          {
            id: "file-1",
            Url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800",
            Resource_Id: "res-1",
            created_at: new Date().toISOString(),
          },
        ],
      },
    ],
  },
  {
    id: "task-4",
    name: "Database schema migrations and RLS verification",
    description: "Write complete SQL script with Users, Tasks, Status, TaskTypes, and junction tables.",
    status_id: "status-5",
    Task_Parent_Id: null,
    Project_id: "project-1",
    position: 0,
    due_date: new Date(Date.now() - 86400000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    task_types: [INITIAL_DEMO_TASKTYPES[4]],
    assignees: [INITIAL_DEMO_USERS[1]],
    subtasks: [],
    resources: [],
  },
];

// ============================================================
// Real Supabase Data Fetching & Mutations
// ============================================================

export async function fetchBoardData(): Promise<{
  statuses: Status[];
  projects: Project[];
  taskTypes: TaskType[];
  softwares: Software[];
  users: User[];
  tasks: TaskWithDetails[];
  allTasks: TaskWithDetails[];
  isConfigured: boolean;
}> {
  if (!isSupabaseConfigured) {
    if (typeof window !== "undefined") {
      const applyOrder = (taskList: TaskWithDetails[]) => {
        taskList.forEach((t) => {
          if (t.resources && t.resources.length > 1) {
            try {
              const cachedOrder = localStorage.getItem(`task_resource_order_${t.id}`);
              if (cachedOrder) {
                const orderArr: string[] = JSON.parse(cachedOrder);
                t.resources.sort((a, b) => {
                  const idxA = orderArr.indexOf(a.id);
                  const idxB = orderArr.indexOf(b.id);
                  if (idxA === -1 && idxB === -1) return 0;
                  if (idxA === -1) return 1;
                  if (idxB === -1) return -1;
                  return idxA - idxB;
                });
              }
            } catch (e) {}
          }
          if (t.subtasks && t.subtasks.length > 0) applyOrder(t.subtasks);
        });
      };
      applyOrder(demoTasksState);
    }

    // Enrich demo tasks with softwares
    const enrichDemoWithSoftwares = (list: TaskWithDetails[]): TaskWithDetails[] => {
      return list.map((t) => {
        const softIds = demoTasksSoftwaresState
          .filter((rel) => rel.Task_Id === t.id)
          .map((rel) => rel.Software_Id);
        const softwares = softIds
          .map((id) => demoSoftwaresState.find((s) => s.id === id))
          .filter(Boolean) as Software[];
        const enrichedSubtasks =
          t.subtasks && t.subtasks.length > 0
            ? enrichDemoWithSoftwares(t.subtasks)
            : t.subtasks;
        return { ...t, softwares, subtasks: enrichedSubtasks };
      });
    };
    const enrichedTasks = enrichDemoWithSoftwares(demoTasksState);

    return {
      statuses: demoStatusesState,
      projects: demoProjectsState,
      taskTypes: demoTaskTypesState,
      softwares: demoSoftwaresState,
      users: INITIAL_DEMO_USERS,
      tasks: enrichedTasks,
      allTasks: enrichedTasks,
      isConfigured: false,
    };
  }

  try {
    // 1. Fetch statuses
    const { data: rawStatuses, error: statusErr } = await supabase
      .from("Status")
      .select("*")
      .order("position", { ascending: true });
    if (statusErr) throw statusErr;
    const statuses = (rawStatuses || []) as Status[];

    // 2. Fetch projects
    const { data: rawProjects, error: projErr } = await supabase
      .from("Projects")
      .select("*")
      .order("name", { ascending: true });
    if (projErr) throw projErr;
    const projects = (rawProjects || []) as Project[];

    // 3. Fetch task types
    const { data: rawTaskTypes, error: typesErr } = await supabase
      .from("TaskTypes")
      .select("*")
      .order("name", { ascending: true });
    if (typesErr) throw typesErr;
    const taskTypes = (rawTaskTypes || []) as TaskType[];

    // Fetch softwares
    let softwares: Software[] = [];
    try {
      const { data: rawSoftwares } = await supabase
        .from("Softwares")
        .select("*")
        .order("name", { ascending: true });
      softwares = (rawSoftwares || []) as Software[];
    } catch (e) {
      console.warn("Softwares table query warning:", e);
    }
    const softwaresMap = new Map(softwares.map((s) => [s.id, s]));

    // 4. Fetch users
    const { data: rawUsers, error: usersErr } = await supabase
      .from("Users")
      .select("*")
      .order("Name", { ascending: true });
    if (usersErr) throw usersErr;
    const users = (rawUsers || []) as User[];

    // 5. Fetch all tasks
    const { data: rawTasks, error: tasksErr } = await supabase
      .from("Tasks")
      .select("*")
      .order("position", { ascending: true });
    if (tasksErr) throw tasksErr;

    // 6. Fetch task relations: TaskTypes_Tasks, TasksUsers, Tasks_Softwares, Resources, Files
    const { data: rawTypeRelations } = await supabase.from("TaskTypes_Tasks").select("*");
    const { data: rawUserRelations } = await supabase.from("TasksUsers").select("*");
    let rawSoftwareRelations: { Task_Id: string; Software_Id: string }[] = [];
    try {
      const { data: softRelData } = await supabase.from("Tasks_Softwares").select("*");
      rawSoftwareRelations = (softRelData || []) as { Task_Id: string; Software_Id: string }[];
    } catch (e) {
      console.warn("Tasks_Softwares table query warning:", e);
    }
    const { data: rawResources } = await supabase.from("Resources").select("*");
    const { data: rawFiles } = await supabase.from("Files").select("*");

    const statusesMap = new Map(statuses.map((s) => [s.id, s]));
    const projectsMap = new Map(projects.map((p) => [p.id, p]));
    const typesMap = new Map(taskTypes.map((t) => [t.id, t]));
    const usersMap = new Map(users.map((u) => [u.id, u]));

    const resourcesWithFiles: ResourceWithFiles[] = (rawResources || []).map((res) => {
      // Clean legacy auto-generated file size descriptions
      const isAutoGeneratedDesc =
        res.description &&
        (res.description.startsWith("Uploaded file") ||
          res.description.includes("KB") ||
          res.description === "Linked image via URL" ||
          res.description.includes("•"));
      return {
        ...res,
        description: isAutoGeneratedDesc ? null : res.description,
        files: (rawFiles || []).filter((f) => f.Resource_Id === res.id),
      };
    });

    // First pass: create all task objects with their full properties
    const enrichedTasksMap = new Map<string, TaskWithDetails>();
    (rawTasks || []).forEach((t) => {
      const taskTypeIds = (rawTypeRelations || [])
        .filter((rel) => rel.Task_Id === t.id)
        .map((rel) => rel.TaskType_Id);
      const assignedTypes = taskTypeIds
        .map((id) => typesMap.get(id))
        .filter(Boolean) as TaskType[];

      const userIds = (rawUserRelations || [])
        .filter((rel) => rel.Task_Id === t.id)
        .map((rel) => rel.User_Id);
      const assignedUsers = userIds
        .map((id) => usersMap.get(id))
        .filter(Boolean) as User[];

      const softIds = (rawSoftwareRelations || [])
        .filter((rel) => rel.Task_Id === t.id)
        .map((rel) => rel.Software_Id);
      const assignedSoftwares = softIds
        .map((id) => softwaresMap.get(id))
        .filter(Boolean) as Software[];

      let taskResources = resourcesWithFiles.filter((r) => r.Task_Id === t.id);
      if (typeof window !== "undefined") {
        try {
          const cachedOrder = localStorage.getItem(`task_resource_order_${t.id}`);
          if (cachedOrder) {
            const orderArr: string[] = JSON.parse(cachedOrder);
            taskResources.sort((a, b) => {
              const idxA = orderArr.indexOf(a.id);
              const idxB = orderArr.indexOf(b.id);
              if (idxA === -1 && idxB === -1) return 0;
              if (idxA === -1) return 1;
              if (idxB === -1) return -1;
              return idxA - idxB;
            });
          }
        } catch (e) {}
      }

      enrichedTasksMap.set(t.id, {
        ...t,
        status: t.status_id ? statusesMap.get(t.status_id) || null : null,
        project: t.Project_id ? projectsMap.get(t.Project_id) || null : null,
        task_types: assignedTypes,
        assignees: assignedUsers,
        softwares: assignedSoftwares,
        subtasks: [],
        resources: taskResources,
        breadcrumbs: [],
      });
    });

    // Second pass: link subtasks to their parent tasks
    enrichedTasksMap.forEach((task) => {
      if (task.Task_Parent_Id && enrichedTasksMap.has(task.Task_Parent_Id)) {
        const parent = enrichedTasksMap.get(task.Task_Parent_Id)!;
        parent.subtasks.push(task);
      }
    });

    // Third pass: compute directory breadcrumbs for every task
    enrichedTasksMap.forEach((task) => {
      const crumbs: TaskBreadcrumb[] = [{ id: task.id, name: task.name }];
      let currentParentId = task.Task_Parent_Id;
      const visited = new Set<string>([task.id]);
      while (currentParentId && enrichedTasksMap.has(currentParentId)) {
        if (visited.has(currentParentId)) break;
        visited.add(currentParentId);
        const parent = enrichedTasksMap.get(currentParentId)!;
        crumbs.unshift({ id: parent.id, name: parent.name });
        currentParentId = parent.Task_Parent_Id;
      }
      task.breadcrumbs = crumbs;
    });

    const topLevelTasks = Array.from(enrichedTasksMap.values()).filter((t) => !t.Task_Parent_Id);
    const allTasksList = Array.from(enrichedTasksMap.values());

    return {
      statuses: statuses || [],
      projects: projects || [],
      taskTypes: taskTypes || [],
      softwares: softwares || [],
      users: users || [],
      tasks: topLevelTasks,
      allTasks: allTasksList,
      isConfigured: true,
    };
  } catch (error) {
    console.error("Supabase data fetch error, falling back to local state:", error);
    return {
      statuses: demoStatusesState,
      projects: demoProjectsState,
      taskTypes: demoTaskTypesState,
      softwares: demoSoftwaresState,
      users: INITIAL_DEMO_USERS,
      tasks: demoTasksState,
      allTasks: demoTasksState,
      isConfigured: false,
    };
  }
}

// ------------------------------------------------------------
// Create Task (Root Task or Subtask)
// ------------------------------------------------------------
export async function createTask(formData: TaskFormData): Promise<TaskWithDetails> {
  if (!isSupabaseConfigured) {
    const assignedSoftwares = demoSoftwaresState.filter((s) =>
      formData.software_ids?.includes(s.id)
    );
    const newTask: TaskWithDetails = {
      id: "task-" + Date.now(),
      name: formData.name,
      description: formData.description || null,
      status_id: formData.status_id || INITIAL_DEMO_STATUSES[0].id,
      Task_Parent_Id: formData.Task_Parent_Id || null,
      Project_id: formData.Project_id || INITIAL_DEMO_PROJECTS[0].id,
      position: demoTasksState.length,
      due_date: formData.due_date || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      task_types: INITIAL_DEMO_TASKTYPES.filter((t) => formData.task_type_ids?.includes(t.id)),
      assignees: INITIAL_DEMO_USERS.filter((u) => formData.assignee_ids?.includes(u.id)),
      softwares: assignedSoftwares,
      subtasks: [],
      resources: [],
      breadcrumbs: [],
    };

    if (formData.software_ids && formData.software_ids.length > 0) {
      formData.software_ids.forEach((sId) => {
        demoTasksSoftwaresState.push({ Task_Id: newTask.id, Software_Id: sId });
      });
    }

    if (formData.Task_Parent_Id) {
      const addSubtaskRecursively = (tasks: TaskWithDetails[]): boolean => {
        for (const t of tasks) {
          if (t.id === formData.Task_Parent_Id) {
            t.subtasks.push(newTask);
            newTask.breadcrumbs = [
              ...(t.breadcrumbs || [{ id: t.id, name: t.name }]),
              { id: newTask.id, name: newTask.name },
            ];
            return true;
          }
          if (t.subtasks && t.subtasks.length > 0) {
            if (addSubtaskRecursively(t.subtasks)) return true;
          }
        }
        return false;
      };
      addSubtaskRecursively(demoTasksState);
    } else {
      newTask.breadcrumbs = [{ id: newTask.id, name: newTask.name }];
      demoTasksState = [newTask, ...demoTasksState];
    }
    return newTask;
  }

  // Live Supabase Insert
  const { data: insertedTask, error: taskError } = await supabase
    .from("Tasks")
    .insert({
      name: formData.name,
      description: formData.description || null,
      status_id: formData.status_id || null,
      Project_id: formData.Project_id || null,
      Task_Parent_Id: formData.Task_Parent_Id || null,
      due_date: formData.due_date || null,
    })
    .select()
    .single();

  if (taskError) throw taskError;

  // Insert assigned users into TasksUsers
  if (formData.assignee_ids && formData.assignee_ids.length > 0) {
    const userRecords = formData.assignee_ids.map((userId) => ({
      Task_Id: insertedTask.id,
      User_Id: userId,
      role: "assignee",
    }));
    await supabase.from("TasksUsers").insert(userRecords);
  }

  // Insert task types into TaskTypes_Tasks
  if (formData.task_type_ids && formData.task_type_ids.length > 0) {
    const typeRecords = formData.task_type_ids.map((typeId) => ({
      Task_Id: insertedTask.id,
      TaskType_Id: typeId,
    }));
    await supabase.from("TaskTypes_Tasks").insert(typeRecords);
  }

  // Insert softwares into Tasks_Softwares
  if (formData.software_ids && formData.software_ids.length > 0) {
    const softwareRecords = formData.software_ids.map((softwareId) => ({
      Task_Id: insertedTask.id,
      Software_Id: softwareId,
    }));
    try {
      await supabase.from("Tasks_Softwares").insert(softwareRecords);
    } catch (e) {
      console.warn("Failed to link softwares to task:", e);
    }
  }

  // Compute breadcrumbs for the new task
  const breadcrumbs: TaskBreadcrumb[] = [{ id: insertedTask.id, name: insertedTask.name }];
  if (insertedTask.Task_Parent_Id) {
    let currParentId: string | null = insertedTask.Task_Parent_Id;
    while (currParentId) {
      const parentQuery: any = await supabase
        .from("Tasks")
        .select("id, name, Task_Parent_Id")
        .eq("id", currParentId)
        .single();
      const parentData = parentQuery.data;
      if (parentData) {
        breadcrumbs.unshift({ id: parentData.id, name: parentData.name });
        currParentId = parentData.Task_Parent_Id;
      } else {
        break;
      }
    }
  }

  const { data: taskTypes } = await supabase.from("TaskTypes").select("*");
  const { data: users } = await supabase.from("Users").select("*");
  let softwares: Software[] = [];
  try {
    const { data: softData } = await supabase.from("Softwares").select("*");
    softwares = (softData || []) as Software[];
  } catch (e) {}

  const { data: status } = insertedTask.status_id
    ? await supabase.from("Status").select("*").eq("id", insertedTask.status_id).single()
    : { data: null };
  const { data: project } = insertedTask.Project_id
    ? await supabase.from("Projects").select("*").eq("id", insertedTask.Project_id).single()
    : { data: null };

  const assignedTypes = (taskTypes || []).filter((t) => formData.task_type_ids?.includes(t.id));
  const assignedUsers = (users || []).filter((u) => formData.assignee_ids?.includes(u.id));
  const assignedSoftwares = (softwares || []).filter((s) => formData.software_ids?.includes(s.id));

  return {
    ...insertedTask,
    status: status || null,
    project: project || null,
    task_types: assignedTypes,
    assignees: assignedUsers,
    softwares: assignedSoftwares,
    subtasks: [],
    resources: [],
    breadcrumbs,
  };
}

// ------------------------------------------------------------
// Update Task
// ------------------------------------------------------------
export async function updateTask(
  taskId: string,
  formData: Partial<TaskFormData>
): Promise<void> {
  if (!isSupabaseConfigured) {
    if (formData.software_ids !== undefined) {
      demoTasksSoftwaresState = demoTasksSoftwaresState.filter((rel) => rel.Task_Id !== taskId);
      formData.software_ids.forEach((sId) => {
        demoTasksSoftwaresState.push({ Task_Id: taskId, Software_Id: sId });
      });
    }

    const updateRecursively = (tasks: TaskWithDetails[]): TaskWithDetails[] => {
      return tasks.map((task) => {
        if (task.id === taskId) {
          const updatedSoftwares =
            formData.software_ids !== undefined
              ? demoSoftwaresState.filter((s) => formData.software_ids?.includes(s.id))
              : task.softwares;
          return {
            ...task,
            name: formData.name ?? task.name,
            description: formData.description !== undefined ? formData.description : task.description,
            status_id: formData.status_id ?? task.status_id,
            Project_id: formData.Project_id ?? task.Project_id,
            due_date: formData.due_date !== undefined ? formData.due_date : task.due_date,
            softwares: updatedSoftwares,
            task_types: formData.task_type_ids
              ? INITIAL_DEMO_TASKTYPES.filter((t) => formData.task_type_ids?.includes(t.id))
              : task.task_types,
            assignees: formData.assignee_ids
              ? INITIAL_DEMO_USERS.filter((u) => formData.assignee_ids?.includes(u.id))
              : task.assignees,
            updated_at: new Date().toISOString(),
          };
        }
        if (task.subtasks && task.subtasks.length > 0) {
          return {
            ...task,
            subtasks: updateRecursively(task.subtasks),
          };
        }
        return task;
      });
    };
    demoTasksState = updateRecursively(demoTasksState);
    return;
  }

  // Live Supabase update
  const updatePayload: Database["public"]["Tables"]["Tasks"]["Update"] = {
    updated_at: new Date().toISOString(),
  };
  if (formData.name !== undefined) updatePayload.name = formData.name;
  if (formData.description !== undefined) updatePayload.description = formData.description;
  if (formData.status_id !== undefined) updatePayload.status_id = formData.status_id;
  if (formData.Project_id !== undefined) updatePayload.Project_id = formData.Project_id;
  if (formData.due_date !== undefined) updatePayload.due_date = formData.due_date;

  const { error } = await supabase
    .from("Tasks")
    .update(updatePayload)
    .eq("id", taskId);

  if (error) throw error;

  // Sync Assignees if provided
  if (formData.assignee_ids !== undefined) {
    await supabase.from("TasksUsers").delete().eq("Task_Id", taskId);
    if (formData.assignee_ids.length > 0) {
      await supabase.from("TasksUsers").insert(
        formData.assignee_ids.map((uId) => ({
          Task_Id: taskId,
          User_Id: uId,
          role: "assignee",
        }))
      );
    }
  }

  // Sync TaskTypes if provided
  if (formData.task_type_ids !== undefined) {
    await supabase.from("TaskTypes_Tasks").delete().eq("Task_Id", taskId);
    if (formData.task_type_ids.length > 0) {
      await supabase.from("TaskTypes_Tasks").insert(
        formData.task_type_ids.map((tId) => ({
          Task_Id: taskId,
          TaskType_Id: tId,
        }))
      );
    }
  }

  // Sync Softwares if provided
  if (formData.software_ids !== undefined) {
    try {
      await supabase.from("Tasks_Softwares").delete().eq("Task_Id", taskId);
      if (formData.software_ids.length > 0) {
        await supabase.from("Tasks_Softwares").insert(
          formData.software_ids.map((sId) => ({
            Task_Id: taskId,
            Software_Id: sId,
          }))
        );
      }
    } catch (e) {
      console.warn("Failed to sync softwares for task:", e);
    }
  }
}

// ------------------------------------------------------------
// Update Task Status (Drag and Drop Kanban)
// ------------------------------------------------------------
export async function updateTaskStatus(
  taskId: string,
  newStatusId: string,
  position?: number
): Promise<void> {
  if (!isSupabaseConfigured) {
    demoTasksState = demoTasksState.map((task) =>
      task.id === taskId
        ? {
            ...task,
            status_id: newStatusId,
            position: position ?? task.position,
            updated_at: new Date().toISOString(),
          }
        : task
    );
    return;
  }

  const { error } = await supabase
    .from("Tasks")
    .update({
      status_id: newStatusId,
      position: position !== undefined ? position : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) throw error;
}

// ------------------------------------------------------------
// Delete Task
// ------------------------------------------------------------
export async function deleteTask(taskId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    demoTasksState = demoTasksState.filter((task) => task.id !== taskId);
    return;
  }

  const { error } = await supabase.from("Tasks").delete().eq("id", taskId);
  if (error) throw error;
}

// ------------------------------------------------------------
// Status (Columns) CRUD
// ------------------------------------------------------------
export async function createStatus(data: {
  name: string;
  color: string;
  description?: string;
  position?: number;
}): Promise<Status> {
  if (!isSupabaseConfigured) {
    const newStatus: Status = {
      id: "status-" + Date.now(),
      name: data.name,
      color: data.color,
      description: data.description || null,
      position: data.position ?? demoStatusesState.length,
      created_at: new Date().toISOString(),
    };
    demoStatusesState = [...demoStatusesState, newStatus];
    return newStatus;
  }

  const { data: inserted, error } = await supabase
    .from("Status")
    .insert({
      name: data.name,
      color: data.color,
      description: data.description || null,
      position: data.position ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return inserted;
}

export async function updateStatus(
  statusId: string,
  data: {
    name?: string;
    color?: string;
    description?: string;
    position?: number;
  }
): Promise<Status> {
  if (!isSupabaseConfigured) {
    let updated: Status | null = null;
    demoStatusesState = demoStatusesState.map((s) => {
      if (s.id === statusId) {
        updated = {
          ...s,
          name: data.name ?? s.name,
          color: data.color ?? s.color,
          description: data.description !== undefined ? data.description : s.description,
          position: data.position ?? s.position,
        };
        return updated;
      }
      return s;
    });
    if (!updated) throw new Error("Status not found");
    return updated;
  }

  const { data: updated, error } = await supabase
    .from("Status")
    .update({
      name: data.name,
      color: data.color,
      description: data.description,
      position: data.position,
    })
    .eq("id", statusId)
    .select()
    .single();

  if (error) throw error;
  return updated;
}

export async function deleteStatus(statusId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    demoStatusesState = demoStatusesState.filter((s) => s.id !== statusId);
    return;
  }

  const { error } = await supabase.from("Status").delete().eq("id", statusId);
  if (error) throw error;
}

// ------------------------------------------------------------
// TaskTypes CRUD
// ------------------------------------------------------------
export async function createTaskType(data: {
  name: string;
  color?: string;
}): Promise<TaskType> {
  const color = data.color || "#3b82f6";
  if (!isSupabaseConfigured) {
    const newType: TaskType = {
      id: "type-" + Date.now(),
      name: data.name.trim(),
      color,
      created_at: new Date().toISOString(),
    };
    demoTaskTypesState = [...demoTaskTypesState, newType];
    return newType;
  }

  const { data: inserted, error } = await supabase
    .from("TaskTypes")
    .insert({
      name: data.name.trim(),
      color,
    })
    .select()
    .single();

  if (error) throw error;
  return inserted;
}

export async function deleteTaskType(typeId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    demoTaskTypesState = demoTaskTypesState.filter((t) => t.id !== typeId);
    return;
  }

  const { error } = await supabase.from("TaskTypes").delete().eq("id", typeId);
  if (error) throw error;
}

// ------------------------------------------------------------
// Subtasks CRUD (Creates full Task objects with parent ID)
// ------------------------------------------------------------
export async function createSubtask(
  parentTaskId: string,
  name: string,
  extra?: Partial<TaskFormData>
): Promise<TaskWithDetails> {
  return createTask({
    name,
    description: extra?.description,
    status_id: extra?.status_id,
    Project_id: extra?.Project_id,
    Task_Parent_Id: parentTaskId,
    assignee_ids: extra?.assignee_ids || [],
    task_type_ids: extra?.task_type_ids || [],
  });
}

export async function toggleSubtaskStatus(
  subtaskId: string,
  parentTaskId: string,
  completed: boolean,
  doneStatusId: string,
  todoStatusId: string
): Promise<void> {
  const targetStatus = completed ? doneStatusId : todoStatusId;

  if (!isSupabaseConfigured) {
    demoTasksState = demoTasksState.map((task) => {
      if (task.id === parentTaskId) {
        return {
          ...task,
          subtasks: task.subtasks.map((st) =>
            st.id === subtaskId ? { ...st, status_id: targetStatus } : st
          ),
        };
      }
      return task;
    });
    return;
  }

  await supabase
    .from("Tasks")
    .update({ status_id: targetStatus, updated_at: new Date().toISOString() })
    .eq("id", subtaskId);
}

export async function deleteSubtask(
  subtaskId: string,
  parentTaskId: string
): Promise<void> {
  if (!isSupabaseConfigured) {
    demoTasksState = demoTasksState.map((task) => {
      if (task.id === parentTaskId) {
        return {
          ...task,
          subtasks: task.subtasks.filter((st) => st.id !== subtaskId),
        };
      }
      return task;
    });
    return;
  }

  await supabase.from("Tasks").delete().eq("id", subtaskId);
}

// ------------------------------------------------------------
// File & Resource Uploads (Direct Supabase Storage integration)
// ------------------------------------------------------------
export async function uploadTaskAttachment(
  taskId: string,
  file: File,
  resourceName?: string
): Promise<ResourceWithFiles> {
  if (!isSupabaseConfigured) {
    const mockUrl = URL.createObjectURL(file);
    const mockResource: ResourceWithFiles = {
      id: "res-" + Date.now(),
      name: resourceName || file.name,
      description: null,
      Task_Id: taskId,
      created_at: new Date().toISOString(),
      files: [
        {
          id: "file-" + Date.now(),
          Url: mockUrl,
          Resource_Id: "res-" + Date.now(),
          created_at: new Date().toISOString(),
        },
      ],
    };

    demoTasksState = demoTasksState.map((task) => {
      if (task.id === taskId) {
        return {
          ...task,
          resources: [...task.resources, mockResource],
        };
      }
      return task;
    });

    return mockResource;
  }

  // 1. Upload to Supabase Storage bucket 'task-attachments'
  const fileExt = file.name.split(".").pop();
  const filePath = `${taskId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("task-attachments")
    .upload(filePath, file, { cacheControl: "3600", upsert: false });

  if (uploadError) throw uploadError;

  // 2. Obtain Public URL
  const { data: publicUrlData } = supabase.storage
    .from("task-attachments")
    .getPublicUrl(filePath);

  const finalUrl = publicUrlData.publicUrl;

  // 3. Create record in Resources table
  const { data: resource, error: resourceError } = await supabase
    .from("Resources")
    .insert({
      name: resourceName || file.name,
      description: null,
      Task_Id: taskId,
    })
    .select()
    .single();

  if (resourceError) throw resourceError;

  // 4. Create record in Files table
  const { data: fileRecord, error: fileRecordError } = await supabase
    .from("Files")
    .insert({
      Url: finalUrl,
      Resource_Id: resource.id,
    })
    .select()
    .single();

  if (fileRecordError) throw fileRecordError;

  return {
    ...resource,
    files: [fileRecord],
  };
}

export async function deleteAttachment(
  resourceId: string,
  taskId: string
): Promise<void> {
  if (!isSupabaseConfigured) {
    demoTasksState = demoTasksState.map((task) => {
      if (task.id === taskId) {
        return {
          ...task,
          resources: task.resources.filter((r) => r.id !== resourceId),
        };
      }
      return task;
    });
    return;
  }

  // Deleting the resource cascades to Files table
  await supabase.from("Resources").delete().eq("id", resourceId);
}

export async function updateResourceDescription(
  resourceId: string,
  description: string | null
): Promise<void> {
  const descValue = description?.trim() || null;

  if (!isSupabaseConfigured) {
    const updateInTasks = (taskList: TaskWithDetails[]) => {
      for (const t of taskList) {
        if (t.resources) {
          const res = t.resources.find((r) => r.id === resourceId);
          if (res) {
            res.description = descValue;
          }
        }
        if (t.subtasks && t.subtasks.length > 0) {
          updateInTasks(t.subtasks);
        }
      }
    };
    updateInTasks(demoTasksState);
    return;
  }

  const { error } = await supabase
    .from("Resources")
    .update({ description: descValue })
    .eq("id", resourceId);

  if (error) throw error;
}

export async function createProject(
  name: string,
  description?: string
): Promise<Project> {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Project name is required");

  if (!isSupabaseConfigured) {
    const newProj: Project = {
      id: "project-" + Date.now(),
      name: trimmedName,
      description: description?.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    demoProjectsState.push(newProj);
    return newProj;
  }

  const { data, error } = await supabase
    .from("Projects")
    .insert({
      name: trimmedName,
      description: description?.trim() || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Project;
}

export async function updateProject(
  id: string,
  updates: { name?: string; description?: string }
): Promise<Project> {
  if (!isSupabaseConfigured) {
    const proj = demoProjectsState.find((p) => p.id === id);
    if (!proj) throw new Error("Project not found");
    if (updates.name !== undefined) proj.name = updates.name.trim();
    if (updates.description !== undefined)
      proj.description = updates.description.trim() || null;
    proj.updated_at = new Date().toISOString();
    return { ...proj };
  }

  const updatePayload: {
    name?: string;
    description?: string | null;
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };
  if (updates.name !== undefined) updatePayload.name = updates.name.trim();
  if (updates.description !== undefined)
    updatePayload.description = updates.description.trim() || null;

  const { data, error } = await supabase
    .from("Projects")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Project;
}

export async function deleteProject(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    demoProjectsState = demoProjectsState.filter((p) => p.id !== id);
    demoTasksState = demoTasksState.map((t) =>
      t.Project_id === id ? { ...t, Project_id: null, project: null } : t
    );
    return;
  }

  const { error } = await supabase.from("Projects").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderTaskResources(
  taskId: string,
  orderedResourceIds: string[]
): Promise<void> {
  // 1. Update in-memory demoTasksState recursively
  const updateTaskResourcesOrder = (taskList: TaskWithDetails[]) => {
    for (const t of taskList) {
      if (t.id === taskId && t.resources) {
        const map = new Map(t.resources.map((r) => [r.id, r]));
        const reordered: ResourceWithFiles[] = [];
        for (const id of orderedResourceIds) {
          const item = map.get(id);
          if (item) reordered.push(item);
        }
        for (const r of t.resources) {
          if (!orderedResourceIds.includes(r.id)) reordered.push(r);
        }
        t.resources = reordered;
      }
      if (t.subtasks && t.subtasks.length > 0) {
        updateTaskResourcesOrder(t.subtasks);
      }
    }
  };
  updateTaskResourcesOrder(demoTasksState);

  // 2. Persist in localStorage as reliable cache
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`task_resource_order_${taskId}`, JSON.stringify(orderedResourceIds));
    } catch (e) {}
  }

  // 3. If Supabase is configured, try to persist position if column exists
  if (isSupabaseConfigured) {
    try {
      await Promise.all(
        orderedResourceIds.map((id, index) =>
          supabase
            .from("Resources")
            .update({ position: index } as any)
            .eq("id", id)
        )
      );
    } catch (err) {
      // Position column might not exist in custom schema; cached order handles it
    }
  }
}

// ------------------------------------------------------------
// Softwares Management
// ------------------------------------------------------------
export async function createSoftware(data: {
  name: string;
  icon_url: string;
}): Promise<Software> {
  const newSoftware: Software = {
    id: "soft-" + Date.now(),
    name: data.name.trim(),
    icon_url: data.icon_url,
    created_at: new Date().toISOString(),
  };

  demoSoftwaresState = [...demoSoftwaresState, newSoftware];

  if (isSupabaseConfigured) {
    const { data: inserted, error } = await supabase
      .from("Softwares")
      .insert({
        name: newSoftware.name,
        icon_url: newSoftware.icon_url,
      })
      .select()
      .single();

    if (error) throw error;
    return inserted as Software;
  }

  return newSoftware;
}

export async function deleteSoftware(id: string): Promise<void> {
  demoSoftwaresState = demoSoftwaresState.filter((s) => s.id !== id);
  demoTasksSoftwaresState = demoTasksSoftwaresState.filter((rel) => rel.Software_Id !== id);

  const removeSoftwareRecursively = (tasks: TaskWithDetails[]) => {
    tasks.forEach((t) => {
      if (t.softwares) {
        t.softwares = t.softwares.filter((s) => s.id !== id);
      }
      if (t.subtasks && t.subtasks.length > 0) {
        removeSoftwareRecursively(t.subtasks);
      }
    });
  };
  removeSoftwareRecursively(demoTasksState);

  if (isSupabaseConfigured) {
    const { error } = await supabase.from("Softwares").delete().eq("id", id);
    if (error) throw error;
  }
}
