import styles from './admin.module.css'
import AdminSessionProvider from './AdminSessionProvider'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminSessionProvider>
      <div className={styles.layout}>
        {children}
      </div>
    </AdminSessionProvider>
  )
}
