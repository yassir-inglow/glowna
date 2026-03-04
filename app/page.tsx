import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarAvvvatars } from "@/components/ui/avatar";
import { ProjectsTasksView } from "@/components/dashboard/projects-tasks-view";
import { getProjects, getAllTasks } from "@/lib/data";


function BellIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.73 21a2 2 0 0 1-3.46 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LogoMark() {
  return (
    <div className="relative size-[46px] rounded-[8px] bg-white/50 p-[10px]">
      <div className="relative size-full rounded-full bg-brand-500">
        <div className="absolute inset-[4px] rounded-full bg-white" />
      </div>
    </div>
  );
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [projects, tasks] = await Promise.all([getProjects(), getAllTasks()]);

  const displayName = user.email?.split("@")[0] ?? "Jane";
  const firstName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
  const currentDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="relative h-screen overflow-hidden bg-bg-primary">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[-1000px] h-[1500px] w-full -translate-x-1/2 rounded-full bg-gray-cool-200 blur-[900px]"
      />

      <div className="relative mx-auto flex h-full max-w-[1100px] flex-col items-center gap-32">
        <header className="flex w-full items-center justify-between py-4">
          <LogoMark />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              aria-label="Notifications"
              variant="secondary"
              size="icon-sm"
              className="border-0 bg-alpha-900 text-gray-cool-400 hover:bg-alpha-800"
            >
              <BellIcon />
            </Button>
            <Avatar size="md" status="online" title={user.email ?? "Profile"}>
              <AvatarAvvvatars value={user.email ?? firstName} />
            </Avatar>
          </div>
        </header>

        <section className="space-y-1.5 text-center">
          <p className="text-text-xl font-medium text-gray-cool-400">{currentDate}</p>
          <h1 className="text-[72px]/none italic text-gray-cool-800 [font-family:'PT_Serif',serif]">
            Good morning, {firstName}
          </h1>
        </section>

        <main className="h-full w-full flex-1 rounded-t-[32px] rounded-b-none bg-bg-primary p-6">
          <ProjectsTasksView projects={projects} tasks={tasks} />
        </main>
      </div>
    </div>
  );
}
