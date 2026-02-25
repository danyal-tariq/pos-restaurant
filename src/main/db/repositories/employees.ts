import { getDatabase } from '../database'

export interface Employee {
  id: number
  name: string
  pin: string
  role: 'admin' | 'manager' | 'cashier'
  active: number
  created_at: string
  updated_at: string
}

export interface Shift {
  id: number
  employee_id: number
  opened_at: string
  closed_at: string | null
  opening_float: number
  closing_cash: number | null
  total_sales: number | null
  total_orders: number | null
  notes: string | null
  employee_name?: string
}

export function getAllEmployees(includeInactive = false): Employee[] {
  const db = getDatabase()
  const sql = `SELECT * FROM employees ${includeInactive ? '' : 'WHERE active = 1'} ORDER BY name`
  return db.prepare(sql).all() as Employee[]
}

export function getEmployeeById(id: number): Employee | undefined {
  const db = getDatabase()
  return db.prepare('SELECT * FROM employees WHERE id = ?').get(id) as Employee | undefined
}

export function getEmployeeByPin(pin: string): Employee | undefined {
  const db = getDatabase()
  return db.prepare('SELECT * FROM employees WHERE pin = ? AND active = 1').get(pin) as
    | Employee
    | undefined
}

export function createEmployee(data: Omit<Employee, 'id' | 'created_at' | 'updated_at'>): Employee {
  const db = getDatabase()
  const result = db
    .prepare(`INSERT INTO employees (name, pin, role, active) VALUES (@name, @pin, @role, @active)`)
    .run(data)
  return getEmployeeById(result.lastInsertRowid as number)!
}

export function updateEmployee(
  id: number,
  data: Partial<Omit<Employee, 'id' | 'created_at' | 'updated_at'>>
): Employee {
  const db = getDatabase()
  const existing = getEmployeeById(id)!
  const updated = { ...existing, ...data }
  db.prepare(
    `UPDATE employees SET name=@name, pin=@pin, role=@role, active=@active, updated_at=datetime('now') WHERE id=@id`
  ).run({ ...updated, id })
  return getEmployeeById(id)!
}

export function deleteEmployee(id: number): void {
  const db = getDatabase()
  db.prepare('UPDATE employees SET active = 0 WHERE id = ?').run(id)
}

export function openShift(employeeId: number, openingFloat: number): Shift {
  const db = getDatabase()
  // Close any existing open shift for this employee
  db.prepare(
    `UPDATE shifts SET closed_at = datetime('now') WHERE employee_id = ? AND closed_at IS NULL`
  ).run(employeeId)

  const result = db
    .prepare('INSERT INTO shifts (employee_id, opening_float) VALUES (?, ?)')
    .run(employeeId, openingFloat)
  return getShiftById(result.lastInsertRowid as number)!
}

export function closeShift(shiftId: number, closingCash: number, notes?: string): Shift {
  const db = getDatabase()
  // Calculate totals
  const totals = db
    .prepare(
      `SELECT COUNT(*) as cnt, SUM(total) as total FROM orders
       WHERE shift_id = ? AND status != 'voided'`
    )
    .get(shiftId) as { cnt: number; total: number }

  db.prepare(
    `UPDATE shifts SET closed_at = datetime('now'), closing_cash = ?, total_sales = ?, total_orders = ?, notes = ?
     WHERE id = ?`
  ).run(closingCash, totals.total ?? 0, totals.cnt ?? 0, notes ?? null, shiftId)
  return getShiftById(shiftId)!
}

export function getOpenShift(employeeId: number): Shift | undefined {
  const db = getDatabase()
  return db
    .prepare(
      `SELECT s.*, e.name as employee_name FROM shifts s
       JOIN employees e ON e.id = s.employee_id
       WHERE s.employee_id = ? AND s.closed_at IS NULL LIMIT 1`
    )
    .get(employeeId) as Shift | undefined
}

export function getShiftById(id: number): Shift | undefined {
  const db = getDatabase()
  return db
    .prepare(
      `SELECT s.*, e.name as employee_name FROM shifts s
       JOIN employees e ON e.id = s.employee_id WHERE s.id = ?`
    )
    .get(id) as Shift | undefined
}

export function getShiftsHistory(limit = 50): Shift[] {
  const db = getDatabase()
  return db
    .prepare(
      `SELECT s.*, e.name as employee_name FROM shifts s
       JOIN employees e ON e.id = s.employee_id
       WHERE s.closed_at IS NOT NULL ORDER BY s.closed_at DESC LIMIT ?`
    )
    .all(limit) as Shift[]
}
