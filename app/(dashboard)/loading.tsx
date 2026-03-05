import { DashboardContentSkeleton } from "@/components/dashboard/dashboard-content-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="flex w-full h-full flex-col items-center pt-[62px]">
      <section className="space-y-1.5 text-center">
        <Skeleton className="h-5 w-48 mx-auto rounded-md" />
        <Skeleton className="h-[72px] w-[420px] mx-auto rounded-md" />
      </section>

      <div className="h-[70px] shrink-0" />

      <main className="w-full flex-1 min-h-0 flex flex-col rounded-t-[32px] bg-bg-primary p-6">
        <DashboardContentSkeleton />
      </main>
    </div>
  )
}
