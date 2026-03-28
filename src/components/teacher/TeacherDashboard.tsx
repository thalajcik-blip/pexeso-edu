import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../services/supabase'
import { useClassroomStore } from '../../store/classroomStore'
import { useGameStore } from '../../store/gameStore'
import { THEMES } from '../../data/themes'
import { Avatar } from '../auth/Avatar'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import CreateClassModal from './CreateClassModal'
import AssignDeckModal from './AssignDeckModal'
import InviteCodeDisplay from './InviteCodeDisplay'
import OnboardingChecklist from './OnboardingChecklist'
import ClassResults from './ClassResults'

const TEXTS = {
  cs: {
    title: 'Učitelský dashboard',
    myClasses: 'Moje třídy',
    createClass: '+ Vytvořit třídu',
    noClasses: 'Zatím nemáte žádné třídy.',
    students: 'žáků',
    lastActivity: 'Poslední aktivita',
    never: 'nikdy',
    loading: 'Načítání...',
    notLoggedIn: 'Pro přístup k dashboardu se prosím přihlaste.',
    login: 'Přihlásit se',
    noAccess: 'Přístup jen pro učitele.',
    noAccessDesc: 'Tento dashboard je dostupný pouze pro schválené učitele.',
    requestRole: 'Požádat o roli učitele',
    backToList: '← Zpět na seznam tříd',
    roster: 'Žáci',
    assignments: 'Přiřazené sady',
    assignDeck: '+ Přiřadit sadu',
    noStudents: 'Zatím žádní žáci.',
    noAssignments: 'Zatím žádné sady.',
    removeAssignment: 'Odebrat',
    joined: 'Přidal se',
    lastActive: 'Aktivní',
    neverActive: 'nikdy',
  },
  sk: {
    title: 'Učiteľský dashboard',
    myClasses: 'Moje triedy',
    createClass: '+ Vytvoriť triedu',
    noClasses: 'Zatiaľ nemáte žiadne triedy.',
    students: 'žiakov',
    lastActivity: 'Posledná aktivita',
    never: 'nikdy',
    loading: 'Načítavanie...',
    notLoggedIn: 'Pre prístup k dashboardu sa prosím prihláste.',
    login: 'Prihlásiť sa',
    noAccess: 'Prístup len pre učiteľov.',
    noAccessDesc: 'Tento dashboard je dostupný len pre schválených učiteľov.',
    requestRole: 'Požiadať o rolu učiteľa',
    backToList: '← Späť na zoznam tried',
    roster: 'Žiaci',
    assignments: 'Priradené sady',
    assignDeck: '+ Priradiť sadu',
    noStudents: 'Zatiaľ žiadni žiaci.',
    noAssignments: 'Zatiaľ žiadne sady.',
    removeAssignment: 'Odstrániť',
    joined: 'Pridal sa',
    lastActive: 'Aktívny',
    neverActive: 'nikdy',
  },
  en: {
    title: 'Teacher dashboard',
    myClasses: 'My classes',
    createClass: '+ Create class',
    noClasses: 'No classes yet.',
    students: 'students',
    lastActivity: 'Last activity',
    never: 'never',
    loading: 'Loading...',
    notLoggedIn: 'Please log in to access the dashboard.',
    login: 'Log in',
    noAccess: 'Teacher access only.',
    noAccessDesc: 'This dashboard is only available to approved teachers.',
    requestRole: 'Request teacher role',
    backToList: '← Back to class list',
    roster: 'Students',
    assignments: 'Assigned decks',
    assignDeck: '+ Assign deck',
    noStudents: 'No students yet.',
    noAssignments: 'No decks assigned yet.',
    removeAssignment: 'Remove',
    joined: 'Joined',
    lastActive: 'Last active',
    neverActive: 'never',
  },
}

