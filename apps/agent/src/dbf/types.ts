export interface DbfClosureRow {
  FEC_ID: number
  FEC_INICIO: Date
  FEC_FIN: Date | null
  TOTAL_VENTAS?: number
  TOTAL_TARJETA?: number
  TOTAL_EFECTIVO?: number
  TOTAL_INVITACIONES?: number
  // Pagos adicionales pueden venir como campos dinámicos
  [key: string]: unknown
}

export interface DbfTicketHeadRow {
  TIC_ID: string
  FEC_ID: number
  FECHA: Date
  TOTAL: number
  CLIENTE?: string
  [key: string]: unknown
}

export interface DbfTicketLineRow {
  TIC_ID: string
  LINEA: number
  ART_ID: string
  DESCRIPCION?: string
  CANTIDAD: number
  PRECIO: number
  IMPORTE?: number
  IVA?: number
  [key: string]: unknown
}

export interface DbfExpenseHeadRow {
  GAS_ID: string
  FECHA: Date
  PROVEEDOR?: string
  CONCEPTO?: string
  TOTAL: number
  PAGADO?: boolean
  [key: string]: unknown
}

export interface DbfExpenseLineRow {
  GAS_ID: string
  LINEA: number
  CONCEPTO?: string
  IMPORTE: number
  IVA?: number
  [key: string]: unknown
}

export interface DbfCustomerRow {
  CODIGO: string
  NOMBRE: string
  CIF?: string
  DIRECCION?: string
  [key: string]: unknown
}

export interface DbfSupplierRow {
  CODIGO: string
  NOMBRE: string
  CIF?: string
  DIRECCION?: string
  [key: string]: unknown
}
