import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Header, Loading, Badge } from './Dashboard'

export default function AgentRuns({ userId }: { userId: number }) {
  const [runs, setRuns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => {
    api.getAgentRuns(userId).then(setRuns).catch(console.error).finally(() => setLoading(false))
  }, [userId])

  if (loading) return <Loading />

  const statusColor = (s: string) =>
    s === 'completed' ? 'green' : s === 'failed' ? 'red' : s === 'running' ? 'blue' : 'amber'

  return (
    <div className="space-y-6">
      <Header title="Activity" subtitle={`${runs.length} agent execution logs`} />

      {runs.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center">
          <p className="text-gray-400 text-sm">No agent runs yet. Go to AI Agents and run one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <div key={run.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === run.id ? null : run.id)}
                className="w-full flex flex-col sm:flex-row sm:items-center justify-between px-4 md:px-5 py-4 hover:bg-gray-50 transition-colors text-left gap-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Badge color={statusColor(run.status)}>{run.status}</Badge>
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {run.agent_name || `Agent #${run.agent_definition_id}`}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">Run #{run.id}</span>
                </div>
                <span className="text-xs text-gray-400 shrink-0 sm:text-right">
                  {new Date(run.started_at).toLocaleString('en-GB')}
                </span>
              </button>
              {expanded === run.id && (
                <div className="border-t border-gray-100 px-4 md:px-5 py-4 space-y-3 text-sm overflow-x-auto">
                  {run.reasoning_summary && (
                    <Field label="Reasoning">
                      <pre className="text-xs text-gray-500 whitespace-pre-wrap">{run.reasoning_summary}</pre>
                    </Field>
                  )}
                  {run.result_json && (
                    <Field label="Result">
                      <JsonBlock data={run.result_json} />
                    </Field>
                  )}
                  {run.proposed_actions && (
                    <Field label="Proposed Actions">
                      <JsonBlock data={run.proposed_actions} />
                    </Field>
                  )}
                  {run.executed_actions && (
                    <Field label="Executed Actions">
                      <JsonBlock data={run.executed_actions} />
                    </Field>
                  )}
                  {run.approval_required_actions && (
                    <Field label="Awaiting Approval">
                      <JsonBlock data={run.approval_required_actions} />
                    </Field>
                  )}
                  {run.error && (
                    <Field label="Error">
                      <p className="text-rose-600 text-xs">{run.error}</p>
                    </Field>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      {children}
    </div>
  )
}

function JsonBlock({ data }: { data: string }) {
  try {
    const parsed = JSON.parse(data)
    return <pre className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(parsed, null, 2)}</pre>
  } catch {
    return <pre className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{data}</pre>
  }
}
