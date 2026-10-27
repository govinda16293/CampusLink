import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { SignupPage } from './pages/SignupPage';
import { VerifyOtpPage } from './pages/VerifyOtpPage';
import { LoginPage } from './pages/LoginPage';
import { FeedPage } from './pages/FeedPage';
import { CreateGoalPage } from './pages/CreateGoalPage';
import { GoalDetailPage } from './pages/GoalDetailPage';
import { EditGoalPage } from './pages/EditGoalPage';
import { ProfilePage } from './pages/ProfilePage';
import { EditProfilePage } from './pages/EditProfilePage';
import { AdminPage } from './pages/AdminPage';

export default function App() {
  const initialise = useAuthStore((state) => state.initialise);

  // Exchange any stored token for the real user before rendering anything that depends on it.
  useEffect(() => {
    initialise();
  }, [initialise]);

  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Verification is reachable while signed out, and also by a signed-in-but-unverified
          user arriving from the login screen, so it sits outside both guards. */}
      <Route path="/verify" element={<VerifyOtpPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<FeedPage />} />
          <Route path="/goals/new" element={<CreateGoalPage />} />
          {/* Declared before /goals/:id so "new" is never captured as a goal id. */}
          <Route path="/goals/:id/edit" element={<EditGoalPage />} />
          <Route path="/goals/:id" element={<GoalDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/edit" element={<EditProfilePage />} />
          {/* Declared after /profile/edit so "edit" is never captured as a user id. */}
          <Route path="/profile/:id" element={<ProfilePage />} />
          {/* Guarded by the API, not by this route — requireAdmin reads the role from the
              database on every call, so hiding the link is convenience, never the control. */}
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
