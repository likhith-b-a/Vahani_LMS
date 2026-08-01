import { lazy } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
// import { Analytics } from "@vercel/analytics/react";
import { Toaster as Sonner } from "./components/ui/sonner";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { AuthProvider } from "./contexts/AuthContext";
import { AssignmentsProvider } from "./contexts/AssignmentsContext";
import { NotificationsProvider } from "./contexts/NotificationsContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/scholar/Index";
import AdminUserDetailPage from "./pages/AdminUserDetail";
import AdminProgrammeDetailPage from "./pages/AdminProgrammeDetail";
import ManagerProgrammeDetail from "./pages/ManagerProgrammeDetail";
import ManagerProgrammeGrouping from "./pages/ManagerProgrammeGrouping";
import ManagerProgrammeTutors from "./pages/ManagerProgrammeTutors";
import ManagerInteractiveSessionEditor from "./pages/ManagerInteractiveSessionEditor";
import CourseRegistration from "./pages/scholar/CourseRegistration";
import Certificates from "./pages/scholar/Certificates";
import Attendance from "./pages/scholar/Attendance";
import Assignments from "./pages/scholar/Assignments";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import MyProgrammes from "./pages/scholar/MyProgrammes";
import ProgrammeDetail from "./pages/scholar/ProgrammeDetail";
import Queries from "./pages/scholar/Queries";
import Updates from "./pages/scholar/Updates";
import Wishlist from "./pages/scholar/Wishlist";
import Marks from "./pages/scholar/Marks";
import VerifyCertificate from "./pages/VerifyCertificate";
import { queryClient } from "./lib/queryClient";

const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminOverviewPage = lazy(() => import("./pages/admin/AdminOverviewPage"));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));
const AdminProgrammesPage = lazy(() => import("./pages/admin/AdminProgrammesPage"));
const AdminAnalyticsPage = lazy(() => import("./pages/admin/AdminAnalyticsPage"));
const AdminAnnouncementsPage = lazy(() => import("./pages/admin/AdminAnnouncementsPage"));
const AdminQueriesPage = lazy(() => import("./pages/admin/AdminQueriesPage"));
const AdminReportsPage = lazy(() => import("./pages/admin/AdminReportsPage"));
const AdminSettingsPage = lazy(() => import("./pages/admin/AdminSettingsPage"));

