/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { QuickActionModal } from './components/layout/QuickActionModal';
import { ToastContainer } from './components/common/ToastContainer';
import { OnboardingModal } from './components/common/OnboardingModal';
import { AuthModal } from './components/auth/AuthModal';
import { QuickSearchModal } from './components/common/QuickSearchModal';
import { SendZaloModal } from './components/common/SendZaloModal';
import { Student } from './types';

// Views
import { DashboardView } from './components/views/DashboardView';
import { StudentsView } from './components/views/StudentsView';
import { AttendanceView } from './components/views/AttendanceView';
import { LearningView } from './components/views/LearningView';
import { CompetencyView } from './components/views/CompetencyView';
import { AIAgentHubView } from './components/views/AIAgentHubView';
import { AICommentView } from './components/views/AICommentView';
import { CompetitionView } from './components/views/CompetitionView';
import { TasksView } from './components/views/TasksView';
import { JournalView } from './components/views/JournalView';
import { ParentsView } from './components/views/ParentsView';
import { TimetableView } from './components/views/TimetableView';
import { SeatingChartView } from './components/views/SeatingChartView';
import { AttentionView } from './components/views/AttentionView';
import { EventsView } from './components/views/EventsView';
import { BirthdaysView } from './components/views/BirthdaysView';
import { ReportsView } from './components/views/ReportsView';
import { SettingsView } from './components/views/SettingsView';

const MainLayout: React.FC = () => {
  const { activeTab, currentUser, loadingAuth } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const [zaloTargetStudent, setZaloTargetStudent] = useState<Student | null>(null);

  // Global Keyboard Shortcuts (Cmd/Ctrl + K to open Quick Search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowQuickSearch((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600">
            Đang tải dữ liệu lớp học...
          </p>
        </div>
      </div>
    );
  }


  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'students':
        return <StudentsView />;
      case 'attendance':
        return <AttendanceView />;
      case 'learning':
        return <LearningView />;
      case 'competency':
        return <CompetencyView />;
      case 'ai-agent':
        return <AIAgentHubView />;
      case 'ai-comments':
        return <AICommentView />;
      case 'competition':
        return <CompetitionView />;
      case 'tasks':
        return <TasksView />;
      case 'journal':
        return <JournalView />;
      case 'parents':
        return <ParentsView />;
      case 'timetable':
        return <TimetableView />;
      case 'seating':
        return <SeatingChartView />;
      case 'attention':
        return <AttentionView />;
      case 'events':
        return <EventsView />;
      case 'birthdays':
        return <BirthdaysView />;
      case 'reports':
        return <ReportsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800 antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* Sidebar Navigation */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />


      {/* Main Right Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenQuickSearch={() => setShowQuickSearch(true)}
        />

        <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto">
          {renderActiveView()}
        </main>
      </div>

      {/* Floating Speed Dial & Modal helpers */}
      <QuickActionModal />
      <ToastContainer />
      <OnboardingModal />
      <AuthModal />
      
      {/* Quick Search Ctrl + K Modal */}
      <QuickSearchModal
        isOpen={showQuickSearch}
        onClose={() => setShowQuickSearch(false)}
        onOpenZalo={(stu) => setZaloTargetStudent(stu)}
      />

      {/* Send Zalo Modal from search if triggered */}
      {zaloTargetStudent && (
        <SendZaloModal
          isOpen={!!zaloTargetStudent}
          onClose={() => setZaloTargetStudent(null)}
          student={zaloTargetStudent}
          initialMessage=""
          defaultTopic="Trao đổi tình hình học sinh"
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
