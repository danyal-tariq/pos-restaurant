import React, { useState, useEffect, useCallback } from 'react'
import { formatDateTime } from '../../lib/utils'
import { useCurrency } from '../../hooks/useSettings'
import { Button, Input, Label, Badge, Spinner, EmptyState, Card } from '../../components/ui/index'
import { Modal, ConfirmDialog, showToast } from '../../components/ui/Modal'
import { Plus, Pencil, Trash2, UserCheck, UserX, Clock } from 'lucide-react'
import type { Employee, Shift } from '../../types'

const ROLES = ['cashier', 'manager', 'admin']

interface EmpFormProps {
  initial?: Partial<Employee>
  onSave: (data: Partial<Employee>) => void
  onClose: () => void
}
function EmployeeForm({ initial, onSave, onClose }: EmpFormProps): JSX.Element {
  const [name, setName] = useState(initial?.name ?? '')
  const [pin, setPin] = useState('')
  const [role, setRole] = useState<'admin' | 'manager' | 'cashier'>(initial?.role ?? 'cashier')
  const [hourly, setHourly] = useState(String(initial?.hourly_rate ?? ''))
  return (
    <Modal open onClose={onClose} title={initial?.id ? 'Edit Employee' : 'New Employee'} size="sm">
      <div className="p-6 space-y-4">
        <div><Label>Full Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
        <div>
          <Label>{initial?.id ? 'New PIN (leave blank to keep)' : 'PIN (4 digits) *'}</Label>
          <Input type="password" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="1234" />
        </div>
        <div>
          <Label>Role</Label>
          <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm" value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'manager' | 'cashier')}>
            {ROLES.map((r) => <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
        </div>
        <div><Label>Hourly Rate</Label><Input type="number" step="0.01" value={hourly} onChange={(e) => setHourly(e.target.value)} placeholder="0.00" /></div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => {
            if (!name) return
            if (!initial?.id && !pin) return
            onSave({ name, role, hourly_rate: hourly ? parseFloat(hourly) : 0, ...(pin ? { pin } : {}) })
          }}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function EmployeesPage(): JSX.Element {
  const fmt = useCurrency()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'employees' | 'shifts'>('employees')
  const [empForm, setEmpForm] = useState<{ open: boolean; initial?: Partial<Employee> }>({ open: false })
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null)

  const load = useCallback(async () => {
    const [emps, sh] = await Promise.all([
      window.api.employees.getAll() as Promise<Employee[]>,
      window.api.shifts.getHistory() as Promise<Shift[]>
    ])
    setEmployees(emps)
    setShifts(sh)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async (data: Partial<Employee>): Promise<void> => {
    if (empForm.initial?.id) {
      await window.api.employees.update(empForm.initial.id, data)
      showToast('Employee updated', 'success')
    } else {
      await window.api.employees.create({ ...data, active: 1 })
      showToast('Employee created', 'success')
    }
    setEmpForm({ open: false })
    load()
  }

  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return
    await window.api.employees.delete(deleteTarget.id)
    showToast('Employee deleted', 'success')
    setDeleteTarget(null)
    load()
  }

  const roleColor = (role: string): string => {
    if (role === 'admin') return 'bg-purple-100 text-purple-800 border-purple-200'
    if (role === 'manager') return 'bg-blue-100 text-blue-800 border-blue-200'
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Employees</h1>
        <Button onClick={() => setEmpForm({ open: true })}>
          <Plus className="h-4 w-4 mr-1" /> Add Employee
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(['employees', 'shifts'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize
              ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {t === 'shifts' ? 'Shift History' : 'Staff'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1"><Spinner className="h-8 w-8" /></div>
      ) : tab === 'employees' ? (
        employees.length === 0 ? (
          <EmptyState title="No employees" description="Add staff members" action={<button className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground" onClick={() => setEmpForm({ open: true })}>Add Employee</button>} />
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {employees.map((emp) => (
              <Card key={emp.id} className="p-5 flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
                  {emp.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{emp.name}</p>
                    {!emp.active && <UserX className="h-4 w-4 text-destructive" />}
                  </div>
                  <Badge className={`mt-1 text-xs ${roleColor(emp.role)}`} variant="outline">{emp.role}</Badge>
                    {(emp.hourly_rate ?? 0) > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">{fmt(emp.hourly_rate ?? 0)}/hr</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEmpForm({ open: true, initial: emp })} className="p-1.5 rounded hover:bg-accent">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteTarget(emp)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : (
        /* Shift History */
        <Card className="flex-1 overflow-auto">
          {shifts.length === 0 ? (
            <EmptyState title="No shift history" description="Shift records will appear here" />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  {['Employee', 'Opened', 'Closed', 'Opening Float', 'Cash Sales', 'Card Sales', 'Total Sales', 'Duration'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shifts.map((shift) => {
                  const emp = employees.find((e) => e.id === shift.employee_id)
                  const durationMs = shift.closed_at
                    ? new Date(shift.closed_at).getTime() - new Date(shift.opened_at).getTime()
                    : null
                  const durationH = durationMs ? (durationMs / 3600000).toFixed(1) : null
                  return (
                    <tr key={shift.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{emp?.name ?? `#${shift.employee_id}`}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDateTime(shift.opened_at)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{shift.closed_at ? formatDateTime(shift.closed_at) : <Badge variant="secondary">Open</Badge>}</td>
                      <td className="px-4 py-3">{fmt(shift.opening_float ?? 0)}</td>
                      <td className="px-4 py-3">{fmt(shift.total_cash ?? 0)}</td>
                      <td className="px-4 py-3">{fmt(shift.total_card ?? 0)}</td>
                      <td className="px-4 py-3 font-semibold">{fmt((shift.total_cash ?? 0) + (shift.total_card ?? 0))}</td>
                      <td className="px-4 py-3">{durationH ? `${durationH}h` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {empForm.open && <EmployeeForm initial={empForm.initial} onSave={handleSave} onClose={() => setEmpForm({ open: false })} />}
      {deleteTarget && (
        <ConfirmDialog
          open
          title="Delete Employee"
          message={`Remove ${deleteTarget.name}? This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
