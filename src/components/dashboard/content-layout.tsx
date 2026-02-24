import { Navbar } from "./navbar";

interface ContentLayoutProps {
  title: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}

export function ContentLayout({ children, fullWidth = false }: ContentLayoutProps) {
  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <div 
        className={`flex-1 overflow-auto ${
          fullWidth 
            ? "container-fluid" 
            : "container px-0 sm:px-0 lg:px-0 xl:px-0"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
