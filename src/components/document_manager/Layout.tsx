import { Outlet } from "react-router-dom";
import { DocAuthProvider } from "./auth-provider";
import { DocSidebar } from "./sidebar";

/**
 * DocLayout — Document Manager inner layout.
 * Follows the same pattern as HR Products Layout.jsx:
 *   AdminLayout (master shell)
 *     └── DocLayout (sidebar + <Outlet />)   ← this file
 *           └── [Active Document Manager Page]
 */
const DocLayout = () => {
  return (
    <DocAuthProvider>
      <div className="flex h-full overflow-hidden bg-gray-50">
        <DocSidebar />
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </DocAuthProvider>
  );
};

export default DocLayout;
