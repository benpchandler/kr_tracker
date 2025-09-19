import React from 'react'
import { Team, WizardUIState } from '../../models/types'
import { OrganizationTemplateDefinition } from '../../lib/templates/organizationTemplates'

export type OrganizationStepProps = {
  organization: WizardUIState['organization']
  organizationName: string
  period: { startISO: string; endISO: string }
  templates: OrganizationTemplateDefinition[]
  selectedTemplateId?: string
  pendingTemplateId?: string
  onOrganizationNameChange: (value: string) => void
  onPeriodChange: (patch: { startISO?: string; endISO?: string }) => void
  onTemplateSelect: (templateId: string) => void
  seededTemplateId?: string
  seededTeamCount: number
  existingTeams: Team[]
  onCreateTeam?: (name: string) => { ok: boolean; error?: string }
}

export function OrganizationStep({
  organization,
  organizationName,
  period,
  templates,
  selectedTemplateId,
  pendingTemplateId,
  onOrganizationNameChange,
  onPeriodChange,
  onTemplateSelect,
  seededTemplateId,
  seededTeamCount,
  existingTeams,
  onCreateTeam,
}: OrganizationStepProps) {
  const [newTeamName, setNewTeamName] = React.useState('')
  const [teamFeedback, setTeamFeedback] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleTeamSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!onCreateTeam) return
    const trimmed = newTeamName.trim()
    if (!trimmed) {
      setTeamFeedback({ type: 'error', message: 'Enter a team name to add it.' })
      return
    }
    const result = onCreateTeam(trimmed)
    if (!result.ok) {
      setTeamFeedback({ type: 'error', message: result.error ?? 'Unable to create team.' })
      return
    }
    setNewTeamName('')
    setTeamFeedback({ type: 'success', message: 'Team added. You can assign it on the next steps.' })
  }

  const recentTeams = existingTeams.slice(-6)

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <section style={{ display: 'grid', gap: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 20 }}>Organization basics</h3>
          <p style={{ marginTop: 8, color: 'var(--text-secondary, #475569)', maxWidth: 560 }}>
            Give your workspace a clear name and set the reporting period that all forecasts and planners
            will reference. You can adjust these later from Settings.
          </p>
        </div>
        <div
          style={{
            display: 'grid',
            gap: 16,
            background: 'var(--panel, #fff)',
            padding: 24,
            borderRadius: 12,
            border: '1px solid var(--border, rgba(148, 163, 184, 0.45))',
          }}
        >
          <label style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Organization name</span>
            <input
              value={organizationName}
              onChange={(event) => onOrganizationNameChange(event.target.value)}
              placeholder="e.g. Merchant Success"
              style={{
                borderRadius: 8,
                border: '1px solid var(--border, rgba(148, 163, 184, 0.45))',
                padding: '10px 12px',
                fontSize: 14,
              }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-secondary, #475569)' }}>
              Used across dashboards, exports, and templates.
            </span>
          </label>

          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Period start</span>
              <input
                type="date"
                value={period.startISO || ''}
                onChange={(event) => onPeriodChange({ startISO: event.target.value })}
                style={{
                  borderRadius: 8,
                  border: '1px solid var(--border, rgba(148, 163, 184, 0.45))',
                  padding: '10px 12px',
                  fontSize: 14,
                }}
              />
            </label>
            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Period end</span>
              <input
                type="date"
                value={period.endISO || ''}
                onChange={(event) => onPeriodChange({ endISO: event.target.value })}
                style={{
                  borderRadius: 8,
                  border: '1px solid var(--border, rgba(148, 163, 184, 0.45))',
                  padding: '10px 12px',
                  fontSize: 14,
                }}
              />
            </label>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 20 }}>Starter templates</h3>
          <p style={{ marginTop: 8, color: 'var(--text-secondary, #475569)', maxWidth: 640 }}>
            Choose a template to instantly seed example teams, objectives, and key results. Reapplying a
            template replaces any previously seeded entities.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          }}
        >
          {templates.map(template => {
            const isSelected = selectedTemplateId === template.id
            const isPending = pendingTemplateId === template.id
            const cardBorder = isSelected
              ? '2px solid var(--accent, #2563eb)'
              : isPending
                ? '2px dashed var(--accent, #2563eb)'
                : '1px solid var(--border, rgba(148, 163, 184, 0.45))'
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => onTemplateSelect(template.id)}
                style={{
                  textAlign: 'left',
                  border: cardBorder,
                  borderRadius: 12,
                  padding: 20,
                  display: 'grid',
                  gap: 12,
                  background: 'var(--panel, #fff)',
                  cursor: 'pointer',
                  boxShadow: isSelected ? 'var(--shadow-sm, 0 10px 18px rgba(15, 23, 42, 0.12))' : 'none',
                  transition: 'box-shadow 0.15s ease, border 0.15s ease',
                }}
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'var(--accent-50, rgba(37, 99, 235, 0.16))',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--accent, #2563eb)',
                  }}
                >
                  {template.icon.slice(0, 2)}
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{template.title}</div>
                  <p style={{ marginTop: 6, fontSize: 13, color: 'var(--text-secondary, #475569)' }}>
                    {template.description}
                  </p>
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-secondary, #475569)', fontSize: 13, display: 'grid', gap: 4 }}>
                  {template.summary.map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                {isPending && (
                  <span style={{ fontSize: 12, color: 'var(--accent, #2563eb)' }}>Awaiting confirmation…</span>
                )}
                {isSelected && !isPending && (
                  <span style={{ fontSize: 12, color: 'var(--success, #16a34a)' }}>Applied to workspace</span>
                )}
              </button>
            )
          })}
        </div>

        <div style={{ fontSize: 13, color: 'var(--text-secondary, #475569)', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span>Seeded template:</span>
          <strong>{seededTemplateId ? templates.find(t => t.id === seededTemplateId)?.title ?? 'Custom' : 'None applied yet'}</strong>
          {seededTeamCount > 0 && (
            <span style={{
              padding: '4px 8px',
              borderRadius: 999,
              background: 'var(--accent-50, rgba(37,99,235,0.12))',
              color: 'var(--accent, #2563eb)',
              fontSize: 12,
              fontWeight: 600,
            }}>
              {seededTeamCount} seeded teams
            </span>
          )}
        </div>
      </section>

      <section style={{ display: 'grid', gap: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 20 }}>Quick add teams</h3>
          <p style={{ marginTop: 8, color: 'var(--text-secondary, #475569)', maxWidth: 560 }}>
            Add any additional teams or pods that should own objectives and key results. You can edit details later
            from the Setup area.
          </p>
        </div>
        <form
          onSubmit={handleTeamSubmit}
          style={{
            display: 'grid',
            gap: 12,
            background: 'var(--panel, #fff)',
            padding: 20,
            borderRadius: 12,
            border: '1px solid var(--border, rgba(148, 163, 184, 0.45))',
          }}
        >
          <label style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Team or pod name</span>
            <input
              value={newTeamName}
              onChange={(event) => setNewTeamName(event.target.value)}
              placeholder="e.g. Reliability Engineering"
              style={{
                borderRadius: 8,
                border: '1px solid var(--border, rgba(148, 163, 184, 0.45))',
                padding: '10px 12px',
                fontSize: 14,
              }}
            />
          </label>
          {teamFeedback && (
            <div
              role="status"
              style={{
                fontSize: 12,
                color: teamFeedback.type === 'error' ? 'var(--danger, #dc2626)' : 'var(--success, #16a34a)',
              }}
            >
              {teamFeedback.message}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              style={{
                padding: '10px 18px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--accent, #2563eb)',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Add team
            </button>
          </div>
        </form>
        {recentTeams.length > 0 && (
          <div style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary, #475569)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Recent teams
            </span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {recentTeams.map(team => (
                <span
                  key={team.id}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 999,
                    background: 'var(--panel-2, rgba(148, 163, 184, 0.12))',
                    fontSize: 12,
                    color: 'var(--text-secondary, #475569)',
                  }}
                >
                  {team.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
