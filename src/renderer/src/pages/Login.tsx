import React, { useState, useEffect } from 'react'
import { ChefHat } from 'lucide-react'
import { PinInput } from '../components/ui/Modal'
import { useSessionStore } from '../store'
import { Button, Input, Label, Spinner } from '../components/ui/index'
import type { Employee, Shift } from '../types'

export function LoginPage(): JSX.Element {
  const { setEmployee, setShift } = useSessionStore()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selected, setSelected] = useState<Employee | null>(null)
  const [pinError, setPinError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showFloat, setShowFloat] = useState(false)
  const [openingFloat, setOpeningFloat] = useState('0')
  const [verifiedEmployee, setVerifiedEmployee] = useState<Employee | null>(null)

  useEffect(() => {
    window.api.employees.getAll().then((emps) => setEmployees(emps as Employee[]))
  }, [])

  const handlePinComplete = async (pin: string): Promise<void> => {
    setPinError('')
    const employee = await window.api.employees.verifyPin(pin) as Employee | null
    if (!employee) {
      setPinError('Incorrect PIN. Try again.')
      return
    }
    if (selected && employee.id !== selected.id) {
      setPinError('PIN does not match selected employee.')
      return
    }
    // Check if shift is already open
    const openShift = await window.api.shifts.getOpen(employee.id) as Shift | null
    if (openShift) {
      setEmployee(employee)
      setShift(openShift)
    } else {
      setVerifiedEmployee(employee)
      setShowFloat(true)
    }
  }

  const handleOpenShift = async (): Promise<void> => {
    if (!verifiedEmployee) return
    setLoading(true)
    const float = parseFloat(openingFloat) || 0
    const shift = await window.api.shifts.open(verifiedEmployee.id, float) as Shift
    setEmployee(verifiedEmployee)
    setShift(shift)
    setLoading(false)
  }

  if (showFloat && verifiedEmployee) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border bg-card shadow-lg p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <ChefHat className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Open Shift</h2>
            <p className="text-sm text-muted-foreground">
              Welcome, <strong>{verifiedEmployee.name}</strong>! Enter the opening cash float.
            </p>
          </div>
          <div className="space-y-3">
            <Label>Opening Float ($)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={openingFloat}
              onChange={(e) => setOpeningFloat(e.target.value)}
              className="text-xl h-14 text-center"
              autoFocus
            />
          </div>
          <Button onClick={handleOpenShift} className="w-full h-12" disabled={loading}>
            {loading ? <Spinner className="h-4 w-4" /> : 'Open Shift & Start'}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => { setShowFloat(false); setVerifiedEmployee(null) }}>
            Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-primary px-6 py-8 text-center text-primary-foreground">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/20 mb-3">
            <ChefHat className="h-9 w-9" />
          </div>
          <h1 className="text-2xl font-bold">Restaurant POS</h1>
          <p className="text-sm opacity-80 mt-1">Sign in to get started</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Employee selector */}
          {employees.length > 0 && (
            <div>
              <Label className="mb-2 block">Select Employee (optional)</Label>
              <div className="grid grid-cols-2 gap-2">
                {employees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => setSelected(selected?.id === emp.id ? null : emp)}
                    className={`rounded-lg border p-3 text-left transition-colors text-sm ${
                      selected?.id === emp.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'hover:border-primary/50 hover:bg-accent'
                    }`}
                  >
                    <div className="font-medium truncate">{emp.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{emp.role}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <PinInput
            onComplete={handlePinComplete}
            error={pinError}
            onClear={() => setPinError('')}
          />
        </div>
      </div>
    </div>
  )
}