const ManagerLayout = lazy(() => import("./pages/manager/ManagerLayout"));
const ManagerOverviewPage = lazy(() => import("./pages/manager/ManagerOverviewPage"));
const ManagerProgrammesPage = lazy(() => import("./pages/manager/ManagerProgrammesPage"));
const ManagerAnalyticsPage = lazy(() => import("./pages/manager/ManagerAnalyticsPage"));
const ManagerAnnouncementsPage = lazy(() => import("./pages/manager/ManagerAnnouncementsPage"));
const ManagerEvaluationPage = lazy(() => import("./pages/manager/ManagerEvaluationPage"));
const ManagerReportsPage = lazy(() => import("./pages/manager/ManagerReportsPage"));
const ManagerQueriesPage = lazy(() => import("./pages/manager/ManagerQueriesPage"));
const ManagerStudentsPage = lazy(() => import("./pages/manager/ManagerStudentsPage"));

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {/* <Analytics /> */}
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
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminOverviewPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="programmes" element={<AdminProgrammesPage />} />
                <Route path="analytics" element={<AdminAnalyticsPage />} />
                <Route path="announcements" element={<AdminAnnouncementsPage />} />
                <Route path="queries" element={<AdminQueriesPage />} />
                <Route path="reports" element={<AdminReportsPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
              </Route>
              <Route
                path="/admin/overview"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminOverviewPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminUsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/programmes"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminProgrammesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminAnalyticsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/announcements"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminAnnouncementsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/queries"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminQueriesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminSettingsPage />
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
                    <ManagerLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<ManagerOverviewPage />} />
                <Route path="programmes" element={<ManagerProgrammesPage />} />
                <Route path="analytics" element={<ManagerAnalyticsPage />} />
                <Route path="announcements" element={<ManagerAnnouncementsPage />} />
                <Route path="evaluation" element={<ManagerEvaluationPage />} />
                <Route path="reports" element={<ManagerReportsPage />} />
                <Route path="queries" element={<ManagerQueriesPage />} />
                <Route path="students" element={<ManagerStudentsPage />} />
              </Route>
              <Route
                path="/programme-manager/overview"
                element={
                  <ProtectedRoute allowedRoles={["programme_manager", "tutor"]}>
                    <ManagerOverviewPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/programme-manager/programmes"
                element={
                  <ProtectedRoute allowedRoles={["programme_manager", "tutor"]}>
                    <ManagerProgrammesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/programme-manager/analytics"
                element={
                  <ProtectedRoute allowedRoles={["programme_manager", "tutor"]}>
                    <ManagerAnalyticsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/programme-manager/announcements"
                element={
                  <ProtectedRoute allowedRoles={["programme_manager", "tutor"]}>
                    <ManagerAnnouncementsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/programme-manager/evaluation"
                element={
                  <ProtectedRoute allowedRoles={["programme_manager", "tutor"]}>
                    <ManagerEvaluationPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/programme-manager/reports"
                element={
                  <ProtectedRoute allowedRoles={["programme_manager", "tutor"]}>
                    <ManagerReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/programme-manager/queries"
                element={
                  <ProtectedRoute allowedRoles={["programme_manager", "tutor"]}>
                    <ManagerQueriesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/programme-manager/students"
                element={
                  <ProtectedRoute allowedRoles={["programme_manager", "tutor"]}>
                    <ManagerStudentsPage />
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
                path="/programme-manager/programmes/:id/tutors"
                element={
                  <ProtectedRoute allowedRoles={["programme_manager", "tutor"]}>
                    <ManagerProgrammeTutors />
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
                    <ManagerLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<ManagerOverviewPage />} />
                <Route path="programmes" element={<ManagerProgrammesPage />} />
                <Route path="analytics" element={<ManagerAnalyticsPage />} />
                <Route path="announcements" element={<ManagerAnnouncementsPage />} />
                <Route path="evaluation" element={<ManagerEvaluationPage />} />
                <Route path="reports" element={<ManagerReportsPage />} />
                <Route path="queries" element={<ManagerQueriesPage />} />
                <Route path="students" element={<ManagerStudentsPage />} />
              </Route>
              <Route
                path="/tutor/overview"
                element={
                  <ProtectedRoute allowedRoles={["programme_manager", "tutor"]}>
                    <ManagerOverviewPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tutor/programmes"
                element={
                  <ProtectedRoute allowedRoles={["programme_manager", "tutor"]}>
                    <ManagerProgrammesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tutor/analytics"
                element={
                  <ProtectedRoute allowedRoles={["programme_manager", "tutor"]}>
                    <ManagerAnalyticsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tutor/announcements"
                element={
                  <ProtectedRoute allowedRoles={["programme_manager", "tutor"]}>
                    <ManagerAnnouncementsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tutor/evaluation"
                element={
                  <ProtectedRoute allowedRoles={["programme_manager", "tutor"]}>
                    <ManagerEvaluationPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tutor/reports"
                element={
                  <ProtectedRoute allowedRoles={["programme_manager", "tutor"]}>
                    <ManagerReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tutor/queries"
                element={
                  <ProtectedRoute allowedRoles={["programme_manager", "tutor"]}>
                    <ManagerQueriesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tutor/students"
                element={
                  <ProtectedRoute allowedRoles={["programme_manager", "tutor"]}>
                    <ManagerStudentsPage />
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
                path="/tutor/programmes/:id/tutors"
                element={
                  <ProtectedRoute allowedRoles={["programme_manager", "tutor"]}>
                    <ManagerProgrammeTutors />
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
