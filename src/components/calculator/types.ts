export type FriendName = 'Judy' | 'Cheng' | 'Jeffrey' | 'Vicky' | 'Mike' | 'Will'

export const FRIENDS: FriendName[] = ['Judy', 'Cheng', 'Jeffrey', 'Vicky', 'Mike', 'Will']

export interface LineItem {
  id: string
  description: string
  cost: number
  assignedTo: FriendName[]
}

export interface Activity {
  id: string
  name: string
  emoji: string
  paidBy: FriendName
  mode: 'flat' | 'detailed'
  participants: FriendName[]
  flatCost: number
  lineItems: LineItem[]
}

// ---- Summary data types ----

export interface SummaryTerm  { activityName: string; amount: number; isNegative: boolean }
export interface DebtRow      { debtor: FriendName; terms: SummaryTerm[]; net: number }
export interface CreditSection { creditor: FriendName; rows: DebtRow[] }
