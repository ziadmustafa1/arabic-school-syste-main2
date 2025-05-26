import { redirect } from "next/navigation"
 
export default function ParentStudentDeductionCardsPage() {
  // This page will redirect to the parent's children page
  // when accessed directly without a specific student selected
  redirect("/parent/children")
} 