function formatRelativeTime(isoString: string | null, neverLabel: string): string {
  if (!isoString) return neverLabel
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '< 1 min'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h`
  const days = Math.floor(hours / 24)
  return `${days} d`
}

// ========================
// Class list view
// ========================
function ClassListView() {
  const navigate = useNavigate()
  const theme = useGameStore(s => s.theme)
  const language = useGameStore(s => s.language)
  const tc = THEMES[theme]
  const t = TEXTS[language]
  const { classes, loading, fetchClasses } = useClassroomStore()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(
    () => localStorage.getItem('pexedu_onboarding_dismissed') !== 'true'
  )

  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  const cardStyle: React.CSSProperties = {
    background: tc.surface,
    border: `1px solid ${tc.surfaceBorder}`,
    borderRadius: 12,
    padding: '16px 20px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    transition: 'border-color 0.15s',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {showOnboarding && (
        <OnboardingChecklist onDismiss={() => setShowOnboarding(false)} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, color: tc.text, fontSize: 18, fontWeight: 700 }}>{t.myClasses}</h2>
        <Button
          onClick={() => setShowCreateModal(true)}
          style={{
            background: tc.accentGradient,
            color: tc.accentText,
            border: 'none',
            fontWeight: 600,
          }}
        >
          {t.createClass}
        </Button>
      </div>

      {loading && <p style={{ color: tc.textMuted }}>{t.loading}</p>}

      {!loading && classes.length === 0 && (
        <p style={{ color: tc.textMuted }}>{t.noClasses}</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {classes.map(cls => (
          <div
            key={cls.id}
            style={cardStyle}
            onClick={() => navigate(`/class/${cls.id}`)}
            onMouseEnter={e => (e.currentTarget.style.borderColor = tc.accentBorderActive)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = tc.surfaceBorder)}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: tc.text }}>{cls.name}</span>
              <Badge
                style={{
                  background: tc.accentBgActive,
                  color: tc.accent,
                  border: `1px solid ${tc.accentBorderActive}`,
                  fontWeight: 600,
                }}
              >
                {cls.student_count} {t.students}
              </Badge>
            </div>
            <span style={{ color: tc.textMuted, fontSize: 12 }}>
              {t.lastActivity}: {formatRelativeTime(cls.last_activity, t.never)}
            </span>
          </div>
        ))}
      </div>

      <CreateClassModal open={showCreateModal} onClose={() => { setShowCreateModal(false); fetchClasses() }} />
    </div>
  )
}

// ========================
// Class detail view
// ========================
function ClassDetailView() {
  const { id: classId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const theme = useGameStore(s => s.theme)
  const language = useGameStore(s => s.language)
  const tc = THEMES[theme]
  const t = TEXTS[language]

  const { classes, members, assignments, loading, fetchClassDetail, removeAssignment } = useClassroomStore()
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [expandedAssignment, setExpandedAssignment] = useState<string | null>(null)

  useEffect(() => {
    if (classId) fetchClassDetail(classId)
  }, [classId, fetchClassDetail])

  useEffect(() => {
    if (!classId) return
    const channel = supabase
      .channel(`class-members-${classId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'class_members',
        filter: `class_id=eq.${classId}`,
      }, () => { fetchClassDetail(classId) })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [classId, fetchClassDetail])

  const currentClass = classes.find(c => c.id === classId)
  const className = currentClass?.name ?? ''

  const handleRemove = async (assignmentId: string) => {
    setRemoving(assignmentId)
    await removeAssignment(assignmentId)
    setRemoving(null)
  }

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
  }

  const thStyle: React.CSSProperties = {
    color: tc.textMuted,
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'left',
    padding: '6px 12px',
    borderBottom: `1px solid ${tc.surfaceBorder}`,
  }

  const tdStyle: React.CSSProperties = {
    padding: '10px 12px',
    color: tc.text,
    fontSize: 14,
    borderBottom: `1px solid ${tc.surfaceBorder}`,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/')}
          style={{ borderColor: tc.surfaceBorder, color: tc.textMuted }}
        >
          {t.backToList}
        </Button>
        <h2 style={{ margin: 0, color: tc.text, fontSize: 22, fontWeight: 700 }}>{className}</h2>
      </div>

      {/* Invite code */}
      {currentClass && <InviteCodeDisplay inviteCode={currentClass.invite_code} />}

      {loading && <p style={{ color: tc.textMuted }}>{t.loading}</p>}

      {/* Roster */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={{ margin: 0, color: tc.text, fontSize: 15, fontWeight: 700 }}>{t.roster}</h3>
        {members.length === 0 && !loading ? (
          <p style={{ color: tc.textMuted, fontSize: 13 }}>{t.noStudents}</p>
        ) : (
          <div style={{ background: tc.surface, border: `1px solid ${tc.surfaceBorder}`, borderRadius: 10, overflow: 'hidden' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Avatar</th>
                  <th style={thStyle}>Username</th>
                  <th style={thStyle}>{t.lastActive}</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id}>
                    <td style={tdStyle}>
                      <Avatar avatarId={m.avatar_id} size={32} />
                    </td>
                    <td style={tdStyle}>{m.username ?? '—'}</td>
                    <td style={{ ...tdStyle, color: tc.textMuted }}>
                      {formatRelativeTime(m.last_active_at, t.neverActive)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assignments */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, color: tc.text, fontSize: 15, fontWeight: 700 }}>{t.assignments}</h3>
          <Button
            size="sm"
            onClick={() => setShowAssignModal(true)}
            style={{
              background: tc.accentGradient,
              color: tc.accentText,
              border: 'none',
              fontWeight: 600,
            }}
          >
            {t.assignDeck}
          </Button>
        </div>

        {assignments.length === 0 && !loading ? (
          <p style={{ color: tc.textMuted, fontSize: 13 }}>{t.noAssignments}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {assignments.map(a => (
              <div
                key={a.id}
                style={{
                  background: tc.surface,
                  border: `1px solid ${tc.surfaceBorder}`,
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    cursor: 'pointer',
                  }}
                  onClick={() => setExpandedAssignment(expandedAssignment === a.id ? null : a.id)}
                >
                  <span style={{ color: tc.text, fontSize: 14, fontWeight: 600 }}>
                    {a.deck_title ?? a.set_slug ?? a.custom_deck_id}
                    <span style={{ color: tc.textMuted, fontSize: 12, fontWeight: 400, marginLeft: 8 }}>
                      {expandedAssignment === a.id ? '▲' : '▼'}
                    </span>
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={removing === a.id}
                    onClick={e => { e.stopPropagation(); handleRemove(a.id) }}
                    style={{ borderColor: tc.errorColor, color: tc.errorColor, fontSize: 12 }}
                  >
                    {t.removeAssignment}
                  </Button>
                </div>
                {expandedAssignment === a.id && classId && (
                  <div style={{ padding: '0 14px 14px' }}>
                    <ClassResults classId={classId} assignment={a} className={className} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {classId && (
        <AssignDeckModal
          classId={classId}
          open={showAssignModal}
          onClose={() => { setShowAssignModal(false); if (classId) fetchClassDetail(classId) }}
        />
      )}
    </div>
  )
}

// ========================
// Auth guard wrapper
// ========================
function TeacherGuard({ children }: { children: React.ReactNode }) {
  const theme = useGameStore(s => s.theme)
  const language = useGameStore(s => s.language)
  const tc = THEMES[theme]
  const t = TEXTS[language]
  const user = useAuthStore(s => s.user)
  const profile = useAuthStore(s => s.profile)
  const isLoading = useAuthStore(s => s.isLoading)
  const openAuthModal = useAuthStore(s => s.openAuthModal)

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <p style={{ color: tc.textMuted }}>{t.loading}</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <p style={{ color: tc.text, fontSize: 16 }}>{t.notLoggedIn}</p>
        <Button
          onClick={() => openAuthModal()}
          style={{ background: tc.accentGradient, color: tc.accentText, border: 'none', fontWeight: 600 }}
        >
          {t.login}
        </Button>
      </div>
    )
  }

  if (!profile?.roles?.includes('teacher') && !profile?.roles?.includes('superadmin')) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12 }}>
        <p style={{ color: tc.text, fontSize: 18, fontWeight: 700 }}>{t.noAccess}</p>
        <p style={{ color: tc.textMuted, fontSize: 14 }}>{t.noAccessDesc}</p>
        <Button
          variant="outline"
          onClick={() => window.location.href = '/'}
          style={{ borderColor: tc.surfaceBorder, color: tc.textMuted }}
        >
          {t.requestRole}
        </Button>
      </div>
    )
  }

  return <>{children}</>
}

// ========================
// Root component
// ========================
export default function TeacherDashboard() {
  const theme = useGameStore(s => s.theme)
  const tc = THEMES[theme]

  // Bootstrap auth on mount
  const user = useAuthStore(s => s.user)
  const loadProfile = useAuthStore(s => s.loadProfile)
  useEffect(() => {
    if (user) loadProfile()
  }, [user, loadProfile])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: tc.bg,
        padding: '24px 20px',
      }}
    >
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <TeacherGuard>
          <Routes>
            <Route path="/" element={<ClassListView />} />
            <Route path="/class/:id" element={<ClassDetailView />} />
          </Routes>
        </TeacherGuard>
      </div>
    </div>
  )
}
