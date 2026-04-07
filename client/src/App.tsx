import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { Toaster as Sonner } from "./components/ui/sonner";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { AuthProvider } from "./contexts/AuthContext";
import { AssignmentsProvider } from "./contexts/AssignmentsContext";
import { NotificationsProvider } from "./contexts/NotificationsContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Index";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUserDetailPage from "./pages/AdminUserDetail";
import AdminProgrammeDetailPage from "./pages/AdminProgrammeDetail";
import TutorDashboard from "./pages/TutorDashboard";
import ManagerProgrammeDetail from "./pages/ManagerProgrammeDetail";
import ManagerProgrammeGrouping from "./pages/ManagerProgrammeGrouping";
import ManagerInteractiveSessionEditor from "./pages/ManagerInteractiveSessionEditor";
import CourseRegistration from "./pages/CourseRegistration";
import Certificates from "./pages/Certificates";
import Attendance from "./pages/Attendance";
import Assignments from "./pages/Assignments";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import MyProgrammes from "./pages/MyProgrammes";
import ProgrammeDetail from "./pages/ProgrammeDetail";
import Queries from "./pages/Queries";
import Updates from "./pages/Updates";
import Wishlist from "./pages/Wishlist";
import Marks from "./pages/Marks";
import VerifyCertificate from "./pages/VerifyCertificate";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Analytics />
      <BrowserRouter>
        <AuthProvider>
          <AssignmentsProvider>
            <NotificationsProvider>
              <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["scholar"]}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/courses"
                element={
                  <ProtectedRoute allowedRoles={["scholar"]}>
                    <CourseRegistration />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/enrollments"
                element={
                  <ProtectedRoute allowedRoles={["scholar"]}>
                    <CourseRegistration />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-programmes"
                element={
                  <ProtectedRoute allowedRoles={["scholar"]}>
                    <MyProgrammes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-programmes/:id"
                element={
                  <ProtectedRoute allowedRoles={["scholar"]}>
                    <ProgrammeDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/certificates"
                element={
                  <ProtectedRoute allowedRoles={["scholar"]}>
                    <Certificates />
                  </ProtectedRoute>
                }
              />
              <Route path="/verify-certificate/:credentialId" element={<VerifyCertificate />} />
              <Route
                path="/attendance"
                element={
                  <ProtectedRoute allowedRoles={["scholar"]}>
                    <Attendance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/assignments"
                element={
                  <ProtectedRoute allowedRoles={["scholar"]}>
                    <Assignments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute allowedRoles={["scholar", "tutor", "programme_manager"]}>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute allowedRoles={["scholar", "tutor", "programme_manager", "admin"]}>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/queries"
                element={
                  <ProtectedRoute allowedRoles={["scholar"]}>
                    <Queries />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/wishlist"
                element={
                  <ProtectedRoute allowedRoles={["scholar"]}>
                    <Wishlist />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/updates"
                element={
                  <ProtectedRoute allowedRoles={["scholar"]}>
                    <Updates />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/marks"
                element={
                  <ProtectedRoute allowedRoles={["scholar"]}>
                    <Marks />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users/:userId"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminUserDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/programmes/:programmeId"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminProgrammeDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/programme-manager"
                element={
                  <ProtectedRoute allowedRoles={["programme_manager", "tutor"]}>
                    <TutorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/programme-manager/programmes/:id"
                element={
                  <ProtectedRoute allowedRoles={["programme_manager", "tutor"]}>
                    <ManagerProgrammeDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/programme-manager/programmes/:id/grouping"
                element={
                  <ProtectedRoute allowedRoles={["programme_manager", "tutor"]}>
                    <ManagerProgrammeGrouping />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/programme-manager/programmes/:id/sessions/new"
                element={
                  <ProtectedRoute allowedRoles={["programme_manager", "tutor"]}>
                    <ManagerInteractiveSessionEditor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/programme-manager/programmes/:id/sessions/:sessionId"
                element={
                  <ProtectedRoute allowedRoles={["programme_manager", "tutor"]}>
                    <ManagerInteractiveSessionEditor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tutor"
                element={
                  <ProtectedRoute allowedRoles={["programme_manager", "tutor"]}>
                    <TutorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tutor/programmes/:id"
                element={
                  <ProtectedRoute allowedRoles={["programme_manager", "tutor"]}>
                    <ManagerProgrammeDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tutor/programmes/:id/grouping"
                element={
                  <ProtectedRoute allowedRoles={["programme_manager", "tutor"]}>
                    <ManagerProgrammeGrouping />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tutor/programmes/:id/sessions/new"
                element={
                  <ProtectedRoute allowedRoles={["programme_manager", "tutor"]}>
                    <ManagerInteractiveSessionEditor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tutor/programmes/:id/sessions/:sessionId"
                element={
                  <ProtectedRoute allowedRoles={["programme_manager", "tutor"]}>
                    <ManagerInteractiveSessionEditor />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
              </Routes>
            </NotificationsProvider>
          </AssignmentsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
