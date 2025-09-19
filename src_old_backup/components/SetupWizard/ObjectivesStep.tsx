import React from 'react'
import { WizardObjectiveDraft, ID, Objective, Team } from '../../models/types'

export type ObjectiveSuggestion = {
  id: string
  name: string
  teamId?: ID
  label?: string
}

export type ObjectivesStepProps = {
  draft: WizardObjectiveDraft
  onDraftChange: (patch: Partial<WizardObjectiveDraft>) => void
  onSubmit: () => void
  suggestions: ObjectiveSuggestion[]
  teams: Team[]
  objectives: Objective[]
  seededObjectiveIds: ID[]
}

export function ObjectivesStep({
  draft,
  onDraftChange,
  onSubmit,
  suggestions,
  teams,
  objectives,
  seededObjectiveIds,
}: ObjectivesStepProps) {
  const [showSuggestions, setShowSuggestions] = React.useState(true)

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <section style={{ display: 'grid', gap: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 20 }}>Draft objectives</h3>
          <p style={{ marginTop: 8, color: 'var(--text-secondary, #475569)', maxWidth: 620 }}>
            Objectives capture the narrative behind your key results. Assign them to teams so everyone knows
            where to contribute.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gap: 16,
            background: 'var(--panel, #fff)',
            padding: 24,
            borderRadius: 12,
            border: '1px solid var(--border, rgba(148, 163, 184, 0.35))',
          }}
        >
          <label style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Objective title</span>
            <input
              value={draft.name}
              onChange={(event) => onDraftChange({ name: event.target.value })}
              placeholder="Improve onboarding activation"
              style={{
                borderRadius: 8,
                border: '1px solid var(--border, rgba(148, 163, 184, 0.45))',
                padding: '10px 12px',
                fontSize: 14,
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Owning team (optional)</span>
            <select
              value={draft.teamId || ''}
              onChange={(event) => onDraftChange({ teamId: event.target.value || undefined })}
              style={{
                borderRadius: 8,
                border: '1px solid var(--border, rgba(148, 163, 184, 0.45))',
                padding: '10px 12px',
                fontSize: 14,
                background: 'var(--panel, #fff)',
              }}
            >
              <option value="">Unassigned</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
            <span style={{ fontSize: 12, color: 'var(--text-secondary, #475569)' }}>
              Assign a primary team to include the objective in their views.
            </span>
          </label>

          {showSuggestions && suggestions.length > 0 && (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--text-secondary, #475569)' }}>
                Suggested objectives
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {suggestions.map(suggestion => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => {
                      onDraftChange({ name: suggestion.name, teamId: suggestion.teamId })
                      setShowSuggestions(false)
                    }}
                    style={{
                      borderRadius: 999,
                      border: '1px solid var(--accent, #2563eb)',
                      background: 'var(--accent-50, rgba(37,99,235,0.12))',
                      color: 'var(--accent, #2563eb)',
                      padding: '6px 12px',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    {suggestion.label || suggestion.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!draft.name.trim()}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--accent, #2563eb)',
                color: '#fff',
                cursor: draft.name.trim() ? 'pointer' : 'not-allowed',
                fontWeight: 600,
              }}
            >
              Add objective
            </button>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 12 }}>
        <h4 style={{ margin: 0, fontSize: 16 }}>Current objectives</h4>
        <div style={{ display: 'grid', gap: 8 }}>
          {objectives.map(obj => {
            const teamNames = (obj.teamIds || []).map(teamId => teams.find(team => team.id === teamId)?.name || teamId)
            const isSeeded = seededObjectiveIds.includes(obj.id)
            return (
              <div
                key={obj.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: '1px solid var(--border, rgba(148, 163, 184, 0.45))',
                  background: isSeeded ? 'var(--accent-50, rgba(37,99,235,0.10))' : 'var(--panel, #fff)',
                }}
              >
                <div style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>{obj.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary, #475569)' }}>
                    {teamNames.length ? teamNames.join(', ') : 'No team assigned'}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary, #94a3b8)' }}>{obj.id}</span>
              </div>
            )
          })}
          {objectives.length === 0 && (
            <div
              style={{
                padding: '16px',
                borderRadius: 10,
                border: '1px dashed var(--border, rgba(148, 163, 184, 0.45))',
                color: 'var(--text-secondary, #475569)',
                fontSize: 14,
              }}
            >
              No objectives yet. Add at least one to keep your teams aligned.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
