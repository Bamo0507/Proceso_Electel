import { SidebarTrigger } from "@/components/ui/sidebar";

export function Toolbar() {
  return (
    <header className="flex h-12 bg-white shrink-0 items-center border-b border-gray-200 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center px-4">
        <SidebarTrigger />
      </div>
    </header>
  );
}