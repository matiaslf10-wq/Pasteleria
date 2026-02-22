import { redirect } from 'next/navigation';

export default function AdminEntry() {
  redirect('/admin/login?next=%2Fadmin');
}